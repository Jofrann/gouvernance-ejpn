import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageSquare, Clock, Target, Zap, TrendingUp, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const TYPE_LABELS = { rue: "🚶 Rue", campus: "🎓 Campus", zoom: "💻 Zoom", porte_a_porte: "🚪 Porte-à-porte", evenement: "🎉 Événement" };
const TYPE_COLORS = { rue: "text-blue-400 bg-blue-500/10 border-blue-500/20", campus: "text-violet-400 bg-violet-500/10 border-violet-500/20", zoom: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", porte_a_porte: "text-orange-400 bg-orange-500/10 border-orange-500/20", evenement: "text-pink-400 bg-pink-500/10 border-pink-500/20" };

function getYield(action) {
  const r = parseFloat((action.conversions / Math.max(action.temps_investi_heures, 0.01)).toFixed(2));
  if (isNaN(r)) return null;
  if (r >= 0.8) return { label: "🔥 Haut Rendement", cls: "text-emerald-400 bg-emerald-900/30 border-emerald-500/30" };
  if (r >= 0.3) return { label: "✓ Bon Ratio", cls: "text-blue-400 bg-blue-900/30 border-blue-500/30" };
  return { label: "⚠ Faible Impact", cls: "text-amber-400 bg-amber-900/30 border-amber-500/30" };
}

export default function EvangelisationDebriefPage() {
  useTrackActivity("EvangelisationDebrief");
  const qc = useQueryClient();
  const [selectedAction, setSelectedAction] = useState(null);
  const [deb, setDeb] = useState({ personnes_touchees: "", conversions: "", temps_investi_heures: "", notes_debrief: "" });

  const { data: actions = [] } = useQuery({
    queryKey: ["evang-actions"],
    queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 100),
    refetchInterval: 30000,
  });

  const submitDebrief = useMutation({
    mutationFn: (data) => base44.entities.ActionEvangelisation.update(selectedAction.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evang-actions"] });
      toast.success("Debrief soumis !");
      setSelectedAction(null);
    },
  });

  const openDebrief = (action) => {
    setSelectedAction(action);
    setDeb({ personnes_touchees: action.personnes_touchees || "", conversions: action.conversions || "", temps_investi_heures: action.temps_investi_heures || "", notes_debrief: action.notes_debrief || "" });
  };

  const pending = actions.filter(a => a.statut === "termine" && !a.debrief_complete);
  const completed = actions.filter(a => a.debrief_complete);
  const liveRatio = deb.conversions && parseFloat(deb.temps_investi_heures) > 0
    ? (parseFloat(deb.conversions) / parseFloat(deb.temps_investi_heures)).toFixed(2) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-bold text-white">Zone Debrief</h1>
          <p className="text-xs text-zinc-600">Post-action · Calcul de ratio immédiat</p>
        </div>
        {pending.length > 0 && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
            <AlertTriangle className="w-3 h-3" /> {pending.length} en attente
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Pending */}
        {pending.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> Debriefs en attente
            </h2>
            <div className="space-y-2">
              {pending.map(action => (
                <div key={action.id}
                  className="ai-card flex items-center justify-between gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-900/10 cursor-pointer hover:border-amber-500/40 transition-all"
                  onClick={() => openDebrief(action)}>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">{action.titre}</p>
                      <p className="text-xs text-zinc-500">{format(new Date(action.date_action), "d MMM yyyy", { locale: fr })} · {TYPE_LABELS[action.type_action]}</p>
                    </div>
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-xs text-amber-400 hover:bg-amber-500/30 transition-all">
                    <MessageSquare className="w-3.5 h-3.5" /> Débriefer
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        <div>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Actions Debriefées ({completed.length})</h2>
          {completed.length === 0 ? (
            <div className="ai-card rounded-xl border border-white/5 p-10 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
              <p className="text-sm text-zinc-600">Aucun debrief complété</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completed.map(action => {
                const ratio = action.temps_investi_heures > 0 ? (action.conversions / action.temps_investi_heures).toFixed(2) : null;
                const badge = getYield(action);
                return (
                  <div key={action.id} className="ai-card rounded-xl border border-white/8 p-4 cursor-pointer hover:border-white/20 hover:bg-white/5 transition-all"
                    onClick={() => openDebrief(action)}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <span className={cn("text-[10px] border px-2 py-0.5 rounded-md flex-shrink-0 mt-0.5", TYPE_COLORS[action.type_action])}>
                          {TYPE_LABELS[action.type_action]}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-white">{action.titre}</p>
                          <p className="text-xs text-zinc-500">{format(new Date(action.date_action), "d MMM yyyy", { locale: fr })}</p>
                        </div>
                      </div>
                      {badge && <span className={cn("text-[10px] border px-2 py-0.5 rounded-md flex-shrink-0", badge.cls)}>{badge.label}</span>}
                    </div>
                    <div className="flex items-center gap-5 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-zinc-600" />
                        <span className="text-xs text-zinc-500"><strong className="text-white">{action.personnes_touchees}</strong> touchées</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs text-zinc-500"><strong className="text-white">{action.conversions}</strong> acceptations</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-600" />
                        <span className="text-xs text-zinc-500"><strong className="text-white">{action.temps_investi_heures}h</strong></span>
                      </div>
                      {ratio && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs font-bold text-blue-400">Ratio: {ratio} acc/h</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Debrief Sheet */}
      <Sheet open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-[#0d1018] border-l border-white/10 overflow-y-auto">
          {selectedAction && (
            <>
              <SheetHeader className="pb-4 border-b border-white/10">
                <SheetTitle className="text-white">{selectedAction.titre}</SheetTitle>
                <p className="text-xs text-zinc-500">{format(new Date(selectedAction.date_action), "EEEE d MMMM yyyy", { locale: fr })} · {TYPE_LABELS[selectedAction.type_action]}</p>
              </SheetHeader>
              <div className="py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Personnes touchées", key: "personnes_touchees" },
                    { label: "Acceptations", key: "conversions" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs text-zinc-500 font-medium block mb-1.5">{f.label}</label>
                      <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 transition-colors"
                        value={deb[f.key]} onChange={e => setDeb({ ...deb, [f.key]: e.target.value })} />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="text-xs text-zinc-500 font-medium block mb-1.5">Temps investi (heures)</label>
                    <input type="number" step="0.5" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 transition-colors"
                      value={deb.temps_investi_heures} onChange={e => setDeb({ ...deb, temps_investi_heures: e.target.value })} />
                  </div>
                </div>

                {liveRatio && (
                  <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-900/10">
                    <p className="text-xs text-blue-400 font-medium mb-1">📊 Ratio en temps réel</p>
                    <p className="text-3xl font-bold text-white">{liveRatio} <span className="text-sm font-normal text-zinc-400">acceptation/heure</span></p>
                  </div>
                )}

                <div>
                  <label className="text-xs text-zinc-500 font-medium block mb-1.5">Notes & observations</label>
                  <textarea rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 resize-none transition-colors"
                    placeholder="Ce qui a fonctionné, les profils touchés, les obstacles..."
                    value={deb.notes_debrief} onChange={e => setDeb({ ...deb, notes_debrief: e.target.value })} />
                </div>

                {!selectedAction.debrief_complete && (
                  <button onClick={() => submitDebrief.mutate({ ...deb, personnes_touchees: parseInt(deb.personnes_touchees)||0, conversions: parseInt(deb.conversions)||0, temps_investi_heures: parseFloat(deb.temps_investi_heures)||0, debrief_complete: true, statut: "termine" })}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-all">
                    <CheckCircle2 className="w-4 h-4" /> Soumettre le Debrief
                  </button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}