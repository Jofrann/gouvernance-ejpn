import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from "recharts";
import { Heart, Users, TrendingUp, TrendingDown, Home, Plus, Pencil, Trash2, Lock, BarChart3, Settings } from "lucide-react";
import { format, setDay, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";
import { motion } from "framer-motion";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

function getThisThursday() {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  return format(setDay(start, 4, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

const PIPELINE_COLORS = {
  passif: "bg-zinc-500/60", regulier: "bg-blue-500/60",
  disciple: "bg-violet-500/60", reproducteur: "bg-amber-500/60",
};

const STATUS_COLORS = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  en_pause: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  fermee: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
};
const STATUS_LABELS = { active: "Active", en_pause: "En pause", fermee: "Fermée" };
const EMPTY_FI = { name: "", campus: "", pilote_email: "", pilote_nom: "", co_pilote_email: "", co_pilote_nom: "", status: "active", objectif_membres: 12, date_ouverture: "" };

const GlassCard = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
    {children}
  </div>
);

/* ── TAB: Dashboard ── */
function TabDashboard({ user }) {
  const queryClient = useQueryClient();
  const [selectedFI, setSelectedFI] = useState(null);
  const thisThursday = getThisThursday();

  useEffect(() => {
    const unsubFamilles = base44.entities.FamilleImpact.subscribe(() => queryClient.invalidateQueries({ queryKey: ["familles-hub"] }));
    const unsubMembres = base44.entities.Membre.subscribe(() => queryClient.invalidateQueries({ queryKey: ["membres-hub", selectedFI] }));
    const unsubSaisies = base44.entities.CliniqueSaisie.subscribe(() => queryClient.invalidateQueries({ queryKey: ["saisies-hub", selectedFI] }));
    return () => { unsubFamilles(); unsubMembres(); unsubSaisies(); };
  }, [queryClient, selectedFI]);

  const { data: familles = [] } = useQuery({
    queryKey: ["familles-hub"],
    queryFn: () => base44.entities.FamilleImpact.list(),
    onSuccess: (data) => { if (data.length > 0 && !selectedFI) setSelectedFI(data[0].id); }
  });
  const { data: membres = [] } = useQuery({
    queryKey: ["membres-hub", selectedFI],
    queryFn: () => selectedFI ? base44.entities.Membre.filter({ famille_impact_id: selectedFI }) : Promise.resolve([]),
    enabled: !!selectedFI,
  });
  const { data: saisies = [] } = useQuery({
    queryKey: ["saisies-hub", selectedFI],
    queryFn: () => selectedFI ? base44.entities.CliniqueSaisie.filter({ famille_impact_id: selectedFI }) : Promise.resolve([]),
    enabled: !!selectedFI,
  });

  const fi = familles.find(f => f.id === selectedFI);
  const lastWeekSaisies = saisies.filter(s => s.semaine === thisThursday);
  const avgSante = useMemo(() => {
    const vals = lastWeekSaisies.flatMap(s => [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter(n => n != null));
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  }, [lastWeekSaisies]);

  const radarData = [
    { axe: "Temps", value: lastWeekSaisies.reduce((a, s) => a + (s.note_temps || 0), 0) / Math.max(lastWeekSaisies.length, 1) },
    { axe: "Finances", value: lastWeekSaisies.reduce((a, s) => a + (s.note_finances || 0), 0) / Math.max(lastWeekSaisies.length, 1) },
    { axe: "Émotions", value: lastWeekSaisies.reduce((a, s) => a + (s.note_emotions || 0), 0) / Math.max(lastWeekSaisies.length, 1) },
    { axe: "Spirituel", value: lastWeekSaisies.reduce((a, s) => a + (s.note_spirituel || 0), 0) / Math.max(lastWeekSaisies.length, 1) },
  ];

  const presenceRate = lastWeekSaisies.length > 0
    ? Math.round((lastWeekSaisies.filter(s => s.presence).length / Math.max(membres.length, 1)) * 100) : null;
  const alertes = membres.filter(m => detectChuteLivre(m.id, saisies)).length;
  const pipelineCounts = { passif: 0, regulier: 0, disciple: 0, reproducteur: 0 };
  membres.forEach(m => { if (pipelineCounts[m.statut_pipeline] !== undefined) pipelineCounts[m.statut_pipeline]++; });

  return (
    <div className="space-y-5">
      {/* FI Selector */}
      <Select value={selectedFI || ""} onValueChange={setSelectedFI}>
        <SelectTrigger className="w-60 bg-white/5 border-white/10 text-white">
          <SelectValue placeholder="Choisir une FI" />
        </SelectTrigger>
        <SelectContent>
          {familles.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {fi && (
        <div className="relative rounded-2xl border border-blue-500/15 px-5 py-4 overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.05) 100%)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Famille d'Impact</p>
              <h2 className="text-xl font-bold text-white">{fi.name}</h2>
              <p className="text-xs text-zinc-400 mt-0.5">{fi.campus} · {fi.pilote_email}</p>
            </div>
            <Badge className={cn("text-xs border", fi.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30")}>
              {fi.status}
            </Badge>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Membres", value: membres.length, icon: Users, color: "text-blue-400" },
          { label: "Présence", value: presenceRate != null ? `${presenceRate}%` : "—", icon: Heart, color: presenceRate != null && presenceRate >= 70 ? "text-emerald-400" : "text-amber-400" },
          { label: "Santé Moy.", value: avgSante ? `${avgSante}/10` : "—", icon: TrendingUp, color: avgSante && parseFloat(avgSante) >= 7 ? "text-emerald-400" : "text-amber-400" },
          { label: "Alertes", value: alertes, icon: TrendingDown, color: alertes > 0 ? "text-red-400" : "text-emerald-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <GlassCard key={label}>
            <div className="flex items-center gap-3">
              <Icon className={cn("w-5 h-5", color)} />
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
                <p className={cn("text-2xl font-black", color)}>{value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Radar Santé</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="axe" tick={{ fontSize: 11, fill: "#71717a" }} />
                <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Pipeline</p>
          <div className="space-y-4 pt-1">
            {Object.entries(pipelineCounts).map(([statut, count]) => (
              <div key={statut}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium text-zinc-300 capitalize">{statut}</span>
                  <span className="font-black text-white">{count}</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-700", PIPELINE_COLORS[statut])}
                    style={{ width: membres.length > 0 ? `${(count / membres.length) * 100}%` : "0%" }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Membres ({membres.length})</p>
        {membres.length === 0 ? (
          <p className="text-sm text-zinc-600 py-8 text-center">Aucun membre dans cette FI</p>
        ) : (
          <div className="space-y-1">
            {membres.map(m => {
              const lastSaisie = saisies.filter(s => s.membre_id === m.id).sort((a, b) => new Date(b.semaine) - new Date(a.semaine))[0];
              const notes = lastSaisie ? [lastSaisie.note_temps, lastSaisie.note_finances, lastSaisie.note_emotions, lastSaisie.note_spirituel].filter(n => n != null) : [];
              const avg = notes.length > 0 ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : null;
              const alerte = detectChuteLivre(m.id, saisies);
              return (
                <div key={m.id} className={cn("flex items-center justify-between p-3 rounded-xl border", alerte ? "bg-red-500/5 border-red-500/20" : "border-white/[0.04] hover:bg-white/[0.02]")}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                      {m.nom_complet?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{m.nom_complet}</p>
                      {alerte && <p className="text-[10px] text-red-400">⚠ Alerte Chute Libre</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">{m.statut_pipeline}</span>
                    {avg && <span className={cn("text-sm font-black", parseFloat(avg) >= 7 ? "text-emerald-400" : parseFloat(avg) >= 5 ? "text-amber-400" : "text-red-400")}>{avg}/10</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

/* ── TAB: Gestion FI ── */
function TabGestion({ user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editFI, setEditFI] = useState(null);
  const [deleteFI, setDeleteFI] = useState(null);
  const [form, setForm] = useState(EMPTY_FI);
  const [statusFI, setStatusFI] = useState(null);
  const [newStatus, setNewStatus] = useState("");

  const { data: familles = [] } = useQuery({ queryKey: ["familles-hub"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres-all-hub"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: users = [] } = useQuery({ queryKey: ["users-hub"], queryFn: () => base44.entities.User.list() });

  useEffect(() => {
    const unsubFI = base44.entities.FamilleImpact.subscribe(() => queryClient.invalidateQueries({ queryKey: ["familles-hub"] }));
    const unsubM = base44.entities.Membre.subscribe(() => queryClient.invalidateQueries({ queryKey: ["membres-all-hub"] }));
    return () => { unsubFI(); unsubM(); };
  }, [queryClient]);

  const role = user?.role;
  const canWrite = role === "admin" || role === "responsable_fi";
  const isPilote = role === "pilote_fi" || role === "copilote_fi";
  const mesFamilles = canWrite ? familles : familles.filter(f => f.pilote_email === user?.email || f.co_pilote_email === user?.email);
  const piloteUsers = users.filter(u => ["pilote_fi", "copilote_fi", "responsable_fi"].includes(u.role));

  const createMutation = useMutation({ mutationFn: (data) => base44.entities.FamilleImpact.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["familles-hub"] }); closeForm(); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.FamilleImpact.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["familles-hub"] }); closeForm(); setStatusFI(null); } });
  const deleteMutation = useMutation({ mutationFn: (id) => base44.entities.FamilleImpact.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["familles-hub"] }); setDeleteFI(null); } });

  const openCreate = () => { setForm(EMPTY_FI); setEditFI(null); setShowForm(true); };
  const openEdit = (fi) => { setForm({ ...fi }); setEditFI(fi); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditFI(null); };

  const handleSubmit = () => {
    if (!form.name || !form.pilote_email) return;
    if (editFI) updateMutation.mutate({ id: editFI.id, data: form });
    else createMutation.mutate(form);
  };

  const handlePiloteSelect = (email) => {
    const u = users.find(u => u.email === email);
    setForm(f => ({ ...f, pilote_email: email, pilote_nom: u?.full_name || "" }));
  };
  const handleCoPiloteSelect = (email) => {
    const u = users.find(u => u.email === email);
    setForm(f => ({ ...f, co_pilote_email: email, co_pilote_nom: u?.full_name || "" }));
  };

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={openCreate} className="bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-500/30 text-white gap-2">
            <Plus className="w-4 h-4" /> Créer une FI
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mesFamilles.map((fi, i) => {
          const nbMembres = membres.filter(m => m.famille_impact_id === fi.id).length;
          const taux = Math.round((nbMembres / (fi.objectif_membres || 12)) * 100);
          return (
            <motion.div key={fi.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <GlassCard>
                <div className="flex items-start justify-between gap-2 mb-4">
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
                <div className="space-y-1 text-xs text-zinc-500 mb-4">
                  {fi.pilote_nom && <p>👤 Pilote : <span className="text-zinc-300">{fi.pilote_nom}</span></p>}
                  {fi.co_pilote_nom && <p>👤 Co-Pilote : <span className="text-zinc-300">{fi.co_pilote_nom}</span></p>}
                </div>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5 text-zinc-500"><Users className="w-3 h-3" />{nbMembres}/{fi.objectif_membres || 12}</div>
                    <span className={cn("font-bold", taux >= 80 ? "text-emerald-400" : taux >= 50 ? "text-amber-400" : "text-red-400")}>{taux}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", taux >= 80 ? "bg-emerald-500/60" : taux >= 50 ? "bg-amber-500/60" : "bg-red-500/60")} style={{ width: `${Math.min(taux, 100)}%` }} />
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  {canWrite && (
                    <>
                      <Button size="sm" variant="ghost" className="flex-1 text-zinc-400 hover:text-white hover:bg-white/10 h-8" onClick={() => openEdit(fi)}>
                        <Pencil className="w-3.5 h-3.5 mr-1.5" />Modifier
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500/60 hover:text-red-400 hover:bg-red-500/10 h-8" onClick={() => setDeleteFI(fi)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                  {isPilote && (
                    <Button size="sm" variant="ghost" className="flex-1 text-zinc-400 hover:text-white hover:bg-white/10 h-8" onClick={() => { setStatusFI(fi); setNewStatus(fi.status); }}>
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />Statut
                    </Button>
                  )}
                  {!canWrite && !isPilote && (
                    <div className="flex-1 flex items-center gap-1.5 justify-center text-xs text-zinc-600">
                      <Lock className="w-3 h-3" /> Lecture seule
                    </div>
                  )}
                </div>
              </GlassCard>
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

      {/* Dialogs */}
      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className="bg-[#0f1117] border border-white/10 text-white max-w-lg">
          <DialogHeader><DialogTitle>{editFI ? "Modifier la FI" : "Créer une Famille d'Impact"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><p className="text-xs text-zinc-400 mb-1.5">Nom de la FI *</p>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Famille d'Impact Lumière" className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" /></div>
            <div><p className="text-xs text-zinc-400 mb-1.5">Campus</p>
              <Input value={form.campus} onChange={e => setForm(f => ({ ...f, campus: e.target.value }))} placeholder="Paris, Lyon..." className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" /></div>
            <div><p className="text-xs text-zinc-400 mb-1.5">Pilote *</p>
              <Select value={form.pilote_email} onValueChange={handlePiloteSelect}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Sélectionner un pilote" /></SelectTrigger>
                <SelectContent>{piloteUsers.map(u => <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><p className="text-xs text-zinc-400 mb-1.5">Co-Pilote</p>
              <Select value={form.co_pilote_email || ""} onValueChange={handleCoPiloteSelect}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>{piloteUsers.map(u => <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-zinc-400 mb-1.5">Statut</p>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="en_pause">En pause</SelectItem><SelectItem value="fermee">Fermée</SelectItem></SelectContent>
                </Select></div>
              <div><p className="text-xs text-zinc-400 mb-1.5">Objectif membres</p>
                <Input type="number" value={form.objectif_membres} onChange={e => setForm(f => ({ ...f, objectif_membres: parseInt(e.target.value) || 12 }))} className="bg-white/5 border-white/10 text-white" /></div>
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

      <Dialog open={!!statusFI} onOpenChange={() => setStatusFI(null)}>
        <DialogContent className="bg-[#0f1117] border border-white/10 text-white max-w-sm">
          <DialogHeader><DialogTitle>Statut — {statusFI?.name}</DialogTitle></DialogHeader>
          <div className="py-3">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="en_pause">En pause</SelectItem><SelectItem value="fermee">Fermée</SelectItem></SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStatusFI(null)} className="text-zinc-400 hover:text-white">Annuler</Button>
            <Button onClick={() => updateMutation.mutate({ id: statusFI.id, data: { status: newStatus } })} disabled={updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteFI} onOpenChange={() => setDeleteFI(null)}>
        <AlertDialogContent className="bg-[#0f1117] border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la Famille d'Impact ?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              <strong className="text-white">{deleteFI?.name}</strong> sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteFI.id)} className="bg-red-600 hover:bg-red-500 text-white">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── MAIN PAGE ── */
export default function FIHubPage() {
  useTrackActivity("FIHub");
  const [tab, setTab] = useState("dashboard");
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });

  const tabs = [
    { key: "dashboard", label: "Mes Maisons", icon: BarChart3 },
    { key: "gestion", label: "Gestion des FI", icon: Settings },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-[0.25em] mb-1">Familles d'Impact</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Hub FI</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Vue santé · Gestion des maisons</p>
        </div>
        {/* Inner tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all",
                  tab === t.key ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}>
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "dashboard" && <TabDashboard user={user} />}
      {tab === "gestion" && <TabGestion user={user} />}
    </div>
  );
}