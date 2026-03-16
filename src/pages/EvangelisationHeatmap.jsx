import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Flame, Target, Zap, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const TYPE_LABELS = { rue: "Rue", campus: "Campus", zoom: "Zoom", porte_a_porte: "Porte-à-porte", evenement: "Événement" };
const TYPE_COLORS = { rue: "#2563eb", campus: "#7c3aed", zoom: "#0891b2", porte_a_porte: "#ea580c", evenement: "#db2777" };

const GlassCard = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
    {children}
  </div>
);

export default function EvangelisationHeatmapPage() {
  const { data: actions = [] } = useQuery({
    queryKey: ["actions"],
    queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 200),
  });

  const debriefed = actions.filter((a) => a.debrief_complete);

  const byType = useMemo(() => {
    return Object.entries(TYPE_LABELS).map(([type, label]) => {
      const typeActions = debriefed.filter((a) => a.type_action === type);
      const totalTouched = typeActions.reduce((s, a) => s + (a.personnes_touchees || 0), 0);
      const totalConversions = typeActions.reduce((s, a) => s + (a.conversions || 0), 0);
      const totalHeures = typeActions.reduce((s, a) => s + (a.temps_investi_heures || 0), 0);
      const ratio = totalHeures > 0 ? (totalConversions / totalHeures).toFixed(2) : 0;
      return { type, label, count: typeActions.length, totalTouched, totalConversions, totalHeures, ratio: parseFloat(ratio) };
    }).sort((a, b) => b.ratio - a.ratio);
  }, [debriefed]);

  const byMonth = useMemo(() => {
    const months = {};
    debriefed.forEach((a) => {
      const m = a.date_action?.slice(0, 7);
      if (!m) return;
      if (!months[m]) months[m] = { mois: m, conversions: 0, touchees: 0, count: 0 };
      months[m].conversions += a.conversions || 0;
      months[m].touchees += a.personnes_touchees || 0;
      months[m].count++;
    });
    return Object.values(months).sort((a, b) => a.mois.localeCompare(b.mois)).slice(-6).map((m) => ({
      ...m,
      label: format(new Date(m.mois + "-01"), "MMM", { locale: fr }),
    }));
  }, [debriefed]);

  const totalConversions = debriefed.reduce((s, a) => s + (a.conversions || 0), 0);
  const totalTouched = debriefed.reduce((s, a) => s + (a.personnes_touchees || 0), 0);
  const totalHeures = debriefed.reduce((s, a) => s + (a.temps_investi_heures || 0), 0);
  const globalRatio = totalHeures > 0 ? (totalConversions / totalHeures).toFixed(2) : "—";

  return (
    <div className="px-6 py-10 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-[0.25em] mb-1">Évangélisation</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Impact & Rendement</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Analyse de performance par type d'action</p>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Actions debriefées", value: debriefed.length, icon: Target, color: "text-zinc-400" },
          { label: "Personnes touchées", value: totalTouched, icon: Zap, color: "text-blue-400" },
          { label: "Acceptations", value: totalConversions, icon: Flame, color: "text-emerald-400" },
          { label: "Ratio global", value: `${globalRatio} acc/h`, icon: Clock, color: "text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <GlassCard key={label}>
            <div className="flex items-center gap-3">
              <Icon className={cn("w-5 h-5", color)} />
              <div><p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p><p className={cn("text-xl font-black", color)}>{value}</p></div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Rendement par Type d'Action</p>
          <div className="space-y-3">
            {byType.map((t, i) => (
              <div key={t.type} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {i === 0 && <span>🔥</span>}
                    <span className="text-sm font-medium text-zinc-300">{t.label}</span>
                    <span className="text-xs text-zinc-600">{t.count} action{t.count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-zinc-500">{t.totalConversions} acc.</span>
                    <span className="font-bold text-blue-400">{t.ratio} acc/h</span>
                  </div>
                </div>
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${byType[0].ratio > 0 ? (t.ratio / byType[0].ratio) * 100 : 0}%`, backgroundColor: TYPE_COLORS[t.type] }} />
                </div>
              </div>
            ))}
            {byType.every((t) => t.count === 0) && <p className="text-sm text-zinc-600 py-6 text-center">Aucune action debriefée</p>}
          </div>
        </GlassCard>

        <GlassCard>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Évolution Mensuelle</p>
          {byMonth.length === 0 ? (
            <p className="text-sm text-zinc-600 py-12 text-center">Pas encore de données</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px", color: "#fff" }} />
                  <Bar dataKey="conversions" fill="#2563eb" radius={[4, 4, 0, 0]} name="Acceptations" />
                  <Bar dataKey="touchees" fill="rgba(255,255,255,0.08)" radius={[4, 4, 0, 0]} name="Touchées" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Detailed table */}
      <GlassCard>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Tableau Détaillé par Type</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {["Type", "Actions", "Touchées", "Acceptations", "Tx Conv.", "Ratio (acc/h)", ""].map((h) => (
                <th key={h} className="text-left py-2 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byType.map((t, i) => (
              <tr key={t.type} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="py-2.5 font-medium text-zinc-200">{t.label}</td>
                <td className="py-2.5 text-zinc-500">{t.count}</td>
                <td className="py-2.5 text-zinc-500">{t.totalTouched}</td>
                <td className="py-2.5 font-medium text-white">{t.totalConversions}</td>
                <td className="py-2.5 text-zinc-500">{t.totalTouched > 0 ? `${((t.totalConversions / t.totalTouched) * 100).toFixed(1)}%` : "—"}</td>
                <td className="py-2.5 font-bold text-blue-400">{t.ratio}</td>
                <td className="py-2.5">
                  <Badge className={cn("text-[10px] border", i === 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : i === byType.length - 1 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-white/5 text-zinc-500 border-white/10")}>
                    {i === 0 ? "🔥 Top" : i === byType.length - 1 ? "⚠ Faible" : "✓"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}