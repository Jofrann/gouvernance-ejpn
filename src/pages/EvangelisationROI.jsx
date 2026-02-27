import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calculator, TrendingUp, Clock, Award } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1520] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>)}
    </div>
  );
};

export default function EvangelisationROIPage() {
  useTrackActivity("EvangelisationROI");

  const { data: actions = [] } = useQuery({
    queryKey: ["evang-actions"],
    queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 200),
    refetchInterval: 30000,
  });

  const debriefed = actions.filter(a => a.debrief_complete && a.temps_investi_heures > 0);

  const sorted = useMemo(() => [...debriefed].sort((a, b) =>
    (b.conversions / b.temps_investi_heures) - (a.conversions / a.temps_investi_heures)
  ), [debriefed]);

  const cumulativeData = useMemo(() => {
    let cH = 0, cC = 0;
    return [...debriefed].sort((a, b) => new Date(a.date_action) - new Date(b.date_action)).map(a => {
      cH += a.temps_investi_heures || 0;
      cC += a.conversions || 0;
      return { date: format(new Date(a.date_action), "d MMM", { locale: fr }), ratio: cH > 0 ? parseFloat((cC / cH).toFixed(2)) : 0, conversions: cC, heures: parseFloat(cH.toFixed(1)) };
    });
  }, [debriefed]);

  const totalH = debriefed.reduce((s, a) => s + (a.temps_investi_heures || 0), 0);
  const totalConv = debriefed.reduce((s, a) => s + (a.conversions || 0), 0);
  const globalROI = totalH > 0 ? (totalConv / totalH).toFixed(2) : "—";
  const top = sorted[0];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-bold text-white">ROI Tracker</h1>
          <p className="text-xs text-zinc-600">Retour sur investissement temps · Âmes gagnées / Heures investies</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="ai-card rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-900/30 to-blue-900/5 p-5 flex items-center gap-4">
            <Calculator className="w-8 h-8 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-zinc-500">ROI Global</p>
              <p className="text-4xl font-bold text-white">{globalROI}</p>
              <p className="text-xs text-zinc-600 mt-0.5">acceptations / heure</p>
            </div>
          </div>
          <div className="ai-card rounded-xl border border-white/8 p-5 flex items-center gap-4">
            <Clock className="w-7 h-7 text-zinc-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-zinc-500">Heures investies</p>
              <p className="text-3xl font-bold text-white">{totalH.toFixed(1)}<span className="text-lg text-zinc-500">h</span></p>
            </div>
          </div>
          <div className="ai-card rounded-xl border border-emerald-500/20 bg-emerald-900/10 p-5 flex items-center gap-4">
            <TrendingUp className="w-7 h-7 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-zinc-500">Total acceptations</p>
              <p className="text-3xl font-bold text-emerald-400">{totalConv}</p>
            </div>
          </div>
        </div>

        {/* Best action */}
        {top && (
          <div className="ai-card flex items-center gap-4 p-5 rounded-xl border border-amber-500/20 bg-amber-900/10">
            <Award className="w-8 h-8 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">🏆 Meilleure Action</p>
              <p className="text-sm font-bold text-white">{top.titre}</p>
              <p className="text-xs text-zinc-500">{format(new Date(top.date_action), "d MMMM yyyy", { locale: fr })} · {top.conversions} acc. en {top.temps_investi_heures}h = <strong className="text-white">{(top.conversions / top.temps_investi_heures).toFixed(2)} acc/h</strong></p>
            </div>
          </div>
        )}

        {/* ROI Trend Chart */}
        <div className="ai-card rounded-xl border border-white/8 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Évolution du ROI Cumulatif</h3>
          {cumulativeData.length < 2 ? (
            <div className="h-52 flex items-center justify-center">
              <p className="text-xs text-zinc-600 text-center">Complétez au moins 2 debriefs<br/>pour voir l'évolution</p>
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#52525b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#52525b" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="ratio" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} name="ROI (acc/h)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Ranking */}
        <div className="ai-card rounded-xl border border-white/8 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white">Classement par ROI</h3>
          </div>
          {sorted.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-zinc-600">Aucun debrief complété avec données de temps</p>
            </div>
          ) : (
            <div className="divide-y divide-white/3">
              {sorted.map((a, i) => {
                const roi = (a.conversions / a.temps_investi_heures).toFixed(2);
                return (
                  <div key={a.id} className={cn("flex items-center gap-3 px-5 py-3.5 hover:bg-white/3 transition-colors", i === 0 && "bg-amber-900/10")}>
                    <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                      i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-zinc-700 text-zinc-300" : i === 2 ? "bg-orange-900/40 text-orange-400" : "bg-zinc-800 text-zinc-500")}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{a.titre}</p>
                      <p className="text-xs text-zinc-600">{format(new Date(a.date_action), "d MMM yyyy", { locale: fr })} · {a.personnes_touchees} touchées · {a.conversions} acc. · {a.temps_investi_heures}h</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-blue-400">{roi} acc/h</p>
                      <span className={cn("text-[10px] border px-2 py-0.5 rounded-md",
                        parseFloat(roi) >= 0.8 ? "text-emerald-400 bg-emerald-900/30 border-emerald-500/30" :
                        parseFloat(roi) >= 0.3 ? "text-blue-400 bg-blue-900/30 border-blue-500/30" :
                        "text-amber-400 bg-amber-900/30 border-amber-500/30"
                      )}>{parseFloat(roi) >= 0.8 ? "🔥 Haut Rendement" : parseFloat(roi) >= 0.3 ? "✓ Correct" : "⚠ Faible"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}