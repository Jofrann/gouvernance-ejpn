import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageSquare, Clock, Target, Zap, TrendingUp, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_LABELS = { rue: "🚶 Rue", campus: "🎓 Campus", zoom: "💻 Zoom", porte_a_porte: "🚪 Porte-à-porte", evenement: "🎉 Événement" };
const TYPE_COLORS = { rue: "bg-blue-50 text-blue-700", campus: "bg-violet-50 text-violet-700", zoom: "bg-cyan-50 text-cyan-700", porte_a_porte: "bg-orange-50 text-orange-700", evenement: "bg-pink-50 text-pink-700" };

function getRatioScore(action) {
  if (!action.temps_investi_heures || action.temps_investi_heures === 0) return null;
  return (action.conversions / action.temps_investi_heures).toFixed(2);
}

function getYieldBadge(action) {
  if (!action.debrief_complete) return null;
  const ratio = parseFloat(getRatioScore(action));
  if (isNaN(ratio)) return null;
  if (ratio >= 0.8) return { label: "🔥 Haut Rendement", class: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (ratio >= 0.3) return { label: "✓ Bon Ratio", class: "bg-blue-50 text-blue-700 border-blue-200" };
  return { label: "⚠ Faible Impact", class: "bg-amber-50 text-amber-700 border-amber-200" };
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Zone Debrief</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Post-action · Calcul de ratio immédiat</p>
      </div>

      {/* Pending debriefs */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-amber-700">Debriefs en attente ({pending.length})</h2>
          </div>
          <div className="space-y-2">
            {pending.map((action) => (
              <Card key={action.id} className="border-amber-200 bg-amber-50/30 cursor-pointer hover:shadow-sm" onClick={() => handleOpenDebrief(action)}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{action.titre}</p>
                      <p className="text-xs text-zinc-400">{format(new Date(action.date_action), "d MMM yyyy", { locale: fr })} · {TYPE_LABELS[action.type_action]}</p>
                    </div>
                  </div>
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5 text-xs">
                    <MessageSquare className="w-3.5 h-3.5" /> Débriefer
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed with ratio */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-3">Actions Debriefées</h2>
        {completed.length === 0 ? (
          <Card className="border-zinc-200 bg-white">
            <CardContent className="py-12 text-center text-sm text-zinc-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-zinc-200" />
              Aucun debrief complété
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {completed.map((action) => {
              const ratio = getRatioScore(action);
              const yieldBadge = getYieldBadge(action);
              return (
                <Card key={action.id} className="border-zinc-200 bg-white hover:shadow-sm cursor-pointer transition" onClick={() => handleOpenDebrief(action)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={cn("px-2 py-1 rounded text-xs font-medium", TYPE_COLORS[action.type_action])}>
                          {TYPE_LABELS[action.type_action]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">{action.titre}</p>
                          <p className="text-xs text-zinc-400">{format(new Date(action.date_action), "d MMM yyyy", { locale: fr })}</p>
                        </div>
                      </div>
                      {yieldBadge && (
                        <Badge className={cn("text-[10px] border", yieldBadge.class)}>{yieldBadge.label}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-6 mt-3 pt-3 border-t border-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-xs text-zinc-600"><strong>{action.personnes_touchees}</strong> touchées</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs text-zinc-600"><strong>{action.conversions}</strong> acceptations</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-xs text-zinc-600"><strong>{action.temps_investi_heures}h</strong> investies</span>
                      </div>
                      {ratio && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs font-bold text-blue-700">Ratio: {ratio} acc/h</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Debrief Sheet */}
      <Sheet open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedAction && (
            <>
              <SheetHeader className="pb-4 border-b">
                <SheetTitle>{selectedAction.titre}</SheetTitle>
                <p className="text-xs text-zinc-400">{format(new Date(selectedAction.date_action), "EEEE d MMMM yyyy", { locale: fr })} · {TYPE_LABELS[selectedAction.type_action]}</p>
              </SheetHeader>
              <div className="py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 font-medium">Personnes touchées</label>
                    <Input type="number" className="mt-1 bg-white border-zinc-200" value={debriefData.personnes_touchees} onChange={(e) => setDebriefData({ ...debriefData, personnes_touchees: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-medium">Acceptations / Conversions</label>
                    <Input type="number" className="mt-1 bg-white border-zinc-200" value={debriefData.conversions} onChange={(e) => setDebriefData({ ...debriefData, conversions: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-zinc-500 font-medium">Temps investi (heures)</label>
                    <Input type="number" step="0.5" className="mt-1 bg-white border-zinc-200" value={debriefData.temps_investi_heures} onChange={(e) => setDebriefData({ ...debriefData, temps_investi_heures: e.target.value })} />
                  </div>
                </div>

                {/* Live ratio calculation */}
                {debriefData.conversions && debriefData.temps_investi_heures && parseFloat(debriefData.temps_investi_heures) > 0 && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs text-blue-600 font-medium">📊 Votre ratio en temps réel :</p>
                    <p className="text-2xl font-bold text-blue-800 mt-1">
                      {(parseFloat(debriefData.conversions) / parseFloat(debriefData.temps_investi_heures)).toFixed(2)}
                      <span className="text-sm font-normal text-blue-600 ml-2">acceptation/heure</span>
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs text-zinc-500 font-medium">Notes & observations</label>
                  <Textarea className="mt-1 bg-white border-zinc-200 h-24" placeholder="Ce qui a fonctionné, les profils touchés, les obstacles..." value={debriefData.notes_debrief} onChange={(e) => setDebriefData({ ...debriefData, notes_debrief: e.target.value })} />
                </div>

                {!selectedAction.debrief_complete && (
                  <Button className="w-full bg-zinc-900 hover:bg-zinc-800 gap-2" onClick={handleSubmitDebrief}>
                    <CheckCircle2 className="w-4 h-4" /> Soumettre le Debrief
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}