import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Calendar, Clock, Users, Target, FileText, Globe, Wifi, TrendingUp, CheckCircle2, Zap, Pencil, Trash2, Save, CalendarClock, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

const TYPE_OPTIONS = [
  { value: "rue", label: "🚶 Rue", plan: "terrain" },
  { value: "campus", label: "🎓 Campus", plan: "terrain" },
  { value: "porte_a_porte", label: "🚪 Porte-à-porte", plan: "terrain" },
  { value: "evenement", label: "🎉 Événement", plan: "terrain" },
  { value: "zoom", label: "💻 Zoom", plan: "digital" },
];

const STATUT_COLORS = {
  planifie: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  en_cours: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  termine: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  annule: "bg-red-500/10 text-red-400 border-red-500/20",
};

function getYieldBadge(action) {
  if (!action.debrief_complete || !action.temps_investi_heures) return null;
  const ratio = action.conversions / action.temps_investi_heures;
  if (ratio >= 0.8) return { label: "🔥 Haut Rendement", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  if (ratio >= 0.3) return { label: "✓ Correct", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
  return { label: "⚠ Faible Impact", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
}

const GlassCard = ({ children, className = "" }) => (
  <div className={cn("rounded-2xl border border-white/[0.09] p-5", className)}
    style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.018) 100%)",
      backdropFilter: "blur(40px) saturate(1.7) brightness(1.05)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09), 0 8px 32px rgba(0,0,0,0.32)"
    }}>
    {children}
  </div>
);

const EMPTY_FORM = { titre: "", type_action: "rue", date_action: "", heure_debut: "", heure_fin: "", fi_assignees: [] };

export default function EvangelisationRadarPage() {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selectedBriefing, setSelectedBriefing] = useState(null);
  const [briefingMode, setBriefingMode] = useState("view"); // "view" | "edit"
  const [editForm, setEditForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [planFilter, setPlanFilter] = useState("tous");
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: actions = [] } = useQuery({
    queryKey: ["actions"],
    queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 100),
  });
  const { data: familles = [] } = useQuery({
    queryKey: ["familles"],
    queryFn: () => base44.entities.FamilleImpact.list(),
  });

  const deleteAction = useMutation({
    mutationFn: (id) => base44.entities.ActionEvangelisation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
      toast.success("Sortie supprimée");
      setSelectedBriefing(null);
      setConfirmDelete(false);
    },
  });

  const handleUpdateAction = async () => {
    if (!editForm.titre.trim() || !editForm.date_action) { toast.error("Titre et date requis"); return; }
    setSavingEdit(true);
    await base44.entities.ActionEvangelisation.update(selectedBriefing.id, editForm);
    queryClient.invalidateQueries({ queryKey: ["actions"] });
    setSelectedBriefing({ ...selectedBriefing, ...editForm });
    toast.success("Sortie mise à jour !");
    setBriefingMode("view");
    setSavingEdit(false);
  };

  const openBriefingEdit = (action) => {
    setEditForm({
      titre: action.titre,
      type_action: action.type_action,
      date_action: action.date_action,
      heure_debut: action.heure_debut || "",
      heure_fin: action.heure_fin || "",
      fi_assignees: action.fi_assignees || [],
    });
    setBriefingMode("edit");
  };

  const createAction = useMutation({
    mutationFn: (data) => base44.entities.ActionEvangelisation.create({ ...data, statut: "planifie", personnes_touchees: 0, conversions: 0, temps_investi_heures: 0, debrief_complete: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
      toast.success("Action planifiée !");
      setShowNew(false);
      setForm(EMPTY_FORM);
    },
  });

  const toggleFI = (fiId) => {
    setForm(prev => ({
      ...prev,
      fi_assignees: prev.fi_assignees.includes(fiId)
        ? prev.fi_assignees.filter(id => id !== fiId)
        : [...prev.fi_assignees, fiId],
    }));
  };

  const upcoming = actions.filter(a => a.statut === "planifie" || a.statut === "en_cours");
  const past = actions.filter(a => a.statut === "termine" && a.debrief_complete);

  // Stats
  const totalPersonnes = past.reduce((s, a) => s + (a.personnes_touchees || 0), 0);
  const totalConversions = past.reduce((s, a) => s + (a.conversions || 0), 0);
  const totalHeures = past.reduce((s, a) => s + (a.temps_investi_heures || 0), 0);

  const terrainActions = upcoming.filter(a => ["rue", "campus", "porte_a_porte", "evenement"].includes(a.type_action));
  const digitalActions = upcoming.filter(a => a.type_action === "zoom");

  const filteredUpcoming = planFilter === "terrain" ? terrainActions : planFilter === "digital" ? digitalActions : upcoming;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-[0.25em] mb-1">Pôle Évangélisation</p>
          <h1 className="text-2xl font-light text-white tracking-tight">Plan <span className="font-black">Terrain & Digital</span></h1>
          <p className="text-sm text-zinc-500 mt-0.5 font-light">Fiches de mission · Classement rendement · Suivi des âmes</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-glow-blue flex items-center gap-2 px-4 py-2 h-9">
          <Plus className="w-4 h-4" /> Planifier une Action
        </button>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Actions planifiées", value: upcoming.length, icon: Target, color: "text-blue-400" },
          { label: "Personnes touchées", value: totalPersonnes, icon: Users, color: "text-cyan-400" },
          { label: "Acceptations", value: totalConversions, icon: Zap, color: "text-emerald-400" },
          { label: "Heures investies", value: `${totalHeures}h`, icon: Clock, color: "text-violet-400" },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className="!p-4">
              <div className="flex items-center gap-3">
                <Icon className={cn("w-5 h-5", color)} />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
                  <p className={cn("text-2xl font-black", color)}>{value}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Plan Terrain & Digital */}
      <div>
        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-white/[0.07]">
          {[
            { key: "tous", label: "Toutes les actions", icon: Target },
            { key: "terrain", label: "Plan Terrain", icon: Globe },
            { key: "digital", label: "En ligne", icon: Wifi },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setPlanFilter(tab.key)}
                className={cn("relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all",
                  planFilter === tab.key ? "text-white" : "text-zinc-500 hover:text-zinc-300")}>
                <Icon className="w-4 h-4" />
                {tab.label}
                {planFilter === tab.key && (
                  <motion.div layoutId="evang-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {filteredUpcoming.length === 0 ? (
          <GlassCard>
            <div className="py-12 text-center">
              <Globe className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-sm text-zinc-600">Aucune action planifiée</p>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {filteredUpcoming.map((action, i) => {
              const assignedFI = familles.filter(fi => action.fi_assignees?.includes(fi.id));
              const isPlan = ["rue", "campus", "porte_a_porte", "evenement"].includes(action.type_action);
              return (
                <motion.div key={action.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                  <div
                    className="flex items-center justify-between p-4 rounded-xl border border-white/[0.07] hover:border-white/[0.14] bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer group"
                    onClick={() => setSelectedBriefing(action)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg border", isPlan ? "bg-cyan-500/10 border-cyan-500/20" : "bg-violet-500/10 border-violet-500/20")}>
                        {isPlan ? <Globe className="w-3.5 h-3.5 text-cyan-400" /> : <Wifi className="w-3.5 h-3.5 text-violet-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-200 group-hover:text-white">{action.titre}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{format(new Date(action.date_action), "d MMM", { locale: fr })}
                          </span>
                          {action.heure_debut && <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" />{action.heure_debut}</span>}
                          {assignedFI.length > 0 && <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Users className="w-3 h-3" />{assignedFI.length} FI</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-[10px] border", STATUT_COLORS[action.statut])}>{action.statut}</Badge>
                      <span className="text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-all">Voir briefing →</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Classement Rendement */}
      {past.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-zinc-500" />
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Classement Rendement</p>
          </div>
          <GlassCard>
            <div className="space-y-2">
              {[...past]
                .sort((a, b) => (b.conversions / Math.max(b.temps_investi_heures, 0.1)) - (a.conversions / Math.max(a.temps_investi_heures, 0.1)))
                .map((action, i) => {
                  const badge = getYieldBadge(action);
                  const ratio = action.temps_investi_heures > 0 ? (action.conversions / action.temps_investi_heures).toFixed(2) : "—";
                  return (
                    <div
                      key={action.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] hover:border-white/[0.14] hover:bg-white/[0.03] transition-all cursor-pointer group"
                      onClick={() => { setSelectedBriefing(action); setBriefingMode("view"); setConfirmDelete(false); }}
                    >
                      <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0",
                        i === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                          i === 1 ? "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30" :
                            "bg-white/5 text-zinc-500 border border-white/10"
                      )}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-300 group-hover:text-white truncate">{action.titre}</p>
                        <p className="text-[10px] text-zinc-500">
                          {format(new Date(action.date_action), "d MMM", { locale: fr })} · {action.personnes_touchees} touchées · {action.conversions} acceptations
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-black text-blue-400">{ratio} acc/h</span>
                        {badge && <Badge className={cn("text-[10px] border", badge.cls)}>{badge.label}</Badge>}
                        <span className="text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-all">···</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Dialog création action */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="bg-[#0f1117] border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Target className="w-4 h-4 text-cyan-400" /> Planifier une Action</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <p className="text-xs text-zinc-400 mb-1.5">Titre de l'action *</p>
              <Input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder="Ex: Sortie Campus Jussieu" className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-zinc-400 mb-1.5">Type</p>
                <Select value={form.type_action} onValueChange={v => setForm(f => ({ ...f, type_action: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rue">🚶 Rue</SelectItem>
                    <SelectItem value="campus">🎓 Campus</SelectItem>
                    <SelectItem value="porte_a_porte">🚪 Porte-à-porte</SelectItem>
                    <SelectItem value="evenement">🎉 Événement</SelectItem>
                    <SelectItem value="zoom">💻 Zoom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1.5">Date *</p>
                <Input type="date" value={form.date_action} onChange={e => setForm(f => ({ ...f, date_action: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-zinc-400 mb-1.5">Heure début</p>
                <Input type="time" value={form.heure_debut} onChange={e => setForm(f => ({ ...f, heure_debut: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1.5">Heure fin</p>
                <Input type="time" value={form.heure_fin} onChange={e => setForm(f => ({ ...f, heure_fin: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-2">FI mobilisées</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {familles.map(fi => (
                  <label key={fi.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-all">
                    <Checkbox checked={form.fi_assignees.includes(fi.id)} onCheckedChange={() => toggleFI(fi.id)} />
                    <span className="text-sm text-zinc-300">{fi.name}</span>
                    <span className="text-xs text-zinc-600">{fi.campus}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)} className="text-zinc-400 hover:text-white">Annuler</Button>
            <Button onClick={() => form.titre && form.date_action && createAction.mutate(form)} disabled={createAction.isPending} className="bg-cyan-600 hover:bg-cyan-500 text-white">
              Créer la Fiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Briefing Dialog */}
      <Dialog open={!!selectedBriefing} onOpenChange={() => { setSelectedBriefing(null); setBriefingMode("view"); setConfirmDelete(false); }}>
        <DialogContent className="bg-[#0f1117] border border-white/10 text-white max-w-md overflow-y-auto max-h-[90vh]">
          {selectedBriefing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    {briefingMode === "edit" ? "Modifier la sortie" : "Fiche de Mission"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {briefingMode === "view" && (
                      <>
                        <button
                          onClick={() => openBriefingEdit(selectedBriefing)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
                        >
                          <Pencil className="w-3 h-3" /> Modifier
                        </button>
                        <button
                          onClick={() => setConfirmDelete(true)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
                        >
                          <Trash2 className="w-3 h-3" /> Supprimer
                        </button>
                      </>
                    )}
                    {briefingMode === "edit" && (
                      <button onClick={() => setBriefingMode("view")} className="text-zinc-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </DialogTitle>
              </DialogHeader>

              {/* Confirm delete */}
              {confirmDelete && (
                <div className="rounded-xl p-3 mb-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <p className="text-xs text-red-300 font-semibold mb-2">⚠️ Supprimer "{selectedBriefing.titre}" définitivement ?</p>
                  <div className="flex gap-2">
                    <button className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-all" onClick={() => setConfirmDelete(false)}>Annuler</button>
                    <button
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171" }}
                      onClick={() => deleteAction.mutate(selectedBriefing.id)}
                      disabled={deleteAction.isPending}
                    >
                      {deleteAction.isPending ? "Suppression..." : "Oui, supprimer"}
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW MODE */}
              {briefingMode === "view" && (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
                    <h3 className="text-lg font-bold text-white">{selectedBriefing.titre}</h3>
                    <Badge className="mt-1.5 bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px]">{selectedBriefing.type_action?.toUpperCase()}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                      <p className="text-[10px] text-zinc-500 uppercase">Date</p>
                      <p className="text-sm font-medium text-zinc-200 mt-0.5">
                        {format(new Date(selectedBriefing.date_action), "EEEE d MMMM", { locale: fr })}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                      <p className="text-[10px] text-zinc-500 uppercase">Horaire</p>
                      <p className="text-sm font-medium text-zinc-200 mt-0.5">
                        {selectedBriefing.heure_debut || "—"} → {selectedBriefing.heure_fin || "—"}
                      </p>
                    </div>
                  </div>
                  {selectedBriefing.fi_assignees?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase mb-2">FI Mobilisées</p>
                      <div className="space-y-1.5">
                        {familles.filter(fi => selectedBriefing.fi_assignees.includes(fi.id)).map(fi => (
                          <div key={fi.id} className="flex items-center gap-2 p-2 rounded-lg border border-white/[0.07] bg-white/[0.02]">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-sm font-medium text-zinc-300">{fi.name}</span>
                            <span className="text-xs text-zinc-600">· {fi.campus}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Objectif</p>
                    <p className="text-sm text-zinc-300 mt-1 leading-relaxed">Toucher un maximum de personnes. Présenter clairement la vision EJPN. Relever les contacts intéressés.</p>
                  </div>
                </div>
              )}

              {/* EDIT MODE */}
              {briefingMode === "edit" && editForm && (
                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Titre *</label>
                    <Input value={editForm.titre} onChange={e => setEditForm(f => ({ ...f, titre: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Type</label>
                      <Select value={editForm.type_action} onValueChange={v => setEditForm(f => ({ ...f, type_action: v }))}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rue">🚶 Rue</SelectItem>
                          <SelectItem value="campus">🎓 Campus</SelectItem>
                          <SelectItem value="porte_a_porte">🚪 Porte-à-porte</SelectItem>
                          <SelectItem value="evenement">🎉 Événement</SelectItem>
                          <SelectItem value="zoom">💻 Zoom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                        <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Date *</span>
                      </label>
                      <Input type="date" value={editForm.date_action} onChange={e => setEditForm(f => ({ ...f, date_action: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Heure début</label>
                      <Input type="time" value={editForm.heure_debut} onChange={e => setEditForm(f => ({ ...f, heure_debut: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Heure fin</label>
                      <Input type="time" value={editForm.heure_fin} onChange={e => setEditForm(f => ({ ...f, heure_fin: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                    </div>
                  </div>

                  {/* Décalage rapide */}
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Décaler la date de</label>
                    <div className="flex gap-2">
                      {[1, 3, 7, 14].map(days => {
                        const d = new Date(editForm.date_action);
                        d.setDate(d.getDate() + days);
                        return (
                          <button key={days} onClick={() => setEditForm(f => ({ ...f, date_action: d.toISOString().split("T")[0] }))}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc" }}>
                            +{days}j
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* FI */}
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">FI mobilisées</label>
                    <div className="space-y-1.5 max-h-28 overflow-y-auto">
                      {familles.map(fi => (
                        <label key={fi.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-all">
                          <Checkbox
                            checked={editForm.fi_assignees.includes(fi.id)}
                            onCheckedChange={() => setEditForm(f => ({
                              ...f,
                              fi_assignees: f.fi_assignees.includes(fi.id)
                                ? f.fi_assignees.filter(id => id !== fi.id)
                                : [...f.fi_assignees, fi.id]
                            }))}
                          />
                          <span className="text-sm text-zinc-300">{fi.name}</span>
                          <span className="text-xs text-zinc-600">{fi.campus}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setBriefingMode("view")} className="text-zinc-400 hover:text-white">Annuler</Button>
                    <Button
                      onClick={handleUpdateAction}
                      disabled={savingEdit}
                      className="bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" /> {savingEdit ? "Sauvegarde..." : "Enregistrer"}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}