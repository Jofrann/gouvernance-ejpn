import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Calendar, Clock, Users, Target, FileText, Globe, Wifi, TrendingUp, CheckCircle2, Zap } from "lucide-react";
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
                    <div key={action.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.02] transition-all">
                      <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0",
                        i === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                          i === 1 ? "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30" :
                            "bg-white/5 text-zinc-500 border border-white/10"
                      )}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-300 truncate">{action.titre}</p>
                        <p className="text-[10px] text-zinc-500">
                          {format(new Date(action.date_action), "d MMM", { locale: fr })} · {action.personnes_touchees} touchées · {action.conversions} acceptations
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-black text-blue-400">{ratio} acc/h</span>
                        {badge && <Badge className={cn("text-[10px] border", badge.cls)}>{badge.label}</Badge>}
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
      <Dialog open={!!selectedBriefing} onOpenChange={() => setSelectedBriefing(null)}>
        <DialogContent className="bg-[#0f1117] border border-white/10 text-white max-w-md">
          {selectedBriefing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><FileText className="w-4 h-4 text-cyan-400" /> Fiche de Mission</DialogTitle>
              </DialogHeader>
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}