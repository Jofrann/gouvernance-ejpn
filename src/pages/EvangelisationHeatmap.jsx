import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Flame, Target, Zap, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const TYPE_LABELS = { rue: "Rue", campus: "Campus", zoom: "Zoom", porte_a_porte: "Porte-à-porte", evenement: "Événement" };
const TYPE_COLORS_CHART = { rue: "#3b82f6", campus: "#7c3aed", zoom: "#0891b2", porte_a_porte: "#ea580c", evenement: "#db2777" };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1520] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>)}
    </div>
  );
};

export default function EvangelisationHeatmapPage() {
  useTrackActivity("EvangelisationHeatmap");

  const { data: actions = [] } = useQuery({
    queryKey: ["evang-actions"],
    queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 200),
    refetchInterval: 30000,
  });

  const debriefed = actions.filter(a => a.debrief_complete);

  const byType = useMemo(() =>
    Object.entries(TYPE_LABELS).map(([type, label]) => {
      const ta = debriefed.filter(a => a.type_action === type);
      const totalTouched = ta.reduce((s, a) => s + (a.personnes_touchees || 0), 0);
      const totalConv = ta.reduce((s, a) => s + (a.conversions || 0), 0);
      const totalH = ta.reduce((s, a) => s + (a.temps_investi_heures || 0), 0);
      const ratio = totalH > 0 ? parseFloat((totalConv / totalH).toFixed(2)) : 0;
      return { type, label, count: ta.length, totalTouched, totalConv, totalH, ratio };
    }).sort((a, b) => b.ratio - a.ratio),
  [debriefed]);

  const byMonth = useMemo(() => {
    const months = {};
    debriefed.forEach(a => {
      const m = a.date_action?.slice(0, 7);
      if (!m) return;
      if (!months[m]) months[m] = { mois: m, conversions: 0, touchees: 0, count: 0 };
      months[m].conversions += a.conversions || 0;
      months[m].touchees += a.personnes_touchees || 0;
      months[m].count++;
    });
    return Object.values(months).sort((a, b) => a.mois.localeCompare(b.mois)).slice(-6).map(m => ({
      ...m, label: format(new Date(m.mois + "-01"), "MMM", { locale: fr }),
    }));
  }, [debriefed]);

  const totalConv = debriefed.reduce((s, a) => s + (a.conversions || 0), 0);
  const totalTouched = debriefed.reduce((s, a) => s + (a.personnes_touchees || 0), 0);
  const totalH = debriefed.reduce((s, a) => s + (a.temps_investi_heures || 0), 0);
  const globalRatio = totalH > 0 ? (totalConv / totalH).toFixed(2) : "—";

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-bold text-white">Impact & Rendement</h1>
          <p className="text-xs text-zinc-600">Analyse de performance par type d'action évangélisation</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Actions debriefées", value: debriefed.length, icon: Target, color: "text-white", bg: "border-white/8" },
            { label: "Personnes touchées", value: totalTouched, icon: Zap, color: "text-blue-400", bg: "border-blue-500/20 bg-blue-900/10" },
            { label: "Acceptations", value: totalConv, icon: Flame, color: "text-emerald-400", bg: "border-emerald-500/20 bg-emerald-900/10" },
            { label: "Ratio global", value: `${globalRatio} acc/h`, icon: Clock, color: "text-amber-400", bg: "border-amber-500/20 bg-amber-900/10" },
          ].map(k => (
            <div key={k.label} className={cn("ai-card rounded-xl border p-4 flex items-center gap-3", k.bg)}>
              <k.icon className={cn("w-5 h-5 flex-shrink-0", k.color)} />
              <div>
                <p className="text-xs text-zinc-600">{k.label}</p>
                <p className={cn("text-xl font-bold", k.color)}>{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Rendement par type */}
          <div className="ai-card rounded-xl border border-white/8 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Rendement par Type d'Action</h3>
            <div className="space-y-4">
              {byType.filter(t => t.count > 0).map((t, i) => (
                <div key={t.type}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {i === 0 && <span>🔥</span>}
                      <span className="text-sm font-medium text-white">{t.label}</span>
                      <span className="text-xs text-zinc-600">{t.count} action{t.count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-zinc-500">{t.totalConv} acc.</span>
                      <span className="font-bold text-blue-400">{t.ratio} acc/h</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${byType[0].ratio > 0 ? (t.ratio / byType[0].ratio) * 100 : 0}%`, backgroundColor: TYPE_COLORS_CHART[t.type] }} />
                  </div>
                </div>
              ))}
              {byType.every(t => t.count === 0) && <p className="text-sm text-zinc-600 py-6 text-center">Aucune action debriefée</p>}
            </div>
          </div>

          {/* Monthly trend */}
          <div className="ai-card rounded-xl border border-white/8 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Évolution Mensuelle</h3>
            {byMonth.length === 0 ? (
              <div className="h-52 flex items-center justify-center">
                <p className="text-xs text-zinc-600 text-center">Pas encore de données</p>
              </div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byMonth} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#52525b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#52525b" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="conversions" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Acceptations" />
                    <Bar dataKey="touchees" fill="rgba(255,255,255,0.08)" radius={[4, 4, 0, 0]} name="Touchées" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Detailed table */}
        <div className="ai-card rounded-xl border border-white/8 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white">Tableau Détaillé par Type</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {["Type", "Actions", "Touchées", "Acceptations", "Tx Conv.", "Ratio", "Classement"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/3">
                {byType.map((t, i) => (
                  <tr key={t.type} className="hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3 font-medium text-white">{t.label}</td>
                    <td className="px-5 py-3 text-zinc-500">{t.count}</td>
                    <td className="px-5 py-3 text-zinc-500">{t.totalTouched}</td>
                    <td className="px-5 py-3 font-medium text-white">{t.totalConv}</td>
                    <td className="px-5 py-3 text-zinc-500">{t.totalTouched > 0 ? `${((t.totalConv / t.totalTouched) * 100).toFixed(1)}%` : "—"}</td>
                    <td className="px-5 py-3 font-bold text-blue-400">{t.ratio}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-[10px] border px-2 py-0.5 rounded-md",
                        i === 0 ? "text-emerald-400 bg-emerald-900/30 border-emerald-500/30" :
                        i === byType.length - 1 && byType.length > 1 ? "text-amber-400 bg-amber-900/30 border-amber-500/30" :
                        "text-zinc-400 bg-zinc-800 border-zinc-700"
                      )}>{i === 0 ? "🔥 Top" : i === byType.length - 1 && byType.length > 1 ? "⚠ Faible" : "✓"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}