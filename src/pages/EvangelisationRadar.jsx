import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Calendar, Clock, Users, Target, FileText, MapPin, Zap, Trophy } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const TYPE_OPTIONS = [
  { value: "rue", label: "🚶 Rue" },
  { value: "campus", label: "🎓 Campus" },
  { value: "zoom", label: "💻 Zoom" },
  { value: "porte_a_porte", label: "🚪 Porte-à-porte" },
  { value: "evenement", label: "🎉 Événement" },
];

const STATUT_CONFIG = {
  planifie:  { label: "Planifié",  dot: "bg-blue-400",   bar: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  en_cours:  { label: "En cours",  dot: "bg-amber-400",  bar: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  termine:   { label: "Terminé",   dot: "bg-zinc-500",   bar: "text-zinc-400 bg-zinc-800 border-zinc-700" },
  annule:    { label: "Annulé",    dot: "bg-red-400",    bar: "text-red-400 bg-red-500/10 border-red-500/20" },
};

function getYield(action) {
  if (!action.debrief_complete || !action.temps_investi_heures) return null;
  const r = action.conversions / action.temps_investi_heures;
  if (r >= 0.8) return { label: "🔥 Haut Rendement", cls: "text-emerald-400 bg-emerald-900/30 border-emerald-500/30" };
  if (r >= 0.3) return { label: "✓ Correct", cls: "text-blue-400 bg-blue-900/30 border-blue-500/30" };
  return { label: "⚠ Faible", cls: "text-amber-400 bg-amber-900/30 border-amber-500/30" };
}

export default function EvangelisationRadarPage() {
  useTrackActivity("EvangelisationRadar");
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selectedBriefing, setSelectedBriefing] = useState(null);
  const [form, setForm] = useState({ titre: "", type_action: "rue", date_action: "", heure_debut: "", heure_fin: "", fi_assignees: [] });

  const { data: actions = [] } = useQuery({
    queryKey: ["evang-actions"],
    queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 100),
    refetchInterval: 30000,
  });
  const { data: familles = [] } = useQuery({
    queryKey: ["familles"],
    queryFn: () => base44.entities.FamilleImpact.list(),
  });

  const createAction = useMutation({
    mutationFn: (data) => base44.entities.ActionEvangelisation.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evang-actions"] });
      toast.success("Action planifiée !");
      setShowNew(false);
      setForm({ titre: "", type_action: "rue", date_action: "", heure_debut: "", heure_fin: "", fi_assignees: [] });
    },
  });

  const updateStatut = useMutation({
    mutationFn: ({ id, statut }) => base44.entities.ActionEvangelisation.update(id, { statut }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evang-actions"] }),
  });

  const toggleFI = (id) => setForm(p => ({
    ...p,
    fi_assignees: p.fi_assignees.includes(id) ? p.fi_assignees.filter(x => x !== id) : [...p.fi_assignees, id],
  }));

  const upcoming = actions.filter(a => a.statut === "planifie" || a.statut === "en_cours");
  const past = actions.filter(a => a.debrief_complete).sort((a, b) => (b.conversions / Math.max(b.temps_investi_heures, 0.1)) - (a.conversions / Math.max(a.temps_investi_heures, 0.1)));

  // KPIs
  const totalConv = actions.filter(a => a.debrief_complete).reduce((s, a) => s + (a.conversions || 0), 0);
  const totalH = actions.filter(a => a.debrief_complete).reduce((s, a) => s + (a.temps_investi_heures || 0), 0);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-bold text-white">Radar Ops</h1>
          <p className="text-xs text-zinc-600">Planning · Fiches de Mission · Classement Rendement</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all">
          <Plus className="w-4 h-4" /> Planifier une Action
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Opérations à venir", value: upcoming.length, color: "text-blue-400", bg: "border-blue-500/20 bg-blue-900/10" },
            { label: "Total acceptations", value: totalConv, color: "text-emerald-400", bg: "border-emerald-500/20 bg-emerald-900/10" },
            { label: "ROI global (acc/h)", value: totalH > 0 ? (totalConv / totalH).toFixed(2) : "—", color: "text-violet-400", bg: "border-violet-500/20 bg-violet-900/10" },
          ].map(k => (
            <div key={k.label} className={cn("ai-card rounded-xl border p-4", k.bg)}>
              <p className={cn("text-2xl font-bold", k.color)}>{k.value}</p>
              <p className="text-xs text-zinc-600 mt-1">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Opérations à venir ({upcoming.length})
            </h2>
            <div className="space-y-2">
              {upcoming.map(action => {
                const assignedFI = familles.filter(fi => action.fi_assignees?.includes(fi.id));
                const cfg = STATUT_CONFIG[action.statut] || STATUT_CONFIG.planifie;
                return (
                  <div key={action.id} className="ai-card rounded-xl border border-white/8 p-4 cursor-pointer hover:border-white/20 hover:bg-white/5 transition-all"
                    onClick={() => setSelectedBriefing(action)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={cn("mt-0.5 w-2 h-2 rounded-full flex-shrink-0", cfg.dot)} />
                        <div>
                          <p className="text-sm font-semibold text-white">{action.titre}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-zinc-500 flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(action.date_action), "d MMM", { locale: fr })}</span>
                            {action.heure_debut && <span className="text-xs text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" />{action.heure_debut}</span>}
                            {assignedFI.length > 0 && <span className="text-xs text-zinc-500 flex items-center gap-1"><Users className="w-3 h-3" />{assignedFI.length} FI</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] border px-2 py-0.5 rounded-md", cfg.bar)}>{cfg.label}</span>
                        <span className="text-[10px] text-zinc-500 border border-white/10 rounded-md px-2 py-0.5">Briefing →</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ranking */}
        <div>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Trophy className="w-3 h-3 text-amber-400" /> Classement Rendement
          </h2>
          {past.length === 0 ? (
            <div className="ai-card rounded-xl border border-white/5 p-10 text-center">
              <p className="text-sm text-zinc-600">Aucune action debriefée</p>
            </div>
          ) : (
            <div className="space-y-2">
              {past.map((action, i) => {
                const badge = getYield(action);
                const ratio = action.temps_investi_heures > 0 ? (action.conversions / action.temps_investi_heures).toFixed(2) : "—";
                return (
                  <div key={action.id} className="ai-card flex items-center gap-3 p-3.5 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                    <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                      i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-zinc-700 text-zinc-300" : "bg-zinc-800 text-zinc-500")}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{action.titre}</p>
                      <p className="text-xs text-zinc-600">{format(new Date(action.date_action), "d MMM", { locale: fr })} · {action.personnes_touchees} touchées · {action.conversions} acceptations</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold text-blue-400">{ratio} acc/h</span>
                      {badge && <span className={cn("text-[10px] border px-2 py-0.5 rounded-md", badge.cls)}>{badge.label}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Action Sheet */}
      <Sheet open={showNew} onOpenChange={setShowNew}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-[#0d1018] border-l border-white/10 overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-white/10">
            <SheetTitle className="text-white">Planifier une Action</SheetTitle>
          </SheetHeader>
          <div className="py-5 space-y-4">
            {[
              { label: "Titre *", key: "titre", placeholder: "Ex: Sortie Campus Jussieu" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-zinc-500 font-medium block mb-1.5">{f.label}</label>
                <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 transition-colors"
                  placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5">Type d'action</label>
              <select value={form.type_action} onChange={e => setForm({ ...form, type_action: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3">
                <label className="text-xs text-zinc-500 font-medium block mb-1.5">Date *</label>
                <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none" value={form.date_action} onChange={e => setForm({ ...form, date_action: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1.5">Début</label>
                <input type="time" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none" value={form.heure_debut} onChange={e => setForm({ ...form, heure_debut: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1.5">Fin</label>
                <input type="time" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none" value={form.heure_fin} onChange={e => setForm({ ...form, heure_fin: e.target.value })} />
              </div>
            </div>
            {familles.length > 0 && (
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-2">FI mobilisées</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {familles.map(fi => (
                    <label key={fi.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <Checkbox checked={form.fi_assignees.includes(fi.id)} onCheckedChange={() => toggleFI(fi.id)} className="border-white/20" />
                      <span className="text-sm text-zinc-300">{fi.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => createAction.mutate({ ...form, statut: "planifie", personnes_touchees: 0, conversions: 0, temps_investi_heures: 0, debrief_complete: false })}
              disabled={!form.titre || !form.date_action}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-semibold text-white transition-all">
              Créer la Fiche de Mission
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Briefing Sheet */}
      <Sheet open={!!selectedBriefing} onOpenChange={() => setSelectedBriefing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-[#0d1018] border-l border-white/10 overflow-y-auto">
          {selectedBriefing && (
            <div className="p-6 space-y-5">
              <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-900/10">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Fiche de Mission</span>
                </div>
                <h3 className="text-xl font-bold text-white">{selectedBriefing.titre}</h3>
                <span className="inline-block mt-2 text-[10px] border border-blue-500/30 rounded-md px-2 py-0.5 text-blue-400">
                  {TYPE_OPTIONS.find(t => t.value === selectedBriefing.type_action)?.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-white/8 bg-white/3">
                  <p className="text-[10px] text-zinc-600 uppercase mb-1">Date</p>
                  <p className="text-sm font-medium text-white">{format(new Date(selectedBriefing.date_action), "EEEE d MMMM", { locale: fr })}</p>
                </div>
                <div className="p-3 rounded-xl border border-white/8 bg-white/3">
                  <p className="text-[10px] text-zinc-600 uppercase mb-1">Horaire</p>
                  <p className="text-sm font-medium text-white">{selectedBriefing.heure_debut || "—"} → {selectedBriefing.heure_fin || "—"}</p>
                </div>
              </div>
              {selectedBriefing.fi_assignees?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase mb-2 flex items-center gap-1.5"><Users className="w-3 h-3" /> FI Mobilisées</p>
                  <div className="space-y-1.5">
                    {familles.filter(fi => selectedBriefing.fi_assignees.includes(fi.id)).map(fi => (
                      <div key={fi.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-white/5 bg-white/3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="font-medium text-white">{fi.name}</span>
                        {fi.campus && <span className="text-zinc-600 text-xs">· {fi.campus}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-900/10">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Objectif</p>
                <p className="text-sm text-zinc-300 leading-relaxed">Toucher un maximum de personnes. Parler clairement de la vision EJPN. Relever les contacts intéressés.</p>
              </div>
              {/* Change status */}
              <div className="flex gap-2">
                {selectedBriefing.statut === "planifie" && (
                  <button onClick={() => { updateStatut.mutate({ id: selectedBriefing.id, statut: "en_cours" }); setSelectedBriefing(null); }}
                    className="flex-1 py-2 rounded-xl border border-amber-500/30 text-xs text-amber-400 hover:bg-amber-900/20 transition-all">
                    Démarrer l'action
                  </button>
                )}
                {(selectedBriefing.statut === "planifie" || selectedBriefing.statut === "en_cours") && (
                  <button onClick={() => { updateStatut.mutate({ id: selectedBriefing.id, statut: "termine" }); setSelectedBriefing(null); }}
                    className="flex-1 py-2 rounded-xl border border-white/10 text-xs text-zinc-400 hover:bg-white/5 transition-all">
                    Marquer terminé
                  </button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}