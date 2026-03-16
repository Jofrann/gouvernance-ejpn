import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageSquare, Clock, Target, Zap, TrendingUp, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

const TYPE_LABELS = { rue: "🚶 Rue", campus: "🎓 Campus", zoom: "💻 Zoom", porte_a_porte: "🚪 Porte-à-porte", evenement: "🎉 Événement" };
const TYPE_COLORS_DARK = {
  rue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  campus: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  zoom: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  porte_a_porte: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  evenement: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

function getRatioScore(action) {
  if (!action.temps_investi_heures || action.temps_investi_heures === 0) return null;
  return (action.conversions / action.temps_investi_heures).toFixed(2);
}

function getYieldBadge(action) {
  if (!action.debrief_complete) return null;
  const ratio = parseFloat(getRatioScore(action));
  if (isNaN(ratio)) return null;
  if (ratio >= 0.8) return { label: "🔥 Haut Rendement", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  if (ratio >= 0.3) return { label: "✓ Bon Ratio", class: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
  return { label: "⚠ Faible Impact", class: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
}

export default function EvangelisationDebriefPage() {
  const queryClient = useQueryClient();
  const [selectedAction, setSelectedAction] = useState(null);
  const [debriefData, setDebriefData] = useState({ personnes_touchees: "", conversions: "", temps_investi_heures: "", notes_debrief: "" });

  const { data: actions = [] } = useQuery({
    queryKey: ["actions"],
    queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 100),
  });

  const handleOpenDebrief = (action) => {
    setSelectedAction(action);
    setDebriefData({
      personnes_touchees: action.personnes_touchees || "",
      conversions: action.conversions || "",
      temps_investi_heures: action.temps_investi_heures || "",
      notes_debrief: action.notes_debrief || "",
    });
  };

  const handleSubmitDebrief = async () => {
    await base44.entities.ActionEvangelisation.update(selectedAction.id, {
      ...debriefData,
      personnes_touchees: parseInt(debriefData.personnes_touchees) || 0,
      conversions: parseInt(debriefData.conversions) || 0,
      temps_investi_heures: parseFloat(debriefData.temps_investi_heures) || 0,
      debrief_complete: true,
      statut: "termine",
    });
    queryClient.invalidateQueries({ queryKey: ["actions"] });
    toast.success("Debrief soumis !");
    setSelectedAction(null);
  };

  const pending = actions.filter((a) => a.statut === "termine" && !a.debrief_complete);
  const completed = actions.filter((a) => a.debrief_complete);

  return (
    <div className="px-6 py-10 max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-[0.25em] mb-1">Évangélisation</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Zone Debrief</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Post-action · Calcul de ratio immédiat</p>
      </div>

      {/* Pending debriefs */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-400">Debriefs en attente ({pending.length})</h2>
          </div>
          <div className="space-y-2">
            {pending.map((action) => (
              <motion.div key={action.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-500/10 transition-all"
                onClick={() => handleOpenDebrief(action)}>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">{action.titre}</p>
                    <p className="text-xs text-zinc-500">{format(new Date(action.date_action), "d MMM yyyy", { locale: fr })} · {TYPE_LABELS[action.type_action]}</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-xs text-amber-300 hover:bg-amber-500/30 flex items-center gap-1.5 transition-all">
                  <MessageSquare className="w-3.5 h-3.5" /> Débriefer
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      <div>
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Actions Debriefées</h2>
        {completed.length === 0 ? (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] py-12 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
            <p className="text-sm text-zinc-600">Aucun debrief complété</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completed.map((action) => {
              const ratio = getRatioScore(action);
              const yieldBadge = getYieldBadge(action);
              return (
                <div key={action.id}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14] p-4 cursor-pointer transition-all"
                  onClick={() => handleOpenDebrief(action)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Badge className={cn("text-[10px] border", TYPE_COLORS_DARK[action.type_action])}>{TYPE_LABELS[action.type_action]}</Badge>
                      <div>
                        <p className="text-sm font-semibold text-white">{action.titre}</p>
                        <p className="text-xs text-zinc-500">{format(new Date(action.date_action), "d MMM yyyy", { locale: fr })}</p>
                      </div>
                    </div>
                    {yieldBadge && <Badge className={cn("text-[10px] border", yieldBadge.class)}>{yieldBadge.label}</Badge>}
                  </div>
                  <div className="flex items-center gap-6 mt-3 pt-3 border-t border-white/[0.05]">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-xs text-zinc-500"><strong className="text-zinc-300">{action.personnes_touchees}</strong> touchées</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs text-zinc-500"><strong className="text-zinc-300">{action.conversions}</strong> acc.</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-xs text-zinc-500"><strong className="text-zinc-300">{action.temps_investi_heures}h</strong></span>
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

      {/* Debrief Sheet */}
      <Sheet open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-[#0d1018] border-white/10 text-white">
          {selectedAction && (
            <>
              <SheetHeader className="pb-4 border-b border-white/10">
                <SheetTitle className="text-white">{selectedAction.titre}</SheetTitle>
                <p className="text-xs text-zinc-500">{format(new Date(selectedAction.date_action), "EEEE d MMMM yyyy", { locale: fr })} · {TYPE_LABELS[selectedAction.type_action]}</p>
              </SheetHeader>
              <div className="py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 font-medium">Personnes touchées</label>
                    <input type="number" className="input-glass mt-1" value={debriefData.personnes_touchees} onChange={(e) => setDebriefData({ ...debriefData, personnes_touchees: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-medium">Acceptations</label>
                    <input type="number" className="input-glass mt-1" value={debriefData.conversions} onChange={(e) => setDebriefData({ ...debriefData, conversions: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-zinc-500 font-medium">Temps investi (heures)</label>
                    <input type="number" step="0.5" className="input-glass mt-1" value={debriefData.temps_investi_heures} onChange={(e) => setDebriefData({ ...debriefData, temps_investi_heures: e.target.value })} />
                  </div>
                </div>

                {debriefData.conversions && debriefData.temps_investi_heures && parseFloat(debriefData.temps_investi_heures) > 0 && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-blue-400 font-medium">📊 Votre ratio en temps réel :</p>
                    <p className="text-2xl font-bold text-blue-300 mt-1">
                      {(parseFloat(debriefData.conversions) / parseFloat(debriefData.temps_investi_heures)).toFixed(2)}
                      <span className="text-sm font-normal text-blue-400 ml-2">acceptation/heure</span>
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs text-zinc-500 font-medium">Notes & observations</label>
                  <textarea className="input-glass mt-1 h-24 resize-none" placeholder="Ce qui a fonctionné, les profils touchés, les obstacles..." value={debriefData.notes_debrief} onChange={(e) => setDebriefData({ ...debriefData, notes_debrief: e.target.value })} />
                </div>

                {!selectedAction.debrief_complete && (
                  <button className="btn-glow-blue w-full py-2.5 flex items-center justify-center gap-2" onClick={handleSubmitDebrief}>
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