import React, { useMemo, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Flame, Target, Zap, Clock, Calculator, TrendingUp, Award } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const TYPE_LABELS = { rue: "Rue", campus: "Campus", zoom: "Zoom", porte_a_porte: "Porte-à-porte", evenement: "Événement" };
const TYPE_COLORS = { rue: "#2563eb", campus: "#7c3aed", zoom: "#0891b2", porte_a_porte: "#ea580c", evenement: "#db2777" };

const GlassCard = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
    {children}
  </div>
);

export default function EvangelisationAnalysePage() {
  useTrackActivity("EvangelisationAnalyse");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("impact");

  const { data: actions = [] } = useQuery({
    queryKey: ["actions-analyse"],
    queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 200),
  });

  // Real-time subscriptions
  useEffect(() => {
    const unsub = base44.entities.ActionEvangelisation.subscribe(() => queryClient.invalidateQueries({ queryKey: ["actions-analyse"] }));
    return unsub;
  }, [queryClient]);

  const debriefed = actions.filter(a => a.debrief_complete);
  const debriefedWithTime = debriefed.filter(a => a.temps_investi_heures > 0);

  /* ── Impact data ── */
  const byType = useMemo(() => {
    return Object.entries(TYPE_LABELS).map(([type, label]) => {
      const typeActions = debriefed.filter(a => a.type_action === type);
      const totalTouched = typeActions.reduce((s, a) => s + (a.personnes_touchees || 0), 0);
      const totalConversions = typeActions.reduce((s, a) => s + (a.conversions || 0), 0);
      const totalHeures = typeActions.reduce((s, a) => s + (a.temps_investi_heures || 0), 0);
      const ratio = totalHeures > 0 ? parseFloat((totalConversions / totalHeures).toFixed(2)) : 0;
      return { type, label, count: typeActions.length, totalTouched, totalConversions, totalHeures, ratio };
    }).sort((a, b) => b.ratio - a.ratio);
  }, [debriefed]);

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

  /* ── ROI data ── */
  const sorted = useMemo(() => [...debriefedWithTime].sort((a, b) => {
    const ra = (a.conversions || 0) / a.temps_investi_heures;
    const rb = (b.conversions || 0) / b.temps_investi_heures;
    return rb - ra;
  }), [debriefedWithTime]);

  const cumulativeData = useMemo(() => {
    let cH = 0, cC = 0;
    return [...debriefedWithTime].sort((a, b) => new Date(a.date_action) - new Date(b.date_action)).map(a => {
      cH += a.temps_investi_heures || 0;
      cC += a.conversions || 0;
      return { date: format(new Date(a.date_action), "d MMM", { locale: fr }), ratio: cH > 0 ? parseFloat((cC / cH).toFixed(2)) : 0, conversions: cC, heures: cH };
    });
  }, [debriefedWithTime]);

  const totalConversions = debriefed.reduce((s, a) => s + (a.conversions || 0), 0);
  const totalTouched = debriefed.reduce((s, a) => s + (a.personnes_touchees || 0), 0);
  const totalHeures = debriefedWithTime.reduce((s, a) => s + (a.temps_investi_heures || 0), 0);
  const globalROI = totalHeures > 0 ? (totalConversions / totalHeures).toFixed(2) : "—";
  const top = sorted[0];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-[0.25em] mb-1">Évangélisation</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Analyse des Résultats</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Impact & Rendement · ROI Tracker</p>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Actions debriefées", value: debriefed.length, icon: Target, color: "text-zinc-400" },
          { label: "Personnes touchées", value: totalTouched, icon: Zap, color: "text-blue-400" },
          { label: "Acceptations", value: totalConversions, icon: Flame, color: "text-emerald-400" },
          { label: "ROI Global", value: `${globalROI} acc/h`, icon: Calculator, color: "text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <GlassCard key={label}>
            <div className="flex items-center gap-3">
              <Icon className={cn("w-5 h-5", color)} />
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
                <p className={cn("text-2xl font-black", color)}>{value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
        {[
          { key: "impact", label: "Impact & Rendement" },
          { key: "roi", label: "ROI Tracker" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-medium transition-all",
              tab === t.key ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Impact */}
      {tab === "impact" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Rendement par Type d'Action</p>
              <div className="space-y-3">
                {byType.map((t, i) => (
                  <div key={t.type} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {i === 0 && <span>🔥</span>}
                        <span className="text-sm text-zinc-300">{t.label}</span>
                        <span className="text-xs text-zinc-600">{t.count} action{t.count !== 1 ? "s" : ""}</span>
                      </div>
                      <span className="text-xs font-bold text-blue-400">{t.ratio} acc/h</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${byType[0].ratio > 0 ? (t.ratio / byType[0].ratio) * 100 : 0}%`, backgroundColor: TYPE_COLORS[t.type] }} />
                    </div>
                  </div>
                ))}
                {byType.every(t => t.count === 0) && <p className="text-sm text-zinc-600 py-6 text-center">Aucune action debriefée</p>}
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

          {/* Detail table */}
          <GlassCard>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Tableau Détaillé par Type</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Type", "Actions", "Touchées", "Acceptations", "Tx Conv.", "Ratio", ""].map(h => (
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
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                          i === 0 ? "bg-emerald-500/10 text-emerald-400" : i === byType.length - 1 ? "bg-amber-500/10 text-amber-400" : "bg-white/5 text-zinc-500")}>
                          {i === 0 ? "🔥 Top" : i === byType.length - 1 ? "⚠ Faible" : "✓"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Tab: ROI */}
      {tab === "roi" && (
        <div className="space-y-4">
          {top && (
            <GlassCard className="border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-4">
                <Award className="w-8 h-8 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">🏆 Meilleure Action</p>
                  <p className="text-sm font-bold text-white">{top.titre}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {format(new Date(top.date_action), "d MMMM yyyy", { locale: fr })} · {top.conversions} acc. en {top.temps_investi_heures}h
                    = <strong className="text-amber-400">{(top.conversions / top.temps_investi_heures).toFixed(2)} acc/h</strong>
                  </p>
                </div>
              </div>
            </GlassCard>
          )}

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

          <GlassCard>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Classement des Actions par ROI</p>
            {sorted.length === 0 ? (
              <p className="text-sm text-zinc-600 py-8 text-center">Aucun debrief complété avec données de temps</p>
            ) : (
              <div className="space-y-2">
                {sorted.map((a, i) => {
                  const roi = (a.conversions / a.temps_investi_heures).toFixed(2);
                  return (
                    <div key={a.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all",
                      i === 0 ? "border-amber-500/20 bg-amber-500/5" : "border-white/[0.04] hover:bg-white/[0.02]")}>
                      <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                        i === 0 ? "bg-amber-500/20 text-amber-300" : i === 1 ? "bg-white/10 text-zinc-400" : "bg-white/5 text-zinc-600")}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{a.titre}</p>
                        <p className="text-xs text-zinc-600">{format(new Date(a.date_action), "d MMM yyyy", { locale: fr })} · {a.personnes_touchees} touchées · {a.conversions} acc. · {a.temps_investi_heures}h</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-blue-400">{roi} acc/h</p>
                        <span className={cn("text-[10px] font-semibold",
                          parseFloat(roi) >= 0.8 ? "text-emerald-400" : parseFloat(roi) >= 0.3 ? "text-blue-400" : "text-amber-400")}>
                          {parseFloat(roi) >= 0.8 ? "🔥 Haut" : parseFloat(roi) >= 0.3 ? "✓ Correct" : "⚠ Faible"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}