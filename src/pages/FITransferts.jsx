import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowRightLeft, Plus, CheckCircle2, XCircle, Clock, GraduationCap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

const STATUT_COLORS = {
  en_attente: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  approuve: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  refuse: "bg-red-500/10 text-red-400 border-red-500/30",
};

const GlassCard = ({ children, className = "" }) => (
  <div className={cn("rounded-2xl border border-white/[0.07] p-5", className)}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
    {children}
  </div>
);

export default function FITransfertsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [refusModal, setRefusModal] = useState(null);
  const [motifRefus, setMotifRefus] = useState("");
  const [form, setForm] = useState({ membre_id: "", fi_destination_id: "", type: "inter_fi", motif_demande: "" });

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isResponsable = user?.role === "admin" || user?.role === "responsable_fi";

  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres-all"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: transferts = [] } = useQuery({ queryKey: ["transferts"], queryFn: () => base44.entities.Transfert.list("-created_date", 200) });

  const getFI = (id) => familles.find(f => f.id === id);
  const getMembre = (id) => membres.find(m => m.id === id);

  // Mes membres (pilote) ou tous (responsable)
  const myFIs = familles.filter(f => f.pilote_email === user?.email || f.co_pilote_email === user?.email);
  const myFIIds = myFIs.map(f => f.id);
  const mesMembres = isResponsable
    ? membres
    : membres.filter(m => myFIIds.includes(m.famille_impact_id));

  const creerTransfert = useMutation({
    mutationFn: (data) => {
      const m = getMembre(data.membre_id);
      const fi = getFI(m?.famille_impact_id);
      const dest = getFI(data.fi_destination_id);
      return base44.entities.Transfert.create({
        ...data,
        membre_nom: m?.nom_complet,
        fi_source_id: m?.famille_impact_id,
        fi_source_nom: fi?.name,
        fi_destination_nom: dest?.name,
        demandeur_email: user?.email,
        demandeur_nom: user?.full_name,
        statut: "en_attente",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transferts"] });
      toast.success("Demande de transfert envoyée !");
      setShowModal(false);
      setForm({ membre_id: "", fi_destination_id: "", type: "inter_fi", motif_demande: "" });
    },
  });

  const approuver = useMutation({
    mutationFn: async (t) => {
      await base44.entities.Transfert.update(t.id, { statut: "approuve", valideur_email: user?.email });
      if (t.type === "inter_fi" && t.fi_destination_id) {
        await base44.entities.Membre.update(t.membre_id, { famille_impact_id: t.fi_destination_id });
      } else if (t.type === "formation") {
        await base44.entities.Membre.update(t.membre_id, { potentiel_formation: true });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transferts", "membres-all"] }); toast.success("Transfert approuvé !"); },
  });

  const refuser = useMutation({
    mutationFn: (t) => base44.entities.Transfert.update(t.id, { statut: "refuse", motif_refus: motifRefus, valideur_email: user?.email }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transferts"] }); setRefusModal(null); setMotifRefus(""); toast.success("Demande refusée"); },
  });

  const enAttente = transferts.filter(t => t.statut === "en_attente");
  const historique = transferts.filter(t => t.statut !== "en_attente");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-[0.25em] mb-1">Familles d'Impact</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Centre de Transferts</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Mobilités inter-FI · Identifications Formation</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-amber-600/80 hover:bg-amber-600 border border-amber-500/30 text-white gap-2">
          <Plus className="w-4 h-4" /> Nouvelle Demande
        </Button>
      </div>

      {/* En attente */}
      {enAttente.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-400" />
            <p className="text-sm font-bold text-amber-400 uppercase tracking-wider">En attente ({enAttente.length})</p>
          </div>
          <div className="space-y-2">
            {enAttente.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <GlassCard className="border-amber-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl", t.type === "formation" ? "bg-violet-500/10 border border-violet-500/20" : "bg-amber-500/10 border border-amber-500/20")}>
                        {t.type === "formation" ? <GraduationCap className="w-4 h-4 text-violet-400" /> : <ArrowRightLeft className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{t.membre_nom}</p>
                        <p className="text-xs text-zinc-500">
                          {t.type === "formation" ? `Identifié pour la Formation · depuis ${t.fi_source_nom}` : `${t.fi_source_nom} → ${t.fi_destination_nom || "?"}`}
                        </p>
                        {t.motif_demande && <p className="text-xs text-zinc-600 mt-0.5 italic">{t.motif_demande}</p>}
                        <p className="text-[10px] text-zinc-600 mt-1">Par {t.demandeur_nom}</p>
                      </div>
                    </div>
                    {isResponsable ? (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-emerald-600/80 hover:bg-emerald-600 text-white gap-1.5 text-xs"
                          onClick={() => approuver.mutate(t)} disabled={approuver.isPending}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approuver
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 border border-red-500/20 gap-1.5 text-xs"
                          onClick={() => setRefusModal(t)}>
                          <XCircle className="w-3.5 h-3.5" /> Refuser
                        </Button>
                      </div>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1"><Clock className="w-3 h-3" /> En attente</Badge>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {enAttente.length === 0 && (
        <GlassCard>
          <div className="py-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Aucune demande en attente</p>
          </div>
        </GlassCard>
      )}

      {/* Historique */}
      {historique.length > 0 && (
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Historique</p>
          <div className="space-y-2">
            {historique.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  {t.type === "formation" ? <GraduationCap className="w-4 h-4 text-violet-400/60" /> : <ArrowRightLeft className="w-4 h-4 text-zinc-600" />}
                  <div>
                    <p className="text-sm text-zinc-300">{t.membre_nom}</p>
                    <p className="text-xs text-zinc-600">
                      {t.type === "formation" ? "Formation" : `${t.fi_source_nom} → ${t.fi_destination_nom}`}
                      {t.motif_refus && ` · Refus : ${t.motif_refus}`}
                    </p>
                  </div>
                </div>
                <Badge className={cn("text-[10px] border", STATUT_COLORS[t.statut])}>{t.statut.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal nouvelle demande */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-[#0a0d14] border border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle>Nouvelle Demande de Transfert</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs text-zinc-400 mb-1.5">Type</p>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v, fi_destination_id: "" }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inter_fi">↔ Transfert inter-FI</SelectItem>
                  <SelectItem value="formation">✦ Identification Formation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-1.5">Membre *</p>
              <Select value={form.membre_id} onValueChange={v => setForm(f => ({ ...f, membre_id: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Sélectionner un membre" /></SelectTrigger>
                <SelectContent>{mesMembres.map(m => <SelectItem key={m.id} value={m.id}>{m.nom_complet} — {getFI(m.famille_impact_id)?.name || "?"}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.type === "inter_fi" && (
              <div>
                <p className="text-xs text-zinc-400 mb-1.5">FI de destination *</p>
                <Select value={form.fi_destination_id} onValueChange={v => setForm(f => ({ ...f, fi_destination_id: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Choisir une FI" /></SelectTrigger>
                  <SelectContent>{familles.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <p className="text-xs text-zinc-400 mb-1.5">Motif (optionnel)</p>
              <Input value={form.motif_demande} onChange={e => setForm(f => ({ ...f, motif_demande: e.target.value }))}
                placeholder="Raison du transfert..." className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">Annuler</Button>
            <Button onClick={() => creerTransfert.mutate(form)} disabled={!form.membre_id || creerTransfert.isPending || (form.type === "inter_fi" && !form.fi_destination_id)}
              className="bg-amber-600 hover:bg-amber-500 text-white">Soumettre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal refus */}
      <Dialog open={!!refusModal} onOpenChange={() => setRefusModal(null)}>
        <DialogContent className="bg-[#0a0d14] border border-white/10 text-white max-w-sm">
          <DialogHeader><DialogTitle>Motif du refus</DialogTitle></DialogHeader>
          <div className="py-3">
            <Input value={motifRefus} onChange={e => setMotifRefus(e.target.value)} placeholder="Indiquer la raison..."
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRefusModal(null)} className="text-zinc-400 hover:text-white">Annuler</Button>
            <Button onClick={() => refuser.mutate(refusModal)} disabled={refuser.isPending} className="bg-red-600 hover:bg-red-500 text-white">Confirmer le refus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}