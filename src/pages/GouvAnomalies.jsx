import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, TrendingDown, CheckCircle2, Filter, RefreshCcw, BarChart3 } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import AnomalyCard from "@/components/gouvernance/AnomalyCard";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";

const GlassCard = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
    {children}
  </div>
);

export default function GouvAnomaliesPage() {
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterPole, setFilterPole] = useState("all");

  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres-all"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: saisies = [] } = useQuery({ queryKey: ["all-saisies"], queryFn: () => base44.entities.CliniqueSaisie.list("-created_date", 1000) });
  const { data: okrs = [] } = useQuery({ queryKey: ["okrs"], queryFn: () => base44.entities.OKR.list() });
  const { data: actions = [] } = useQuery({ queryKey: ["actions"], queryFn: () => base44.entities.ActionEvangelisation.list() });

  const anomalies = useMemo(() => {
    const results = [];
    familles.forEach((fi) => {
      const fiMembres = membres.filter((m) => m.famille_impact_id === fi.id);
      const fiSaisies = saisies.filter((s) => s.famille_impact_id === fi.id);
      if (fiMembres.length > 0 && fiSaisies.length === 0) {
        results.push({ id: `fi-nosaisie-${fi.id}`, entity_name: fi.name, pole: "Familles d'Impact", severity: "critique", description: `Aucune saisie clinique enregistrée. ${fiMembres.length} membres sans suivi.`, metric_value: "0", metric_target: fiMembres.length.toString(), metric_label: "saisies vs membres" });
      }
      if (fiSaisies.length > 0) {
        const avgNotes = fiSaisies.reduce((acc, s) => { const notes = [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter((n) => n !== null && n !== undefined); return acc + (notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : 0); }, 0) / fiSaisies.length;
        if (avgNotes < 4) results.push({ id: `fi-critical-${fi.id}`, entity_name: fi.name, pole: "Familles d'Impact", severity: "critique", description: `Moyenne de santé critique à ${avgNotes.toFixed(1)}/10.`, metric_value: avgNotes.toFixed(1), metric_target: "5.0", metric_label: "moyenne santé" });
        else if (avgNotes < 6) results.push({ id: `fi-alerte-${fi.id}`, entity_name: fi.name, pole: "Familles d'Impact", severity: "alerte", description: `Moyenne de santé en déclin à ${avgNotes.toFixed(1)}/10.`, metric_value: avgNotes.toFixed(1), metric_target: "7.0", metric_label: "moyenne santé" });
        const presenceRate = fiSaisies.filter((s) => s.presence).length / fiSaisies.length;
        if (presenceRate < 0.5) results.push({ id: `fi-presence-${fi.id}`, entity_name: fi.name, pole: "Familles d'Impact", severity: presenceRate < 0.3 ? "critique" : "alerte", description: `Taux de présence à ${Math.round(presenceRate * 100)}%.`, metric_value: `${Math.round(presenceRate * 100)}%`, metric_target: "70%", metric_label: "taux de présence" });
      }
    });
    okrs.filter((o) => o.statut === "en_cours").forEach((okr) => {
      if (okr.objectif_cible > 0) {
        const progress = (okr.valeur_actuelle / okr.objectif_cible) * 100;
        if (progress < 25) results.push({ id: `okr-${okr.id}`, entity_name: okr.titre, pole: okr.pole?.replace(/_/g, " ") || "Général", severity: "critique", description: `OKR en retard sévère (${progress.toFixed(0)}%).`, metric_value: okr.valeur_actuelle?.toString() || "0", metric_target: okr.objectif_cible?.toString() || "—", metric_label: okr.unite || "progression" });
        else if (progress < 50) results.push({ id: `okr-alt-${okr.id}`, entity_name: okr.titre, pole: okr.pole?.replace(/_/g, " ") || "Général", severity: "alerte", description: `OKR à surveiller (${progress.toFixed(0)}%).`, metric_value: okr.valeur_actuelle?.toString() || "0", metric_target: okr.objectif_cible?.toString() || "—", metric_label: okr.unite || "progression" });
      }
    });
    actions.filter((a) => a.statut === "termine" && !a.debrief_complete).forEach((action) => {
      results.push({ id: `ev-debrief-${action.id}`, entity_name: action.titre, pole: "Évangélisation", severity: "alerte", description: "Action terminée sans debrief.", metric_value: "0", metric_target: "1", metric_label: "debrief complété" });
    });
    return results;
  }, [familles, membres, saisies, okrs, actions]);

  const radarData = useMemo(() => {
    const critiqueFI = anomalies.filter((a) => a.pole === "Familles d'Impact" && a.severity === "critique").length;
    const alerteFI = anomalies.filter((a) => a.pole === "Familles d'Impact" && a.severity === "alerte").length;
    return [
      { axis: "Familles d'Impact", value: Math.max(0, 10 - critiqueFI * 3 - alerteFI * 1), fullMark: 10 },
      { axis: "Formation", value: okrs.filter((o) => o.pole === "formation" && o.statut === "atteint").length > 0 ? 8 : 5, fullMark: 10 },
      { axis: "Évangélisation", value: Math.max(0, 10 - anomalies.filter((a) => a.pole === "Évangélisation").length * 2), fullMark: 10 },
      { axis: "Communication", value: 7, fullMark: 10 },
    ];
  }, [anomalies, okrs]);

  const filtered = anomalies.filter((a) => {
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    if (filterPole !== "all" && a.pole !== filterPole) return false;
    return true;
  });

  const criticalCount = anomalies.filter((a) => a.severity === "critique").length;
  const alertCount = anomalies.filter((a) => a.severity === "alerte").length;

  return (
    <div className="px-6 py-10 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Gouvernance</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Détection d'Anomalies</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Algorithme de surveillance temps réel</p>
        </div>
        <button className="btn-ghost-glass flex items-center gap-2 px-4 py-2" onClick={() => window.location.reload()}>
          <RefreshCcw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-white/5 border border-red-500/20"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
          <div><p className="text-2xl font-bold text-red-400">{criticalCount}</p><p className="text-xs text-red-400/70 font-medium">Anomalies critiques</p></div>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-white/5 border border-amber-500/20"><TrendingDown className="w-5 h-5 text-amber-400" /></div>
          <div><p className="text-2xl font-bold text-amber-400">{alertCount}</p><p className="text-xs text-amber-400/70 font-medium">Alertes actives</p></div>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-white/5 border border-emerald-500/20"><CheckCircle2 className="w-5 h-5 text-emerald-400" /></div>
          <div><p className="text-2xl font-bold text-emerald-400">{familles.length - criticalCount}</p><p className="text-xs text-emerald-400/70 font-medium">FI en bonne santé</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <GlassCard>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Santé des Pôles</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.07)" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "#71717a" }} />
                <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10, fill: "#52525b" }} />
                <Radar name="Santé" dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} strokeWidth={2} />
                <Tooltip contentStyle={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px", color: "#fff" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-36 bg-white/5 border-white/10 text-zinc-300 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes sévérités</SelectItem>
                <SelectItem value="critique">Critique</SelectItem>
                <SelectItem value="alerte">Alerte</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPole} onValueChange={setFilterPole}>
              <SelectTrigger className="w-44 bg-white/5 border-white/10 text-zinc-300 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les pôles</SelectItem>
                <SelectItem value="Familles d'Impact">Familles d'Impact</SelectItem>
                <SelectItem value="Formation">Formation</SelectItem>
                <SelectItem value="Évangélisation">Évangélisation</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto text-xs text-zinc-500 border-white/10">{filtered.length} anomalie{filtered.length !== 1 && "s"}</Badge>
          </div>

          {filtered.length === 0 ? (
            <GlassCard className="text-center py-12">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-zinc-400">Aucune anomalie détectée</p>
              <p className="text-xs text-zinc-600 mt-1">Tous les systèmes fonctionnent normalement</p>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {filtered.map((anomaly) => <AnomalyCard key={anomaly.id} anomaly={anomaly} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}