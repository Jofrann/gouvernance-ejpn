import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, TrendingDown, CheckCircle2, Filter, RefreshCcw, BarChart3 } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import AnomalyCard from "@/components/gouvernance/AnomalyCard";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";
import { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";
import { cn } from "@/lib/utils";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1520] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>)}
    </div>
  );
};

export default function GouvAnomaliesPage() {
  useTrackActivity("GouvAnomalies");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterPole, setFilterPole] = useState("all");

  const { data: familles = [], refetch: rFamilles } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: membres = [], refetch: rMembres } = useQuery({ queryKey: ["membres-all"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: saisies = [], refetch: rSaisies } = useQuery({ queryKey: ["all-saisies"], queryFn: () => base44.entities.CliniqueSaisie.list("-created_date", 1000) });
  const { data: okrs = [], refetch: rOkrs } = useQuery({ queryKey: ["okrs"], queryFn: () => base44.entities.OKR.list() });
  const { data: actions = [], refetch: rActions } = useQuery({ queryKey: ["evang-actions"], queryFn: () => base44.entities.ActionEvangelisation.list() });

  const handleRefresh = () => { rFamilles(); rMembres(); rSaisies(); rOkrs(); rActions(); };

  const anomalies = useMemo(() => {
    const results = [];
    familles.forEach(fi => {
      const fiMembres = membres.filter(m => m.famille_impact_id === fi.id);
      const fiSaisies = saisies.filter(s => s.famille_impact_id === fi.id);
      if (fiMembres.length > 0 && fiSaisies.length === 0) {
        results.push({ id: `fi-nosaisie-${fi.id}`, entity_name: fi.name, pole: "Familles d'Impact", severity: "critique", description: `Aucune saisie clinique. ${fiMembres.length} membres sans suivi.`, metric_value: "0", metric_target: fiMembres.length.toString(), metric_label: "saisies vs membres" });
      }
      if (fiSaisies.length > 0) {
        const avg = fiSaisies.reduce((acc, s) => {
          const notes = [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter(n => n != null);
          return acc + (notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : 0);
        }, 0) / fiSaisies.length;
        if (avg < 4) results.push({ id: `fi-critical-${fi.id}`, entity_name: fi.name, pole: "Familles d'Impact", severity: "critique", description: `Moyenne de santé critique à ${avg.toFixed(1)}/10. Intervention immédiate requise.`, metric_value: avg.toFixed(1), metric_target: "5.0", metric_label: "moyenne santé" });
        else if (avg < 6) results.push({ id: `fi-alerte-${fi.id}`, entity_name: fi.name, pole: "Familles d'Impact", severity: "alerte", description: `Moyenne de santé en déclin à ${avg.toFixed(1)}/10. Suivi rapproché recommandé.`, metric_value: avg.toFixed(1), metric_target: "7.0", metric_label: "moyenne santé" });
        const pr = fiSaisies.filter(s => s.presence).length / fiSaisies.length;
        if (pr < 0.5) results.push({ id: `fi-presence-${fi.id}`, entity_name: fi.name, pole: "Familles d'Impact", severity: pr < 0.3 ? "critique" : "alerte", description: `Taux de présence à ${Math.round(pr * 100)}%. Plus de la moitié des membres sont absents.`, metric_value: `${Math.round(pr * 100)}%`, metric_target: "70%", metric_label: "taux de présence" });
      }
    });
    okrs.filter(o => o.statut === "en_cours").forEach(okr => {
      if (okr.objectif_cible > 0) {
        const prog = (okr.valeur_actuelle / okr.objectif_cible) * 100;
        if (prog < 25) results.push({ id: `okr-${okr.id}`, entity_name: okr.titre, pole: okr.pole?.replace(/_/g, " ") || "Général", severity: "critique", description: `OKR en retard sévère (${prog.toFixed(0)}% d'avancement).`, metric_value: okr.valeur_actuelle?.toString() || "0", metric_target: okr.objectif_cible?.toString() || "—", metric_label: okr.unite || "progression" });
        else if (prog < 50) results.push({ id: `okr2-${okr.id}`, entity_name: okr.titre, pole: okr.pole?.replace(/_/g, " ") || "Général", severity: "alerte", description: `OKR à surveiller (${prog.toFixed(0)}% d'avancement).`, metric_value: okr.valeur_actuelle?.toString() || "0", metric_target: okr.objectif_cible?.toString() || "—", metric_label: okr.unite || "progression" });
      }
    });
    actions.filter(a => a.statut === "termine" && !a.debrief_complete).forEach(action => {
      results.push({ id: `ev-${action.id}`, entity_name: action.titre, pole: "Évangélisation", severity: "alerte", description: "Action terminée sans debrief. Données terrain manquantes.", metric_value: "0", metric_target: "1", metric_label: "debrief complété" });
    });
    return results;
  }, [familles, membres, saisies, okrs, actions]);

  const radarData = useMemo(() => [
    { axis: "Familles d'Impact", value: Math.max(0, 10 - anomalies.filter(a => a.pole === "Familles d'Impact" && a.severity === "critique").length * 3 - anomalies.filter(a => a.pole === "Familles d'Impact" && a.severity === "alerte").length), fullMark: 10 },
    { axis: "Formation", value: okrs.filter(o => o.pole === "formation" && o.statut === "atteint").length > 0 ? 8 : 5, fullMark: 10 },
    { axis: "Évangélisation", value: Math.max(0, 10 - anomalies.filter(a => a.pole === "Évangélisation").length * 2), fullMark: 10 },
    { axis: "Communication", value: 7, fullMark: 10 },
  ], [anomalies, okrs]);

  const filtered = anomalies.filter(a => {
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    if (filterPole !== "all" && a.pole !== filterPole) return false;
    return true;
  });

  const criticalCount = anomalies.filter(a => a.severity === "critique").length;
  const alertCount = anomalies.filter(a => a.severity === "alerte").length;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Gouvernance</p>
          <h1 className="text-lg font-bold text-white">Détection d'Anomalies</h1>
          <p className="text-xs text-zinc-600">Surveillance temps réel des pôles et FI</p>
        </div>
        <button onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-xs text-zinc-400 hover:bg-white/5 transition-all">
          <RefreshCcw className="w-3.5 h-3.5" /> Actualiser
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="ai-card rounded-xl border border-red-500/20 bg-red-900/10 p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div><p className="text-2xl font-bold text-red-400">{criticalCount}</p><p className="text-xs text-zinc-600">Anomalies critiques</p></div>
          </div>
          <div className="ai-card rounded-xl border border-amber-500/20 bg-amber-900/10 p-4 flex items-center gap-3">
            <TrendingDown className="w-5 h-5 text-amber-400" />
            <div><p className="text-2xl font-bold text-amber-400">{alertCount}</p><p className="text-xs text-zinc-600">Alertes actives</p></div>
          </div>
          <div className="ai-card rounded-xl border border-emerald-500/20 bg-emerald-900/10 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div><p className="text-2xl font-bold text-emerald-400">{Math.max(0, familles.length - criticalCount)}</p><p className="text-xs text-zinc-600">FI en bonne santé</p></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Radar */}
          <div className="ai-card rounded-xl border border-white/8 p-5">
            <p className="text-xs font-semibold text-zinc-500 uppercase mb-1 flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5" /> Santé des Pôles</p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.05)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: "#52525b" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
                  <Radar name="Santé" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Anomaly List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-zinc-600" />
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes sévérités</SelectItem>
                  <SelectItem value="critique">Critique</SelectItem>
                  <SelectItem value="alerte">Alerte</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPole} onValueChange={setFilterPole}>
                <SelectTrigger className="w-44 bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les pôles</SelectItem>
                  <SelectItem value="Familles d'Impact">Familles d'Impact</SelectItem>
                  <SelectItem value="Formation">Formation</SelectItem>
                  <SelectItem value="Évangélisation">Évangélisation</SelectItem>
                  <SelectItem value="Communication">Communication</SelectItem>
                </SelectContent>
              </Select>
              <span className="ml-auto text-xs text-zinc-600">{filtered.length} anomalie{filtered.length !== 1 && "s"}</span>
            </div>

            {filtered.length === 0 ? (
              <div className="ai-card rounded-xl border border-white/5 p-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400/50 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">Aucune anomalie détectée</p>
                <p className="text-xs text-zinc-600 mt-1">Tous les systèmes fonctionnent normalement</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(anomaly => <AnomalyCard key={anomaly.id} anomaly={anomaly} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}