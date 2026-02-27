import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserRoles, userHasRole, ROLE_EXEC_POLES } from "@/components/shared/roleAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Home, Users, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  active:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  en_pause: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  fermee:   "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
};

const STATUS_LABELS = { active: "Active", en_pause: "En pause", fermee: "Fermée" };

const EMPTY_FI = { name: "", campus: "", pilote_email: "", pilote_nom: "", co_pilote_email: "", co_pilote_nom: "", status: "active", objectif_membres: 12, date_ouverture: "" };

export default function FIManagerPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editFI, setEditFI] = useState(null);
  const [deleteFI, setDeleteFI] = useState(null);
  const [form, setForm] = useState(EMPTY_FI);
  // Pilote: dialog to change status only
  const [statusFI, setStatusFI] = useState(null);
  const [newStatus, setNewStatus] = useState("");

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres-all"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });

  // Real-time subscriptions
  React.useEffect(() => {
    const unsubFI = base44.entities.FamilleImpact.subscribe(() => queryClient.invalidateQueries({ queryKey: ["familles"] }));
    const unsubM = base44.entities.Membre.subscribe(() => queryClient.invalidateQueries({ queryKey: ["membres-all"] }));
    return () => { unsubFI(); unsubM(); };
  }, [queryClient]);

  const userRoles = getUserRoles(user);
  // admin/responsable_fi: accès complet + suppression + création
  const canWriteAll = userHasRole(user, ["admin", "responsable_fi"]);
  // Tout le monde peut modifier les FI (nommer pilotes/copilotes, changer statut, etc.)
  const canWrite = true;

  // Tous les membres du pôle FI voient toutes les FI
  const mesFamilles = familles;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FamilleImpact.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["familles"] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FamilleImpact.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["familles"] }); closeForm(); setStatusFI(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FamilleImpact.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["familles"] }); setDeleteFI(null); },
  });

  const openCreate = () => { setForm(EMPTY_FI); setEditFI(null); setShowForm(true); };
  const openEdit = (fi) => { setForm({ ...fi }); setEditFI(fi); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditFI(null); };

  const openStatusEdit = (fi) => { setStatusFI(fi); setNewStatus(fi.status); };

  const handleSubmit = () => {
    if (!form.name || !form.pilote_email) return;
    if (editFI) {
      updateMutation.mutate({ id: editFI.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleStatusSubmit = () => {
    if (!statusFI || !newStatus) return;
    updateMutation.mutate({ id: statusFI.id, data: { status: newStatus } });
  };

  const handlePiloteSelect = (email) => {
    const u = users.find(u => u.email === email);
    setForm(f => ({ ...f, pilote_email: email, pilote_nom: u?.full_name || "" }));
  };

  const handleCoPiloteSelect = (email) => {
    const u = users.find(u => u.email === email);
    setForm(f => ({ ...f, co_pilote_email: email, co_pilote_nom: u?.full_name || "" }));
  };

  // Seuls les utilisateurs avec is_eligible_pilote peuvent être assignés comme Pilote/Co-Pilote
  const allSelectableUsers = users.filter(u => !!u.email && (u.is_eligible_pilote || userHasRole(u, ["admin", "responsable_fi"])));

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-[0.25em] mb-1">Familles d'Impact</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Gestion des Familles</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {canWrite ? "Création · Attribution des pilotes · Suivi des capacités" : "Statut de votre Famille d'Impact"}
          </p>
        </div>
        {canWriteAll && (
          <Button onClick={openCreate} className="bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-500/30 text-white gap-2">
            <Plus className="w-4 h-4" /> Créer une FI
          </Button>
        )}
      </motion.div>

      {/* FI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mesFamilles.map((fi, i) => {
          const nbMembres = membres.filter(m => m.famille_impact_id === fi.id).length;
          const taux = Math.round((nbMembres / (fi.objectif_membres || 12)) * 100);
          return (
            <motion.div key={fi.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div
                className="rounded-2xl border border-white/[0.07] p-5 space-y-4 hover:border-white/[0.14] transition-all"
                style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px) saturate(1.4)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <Home className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{fi.name}</h3>
                      <p className="text-xs text-zinc-500">{fi.campus}</p>
                    </div>
                  </div>
                  <Badge className={cn("text-[10px] border", STATUS_COLORS[fi.status])}>{STATUS_LABELS[fi.status] || fi.status}</Badge>
                </div>

                <div className="space-y-1 text-xs text-zinc-500">
                  {fi.pilote_nom && <p>👤 Pilote : <span className="text-zinc-300">{fi.pilote_nom}</span></p>}
                  {fi.co_pilote_nom && <p>👤 Co-Pilote : <span className="text-zinc-300">{fi.co_pilote_nom}</span></p>}
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5 text-zinc-500"><Users className="w-3 h-3" />{nbMembres}/{fi.objectif_membres || 12} membres</div>
                    <span className={cn("font-bold", taux >= 80 ? "text-emerald-400" : taux >= 50 ? "text-amber-400" : "text-red-400")}>{taux}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", taux >= 80 ? "bg-emerald-500/60" : taux >= 50 ? "bg-amber-500/60" : "bg-red-500/60")}
                      style={{ width: `${Math.min(taux, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Actions par rôle */}
                {canWrite && (
                  <div className="flex gap-2 pt-1 border-t border-white/5">
                    <Button size="sm" variant="ghost" className="flex-1 text-zinc-400 hover:text-white hover:bg-white/10 h-8" onClick={() => openEdit(fi)}>
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />Modifier
                    </Button>
                    {canWriteAll && (
                      <Button size="sm" variant="ghost" className="text-red-500/60 hover:text-red-400 hover:bg-red-500/10 h-8" onClick={() => setDeleteFI(fi)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {mesFamilles.length === 0 && (
          <div className="col-span-3 py-20 text-center">
            <Home className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Aucune Famille d'Impact{canWrite ? " — créez-en une !" : " assignée"}</p>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog (admin/responsable_fi only) */}
      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className="bg-[#0f1117] border border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{editFI ? "Modifier la FI" : "Créer une Famille d'Impact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <p className="text-xs text-zinc-400 mb-1.5">Nom de la FI *</p>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Famille d'Impact Lumière" className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-1.5">Campus</p>
              <Input value={form.campus} onChange={e => setForm(f => ({ ...f, campus: e.target.value }))} placeholder="Paris, Lyon..." className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-1.5">Pilote *</p>
              <Select value={form.pilote_email} onValueChange={handlePiloteSelect}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Sélectionner un pilote" />
              </SelectTrigger>
              <SelectContent>
                {allSelectableUsers.map(u => <SelectItem key={u.id} value={u.email}>{u.full_name || u.email} ({getUserRoles(u).join(", ")})</SelectItem>)}
              </SelectContent>
              </Select>
              </div>
              <div>
              <p className="text-xs text-zinc-400 mb-1.5">Co-Pilote</p>
              <Select value={form.co_pilote_email || ""} onValueChange={handleCoPiloteSelect}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Sélectionner un co-pilote (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                {allSelectableUsers.map(u => <SelectItem key={u.id} value={u.email}>{u.full_name || u.email} ({getUserRoles(u).join(", ")})</SelectItem>)}
              </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-zinc-400 mb-1.5">Statut</p>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="en_pause">En pause</SelectItem>
                    <SelectItem value="fermee">Fermée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1.5">Objectif membres</p>
                <Input type="number" value={form.objectif_membres} onChange={e => setForm(f => ({ ...f, objectif_membres: parseInt(e.target.value) || 12 }))} className="bg-white/5 border-white/10 text-white" />
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-1.5">Date d'ouverture</p>
              <Input type="date" value={form.date_ouverture} onChange={e => setForm(f => ({ ...f, date_ouverture: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeForm} className="text-zinc-400 hover:text-white">Annuler</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              {editFI ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pilote: status-only edit dialog */}
      <Dialog open={!!statusFI} onOpenChange={() => setStatusFI(null)}>
        <DialogContent className="bg-[#0f1117] border border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Statut — {statusFI?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-xs text-zinc-400 mb-2">Modifier le statut de votre Famille d'Impact</p>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="en_pause">En pause</SelectItem>
                <SelectItem value="fermee">Fermée</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStatusFI(null)} className="text-zinc-400 hover:text-white">Annuler</Button>
            <Button onClick={handleStatusSubmit} disabled={updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteFI} onOpenChange={() => setDeleteFI(null)}>
        <AlertDialogContent className="bg-[#0f1117] border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la Famille d'Impact ?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Vous êtes sur le point de supprimer <strong className="text-white">{deleteFI?.name}</strong>. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteFI.id)}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}