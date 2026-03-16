import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calculator, TrendingUp, Clock, Award } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const GlassCard = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
    {children}
  </div>
);

export default function EvangelisationROIPage() {
  const { data: actions = [] } = useQuery({
    queryKey: ["actions"],
    queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 200),
  });

  const debriefed = actions.filter((a) => a.debrief_complete && a.temps_investi_heures > 0);

  const sorted = useMemo(() => [...debriefed].sort((a, b) => {
    const ra = (a.conversions || 0) / a.temps_investi_heures;
    const rb = (b.conversions || 0) / b.temps_investi_heures;
    return rb - ra;
  }), [debriefed]);

  const cumulativeData = useMemo(() => {
    let cHeures = 0, cConv = 0;
    return [...debriefed].sort((a, b) => new Date(a.date_action) - new Date(b.date_action)).map((a) => {
      cHeures += a.temps_investi_heures || 0;
      cConv += a.conversions || 0;
      return { date: format(new Date(a.date_action), "d MMM", { locale: fr }), ratio: cHeures > 0 ? parseFloat((cConv / cHeures).toFixed(2)) : 0, conversions: cConv, heures: cHeures };
    });
  }, [debriefed]);

  const totalHeures = debriefed.reduce((s, a) => s + (a.temps_investi_heures || 0), 0);
  const totalConv = debriefed.reduce((s, a) => s + (a.conversions || 0), 0);
  const globalROI = totalHeures > 0 ? (totalConv / totalHeures).toFixed(2) : "—";
  const top = sorted[0];

  return (
    <div className="px-6 py-10 max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-[0.25em] mb-1">Évangélisation</p>
        <h1 className="text-2xl font-black text-white tracking-tight">ROI Tracker</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Retour sur investissement temps · Âmes gagnées / Heures investies</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 flex items-center gap-3">
          <Calculator className="w-6 h-6 text-blue-400" />
          <div>
            <p className="text-xs text-zinc-500">ROI Global</p>
            <p className="text-4xl font-bold text-white">{globalROI}</p>
            <p className="text-xs text-zinc-500 mt-0.5">acceptations / heure</p>
          </div>
        </div>
        <GlassCard className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-zinc-500" />
          <div>
            <p className="text-xs text-zinc-500">Heures investies</p>
            <p className="text-3xl font-bold text-white">{totalHeures.toFixed(1)}h</p>
          </div>
        </GlassCard>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-emerald-400" />
          <div>
            <p className="text-xs text-zinc-500">Total acceptations</p>
            <p className="text-3xl font-bold text-emerald-400">{totalConv}</p>
          </div>
        </div>
      </div>

      {/* Best action */}
      {top && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-4">
          <Award className="w-8 h-8 text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">🏆 Meilleure Action</p>
            <p className="text-sm font-bold text-white">{top.titre}</p>
            <p className="text-xs text-zinc-500">{format(new Date(top.date_action), "d MMMM yyyy", { locale: fr })} · {top.conversions} acc. en {top.temps_investi_heures}h = <strong className="text-amber-400">{(top.conversions / top.temps_investi_heures).toFixed(2)} acc/h</strong></p>
          </div>
        </div>
      )}

      {/* ROI trend chart */}
      <GlassCard>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Évolution du ROI Cumulatif</p>
        {cumulativeData.length < 2 ? (
          <p className="text-sm text-zinc-600 py-12 text-center">Complétez au moins 2 debriefs pour voir l'évolution</p>
        ) : (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px", color: "#fff" }} />
                <Line type="monotone" dataKey="ratio" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb", r: 4 }} name="ROI (acc/h)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      {/* Ranking table */}
      <GlassCard>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Classement des Actions par ROI</p>
        {sorted.length === 0 ? (
          <p className="text-sm text-zinc-600 py-8 text-center">Aucun debrief complété avec données de temps</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((a, i) => {
              const roi = (a.conversions / a.temps_investi_heures).toFixed(2);
              const isTop = i === 0;
              return (
                <div key={a.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all",
                  isTop ? "border-amber-500/20 bg-amber-500/5" : "border-white/[0.04] hover:bg-white/[0.02]")}>
                  <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    i === 0 ? "bg-amber-500/20 text-amber-300" : i === 1 ? "bg-white/10 text-zinc-400" : i === 2 ? "bg-orange-500/10 text-orange-400" : "bg-white/5 text-zinc-500")}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{a.titre}</p>
                    <p className="text-xs text-zinc-600">{format(new Date(a.date_action), "d MMM yyyy", { locale: fr })} · {a.personnes_touchees} touchées · {a.conversions} acc. · {a.temps_investi_heures}h</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-blue-400">{roi} acc/h</p>
                    <Badge className={cn("text-[10px] border mt-0.5",
                      parseFloat(roi) >= 0.8 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      parseFloat(roi) >= 0.3 ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                      "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                      {parseFloat(roi) >= 0.8 ? "🔥 Haut Rendement" : parseFloat(roi) >= 0.3 ? "✓ Correct" : "⚠ Faible"}
                    </Badge>
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