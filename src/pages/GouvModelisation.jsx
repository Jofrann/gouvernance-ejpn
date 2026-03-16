import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Slider } from "@/components/ui/slider";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FlaskConical, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const GlassCard = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
    {children}
  </div>
);

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
      prompt: `En tant qu'analyste stratégique d'un mouvement de jeunesse chrétienne (EJPN), analyse ces projections et fournis 3 scénarios : Données: ${membres.length} membres, ${familles.filter((f) => f.status === "active").length} FI actives, taux de conversion: ${(avgConversionRate * 100).toFixed(1)}%. Paramètres simulés: présence ${tauxPresence[0]}%, formation ${tauxFormation[0]}%, ${actionsEvange[0]} actions/mois, ${nouvFI[0]} nouvelles FI. Projection M+6: ${simData[5]?.membres || 0} membres.`,
      response_json_schema: { type: "object", properties: { optimiste: { type: "string" }, realiste: { type: "string" }, conservateur: { type: "string" }, recommandation_principale: { type: "string" } } }
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
    <div className="px-6 py-10 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Gouvernance</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Scénarios d'Ajustement</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Simulation What-If · Projection 6 mois</p>
        </div>
        <button className="btn-glow-blue flex items-center gap-2 px-4 py-2.5" onClick={handleProject} disabled={projecting}>
          {projecting ? <><Loader2 className="w-4 h-4 animate-spin" />Analyse...</> : <>✨ Analyser avec l'IA</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassCard>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2"><FlaskConical className="w-4 h-4" /> Paramètres de Simulation</p>
          <div className="space-y-5">
            {SLIDERS.map(({ label, value, set, suffix, max }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">{label}</span>
                  <span className="font-bold text-white">{value[0]}{suffix}</span>
                </div>
                <Slider value={value} onValueChange={set} min={0} max={max || 100} step={max === 20 || max === 10 ? 1 : 5} className="w-full" />
              </div>
            ))}
            <div className="pt-2 border-t border-white/[0.07] text-xs text-zinc-500">
              Taux de conversion évangélisation actuel: {(avgConversionRate * 100).toFixed(1)}%
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Projection sur 6 mois</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={simData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px", color: "#fff" }} />
                <Bar dataKey="membres" fill="#2563eb" radius={[4, 4, 0, 0]} name="Membres" />
                <Bar dataKey="disciples" fill="#10b981" radius={[4, 4, 0, 0]} name="Disciples" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" />Membres</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />Disciples</span>
          </div>
        </GlassCard>
      </div>

      {projection && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Scénarios Stratégiques — Analyse IA</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[["Optimiste 🚀", projection.optimiste, "border-emerald-500/20 bg-emerald-500/5"], ["Réaliste ✓", projection.realiste, "border-blue-500/20 bg-blue-500/5"], ["Conservateur ⚡", projection.conservateur, "border-amber-500/20 bg-amber-500/5"]].map(([label, content, style]) => (
              <div key={label} className={cn("p-4 rounded-xl border", style)}>
                <p className="text-xs font-bold text-zinc-300 mb-2">{label}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{content}</p>
              </div>
            ))}
          </div>
          {projection.recommandation_principale && (
            <div className="p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Recommandation Principale</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{projection.recommandation_principale}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}