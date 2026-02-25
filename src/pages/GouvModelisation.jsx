import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FlaskConical, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function GouvModelisationPage() {
  const [tauxPresence, setTauxPresence] = useState([70]);
  const [tauxFormation, setTauxFormation] = useState([60]);
  const [actionsEvange, setActionsEvange] = useState([4]);
  const [nouvFI, setNouvFI] = useState([0]);
  const [projecting, setProjecting] = useState(false);
  const [projection, setProjection] = useState(null);

  const { data: membres = [] } = useQuery({ queryKey: ["membres-all"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: actions = [] } = useQuery({ queryKey: ["actions"], queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 100) });

  const avgConversionRate = useMemo(() => {
    const debriefed = actions.filter((a) => a.debrief_complete && a.personnes_touchees > 0);
    if (debriefed.length === 0) return 0.15;
    return debriefed.reduce((s, a) => s + (a.conversions / a.personnes_touchees), 0) / debriefed.length;
  }, [actions]);

  const simData = useMemo(() => {
    const currentMembers = membres.length;
    const currentFI = familles.filter((f) => f.status === "active").length;
    const results = [];
    for (let month = 1; month <= 6; month++) {
      const projectedConversions = actionsEvange[0] * month * 30 * avgConversionRate;
      const projectedMembers = Math.round(currentMembers + projectedConversions * (tauxPresence[0] / 100));
      const projectedDisciples = Math.round(projectedMembers * (tauxFormation[0] / 100) * 0.4);
      const projectedFI = currentFI + nouvFI[0];
      results.push({ mois: `M+${month}`, membres: projectedMembers, disciples: projectedDisciples, fi: projectedFI });
    }
    return results;
  }, [membres, familles, actionsEvange, tauxPresence, tauxFormation, nouvFI, avgConversionRate]);

  const handleProject = async () => {
    setProjecting(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `En tant qu'analyste stratégique d'un mouvement de jeunesse chrétienne (EJPN), analyse ces projections et fournis 3 scénarios d'ajustement:

Données actuelles:
- ${membres.length} membres suivis
- ${familles.filter((f) => f.status === "active").length} Familles d'Impact actives
- Taux de conversion évangélisation: ${(avgConversionRate * 100).toFixed(1)}%

Paramètres simulés (sur 6 mois):
- Taux de présence cible: ${tauxPresence[0]}%
- Taux de formation continue: ${tauxFormation[0]}%
- Actions d'évangélisation/mois: ${actionsEvange[0]}
- Nouvelles FI prévues: ${nouvFI[0]}

Projection M+6: ${simData[5]?.membres || 0} membres · ${simData[5]?.disciples || 0} disciples potentiels

Fournis 3 scénarios stratégiques d'ajustement (optimiste, réaliste, conservateur) avec des recommandations concrètes.`,
      response_json_schema: {
        type: "object",
        properties: {
          optimiste: { type: "string" },
          realiste: { type: "string" },
          conservateur: { type: "string" },
          recommandation_principale: { type: "string" }
        }
      }
    });
    setProjection(result);
    setProjecting(false);
    toast.success("Projection générée !");
  };

  const SLIDERS = [
    { label: "Taux de présence cible", value: tauxPresence, set: setTauxPresence, suffix: "%" },
    { label: "Taux de formation continue", value: tauxFormation, set: setTauxFormation, suffix: "%" },
    { label: "Actions évangélisation / mois", value: actionsEvange, set: setActionsEvange, suffix: "", max: 20 },
    { label: "Nouvelles FI à ouvrir", value: nouvFI, set: setNouvFI, suffix: "", max: 10 },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Scénarios d'Ajustement</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Simulation What-If · Projection 6 mois</p>
        </div>
        <Button className="bg-zinc-900 hover:bg-zinc-800 gap-2" onClick={handleProject} disabled={projecting}>
          {projecting ? <><Loader2 className="w-4 h-4 animate-spin" />Analyse...</> : <>✨ Analyser avec l'IA</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sliders */}
        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><FlaskConical className="w-4 h-4" /> Paramètres de Simulation</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {SLIDERS.map(({ label, value, set, suffix, max }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-600">{label}</span>
                  <span className="font-bold text-zinc-900">{value[0]}{suffix}</span>
                </div>
                <Slider value={value} onValueChange={set} min={0} max={max || 100} step={max === 20 || max === 10 ? 1 : 5} className="w-full" />
              </div>
            ))}
            <div className="pt-2 border-t border-zinc-100 text-xs text-zinc-400">
              Taux de conversion évangélisation actuel: {(avgConversionRate * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Projection sur 6 mois</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={simData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ border: "1px solid #e4e4e7", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="membres" fill="#2563eb" radius={[4, 4, 0, 0]} name="Membres" />
                  <Bar dataKey="disciples" fill="#10b981" radius={[4, 4, 0, 0]} name="Disciples" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" />Membres</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />Disciples</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Scenarios */}
      {projection && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">Scénarios Stratégiques — Analyse IA</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[["Optimiste 🚀", projection.optimiste, "border-emerald-200 bg-emerald-50/40"], ["Réaliste ✓", projection.realiste, "border-blue-200 bg-blue-50/40"], ["Conservateur ⚡", projection.conservateur, "border-amber-200 bg-amber-50/40"]].map(([label, content, style]) => (
              <div key={label} className={cn("p-4 rounded-xl border", style)}>
                <p className="text-xs font-bold text-zinc-700 mb-2">{label}</p>
                <p className="text-xs text-zinc-600 leading-relaxed">{content}</p>
              </div>
            ))}
          </div>
          {projection.recommandation_principale && (
            <div className="p-4 rounded-xl bg-zinc-900 text-white">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Recommandation Principale</p>
              <p className="text-sm leading-relaxed">{projection.recommandation_principale}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}