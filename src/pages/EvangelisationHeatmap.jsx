import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Flame, Target, Zap, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const TYPE_LABELS = { rue: "Rue", campus: "Campus", zoom: "Zoom", porte_a_porte: "Porte-à-porte", evenement: "Événement" };
const TYPE_COLORS = { rue: "#2563eb", campus: "#7c3aed", zoom: "#0891b2", porte_a_porte: "#ea580c", evenement: "#db2777" };

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
  const txConversion = totalTouched > 0 ? ((totalConversions / totalTouched) * 100).toFixed(1) : "—";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Impact & Rendement</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Analyse de performance par type d'action</p>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Actions debriefées", value: debriefed.length, icon: Target, color: "text-zinc-700" },
          { label: "Personnes touchées", value: totalTouched, icon: Zap, color: "text-blue-600" },
          { label: "Acceptations", value: totalConversions, icon: Flame, color: "text-emerald-600" },
          { label: "Ratio global", value: `${globalRatio} acc/h`, icon: Clock, color: "text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-zinc-200 bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={cn("w-5 h-5 flex-shrink-0", color)} />
              <div><p className="text-xs text-zinc-400">{label}</p><p className={cn("text-lg font-bold", color)}>{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Heatmap by type */}
        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Rendement par Type d'Action</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {byType.map((t, i) => (
                <div key={t.type} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {i === 0 && <span>🔥</span>}
                      <span className="text-sm font-medium text-zinc-700">{t.label}</span>
                      <span className="text-xs text-zinc-400">{t.count} action{t.count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-zinc-500">{t.totalConversions} acc.</span>
                      <span className="font-bold text-blue-700">{t.ratio} acc/h</span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${byType[0].ratio > 0 ? (t.ratio / byType[0].ratio) * 100 : 0}%`, backgroundColor: TYPE_COLORS[t.type] }} />
                  </div>
                </div>
              ))}
              {byType.every((t) => t.count === 0) && <p className="text-sm text-zinc-400 py-6 text-center">Aucune action debriefée</p>}
            </div>
          </CardContent>
        </Card>

        {/* Monthly trend */}
        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Évolution Mensuelle</CardTitle></CardHeader>
          <CardContent>
            {byMonth.length === 0 ? (
              <p className="text-sm text-zinc-400 py-12 text-center">Pas encore de données</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ border: "1px solid #e4e4e7", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="conversions" fill="#2563eb" radius={[4, 4, 0, 0]} name="Acceptations" />
                    <Bar dataKey="touchees" fill="#e4e4e7" radius={[4, 4, 0, 0]} name="Touchées" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed table */}
      <Card className="border-zinc-200 bg-white">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tableau Détaillé par Type</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-100">{["Type", "Actions", "Touchées", "Acceptations", "Tx Conversion", "Ratio (acc/h)", "Classement"].map((h) => <th key={h} className="text-left py-2 text-xs text-zinc-400 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {byType.map((t, i) => (
                <tr key={t.type} className="border-b border-zinc-50 hover:bg-zinc-50">
                  <td className="py-2.5 font-medium text-zinc-900">{t.label}</td>
                  <td className="py-2.5 text-zinc-500">{t.count}</td>
                  <td className="py-2.5 text-zinc-500">{t.totalTouched}</td>
                  <td className="py-2.5 font-medium text-zinc-900">{t.totalConversions}</td>
                  <td className="py-2.5 text-zinc-500">{t.totalTouched > 0 ? `${((t.totalConversions / t.totalTouched) * 100).toFixed(1)}%` : "—"}</td>
                  <td className="py-2.5 font-bold text-blue-700">{t.ratio}</td>
                  <td className="py-2.5"><Badge className={cn("text-[10px] border", i === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : i === byType.length - 1 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-zinc-50 text-zinc-600 border-zinc-200")}>{i === 0 ? "🔥 Top" : i === byType.length - 1 ? "⚠ Faible" : "✓"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}