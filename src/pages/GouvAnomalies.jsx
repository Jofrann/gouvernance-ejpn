import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, TrendingDown, CheckCircle2, Filter, RefreshCcw, BarChart3 } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import AnomalyCard from "@/components/gouvernance/AnomalyCard";

export default function GouvAnomaliesPage() {
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterPole, setFilterPole] = useState("all");

  const { data: familles = [] } = useQuery({
    queryKey: ["familles"],
    queryFn: () => base44.entities.FamilleImpact.list(),
  });

  const { data: membres = [] } = useQuery({
    queryKey: ["membres-all"],
    queryFn: () => base44.entities.Membre.list("-created_date", 500),
  });

  const { data: saisies = [] } = useQuery({
    queryKey: ["all-saisies"],
    queryFn: () => base44.entities.CliniqueSaisie.list("-created_date", 1000),
  });

  const { data: okrs = [] } = useQuery({
    queryKey: ["okrs"],
    queryFn: () => base44.entities.OKR.list(),
  });

  const { data: actions = [] } = useQuery({
    queryKey: ["actions"],
    queryFn: () => base44.entities.ActionEvangelisation.list(),
  });

  // Compute anomalies
  const anomalies = useMemo(() => {
    const results = [];

    // Check FI health
    familles.forEach((fi) => {
      const fiMembres = membres.filter((m) => m.famille_impact_id === fi.id);
      const fiSaisies = saisies.filter((s) => s.famille_impact_id === fi.id);

      // No saisies recently
      if (fiMembres.length > 0 && fiSaisies.length === 0) {
        results.push({
          id: `fi-nosaisie-${fi.id}`,
          entity_name: fi.name,
          pole: "Familles d'Impact",
          severity: "critique",
          description: `Aucune saisie clinique enregistrée. ${fiMembres.length} membres sans suivi.`,
          metric_value: "0",
          metric_target: fiMembres.length.toString(),
          metric_label: "saisies vs membres",
        });
      }

      // Check average scores
      if (fiSaisies.length > 0) {
        const avgNotes = fiSaisies.reduce((acc, s) => {
          const notes = [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter((n) => n !== null && n !== undefined);
          return acc + (notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : 0);
        }, 0) / fiSaisies.length;

        if (avgNotes < 4) {
          results.push({
            id: `fi-critical-${fi.id}`,
            entity_name: fi.name,
            pole: "Familles d'Impact",
            severity: "critique",
            description: `Moyenne de santé critique à ${avgNotes.toFixed(1)}/10. Intervention immédiate requise.`,
            metric_value: avgNotes.toFixed(1),
            metric_target: "5.0",
            metric_label: "moyenne santé",
          });
        } else if (avgNotes < 6) {
          results.push({
            id: `fi-alerte-${fi.id}`,
            entity_name: fi.name,
            pole: "Familles d'Impact",
            severity: "alerte",
            description: `Moyenne de santé en déclin à ${avgNotes.toFixed(1)}/10. Suivi rapproché recommandé.`,
            metric_value: avgNotes.toFixed(1),
            metric_target: "7.0",
            metric_label: "moyenne santé",
          });
        }

        // Presence rate
        const presenceRate = fiSaisies.filter((s) => s.presence).length / fiSaisies.length;
        if (presenceRate < 0.5) {
          results.push({
            id: `fi-presence-${fi.id}`,
            entity_name: fi.name,
            pole: "Familles d'Impact",
            severity: presenceRate < 0.3 ? "critique" : "alerte",
            description: `Taux de présence à ${Math.round(presenceRate * 100)}%. Plus de la moitié des membres sont absents.`,
            metric_value: `${Math.round(presenceRate * 100)}%`,
            metric_target: "70%",
            metric_label: "taux de présence",
          });
        }
      }
    });

    // Check OKR performance
    okrs.filter((o) => o.statut === "en_cours").forEach((okr) => {
      if (okr.objectif_cible > 0) {
        const progress = (okr.valeur_actuelle / okr.objectif_cible) * 100;
        if (progress < 25) {
          results.push({
            id: `okr-${okr.id}`,
            entity_name: okr.titre,
            pole: okr.pole?.replace(/_/g, " ") || "Général",
            severity: "critique",
            description: `OKR en retard sévère (${progress.toFixed(0)}% d'avancement). Objectif: ${okr.objectif_cible} ${okr.unite || ""}`,
            metric_value: okr.valeur_actuelle?.toString() || "0",
            metric_target: okr.objectif_cible?.toString() || "—",
            metric_label: okr.unite || "progression",
          });
        } else if (progress < 50) {
          results.push({
            id: `okr-${okr.id}`,
            entity_name: okr.titre,
            pole: okr.pole?.replace(/_/g, " ") || "Général",
            severity: "alerte",
            description: `OKR à surveiller (${progress.toFixed(0)}% d'avancement).`,
            metric_value: okr.valeur_actuelle?.toString() || "0",
            metric_target: okr.objectif_cible?.toString() || "—",
            metric_label: okr.unite || "progression",
          });
        }
      }
    });

    // Check evangelisation debrief
    actions.filter((a) => a.statut === "termine" && !a.debrief_complete).forEach((action) => {
      results.push({
        id: `ev-debrief-${action.id}`,
        entity_name: action.titre,
        pole: "Évangélisation",
        severity: "alerte",
        description: "Action terminée sans debrief. Données terrain manquantes.",
        metric_value: "0",
        metric_target: "1",
        metric_label: "debrief complété",
      });
    });

    return results;
  }, [familles, membres, saisies, okrs, actions]);

  // Radar data for pole health
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
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Détection d'Anomalies</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Algorithme de surveillance temps réel des pôles et FI</p>
        </div>
        <Button variant="outline" className="gap-2 border-zinc-200" onClick={() => window.location.reload()}>
          <RefreshCcw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-red-200 bg-red-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-white border border-red-100">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{criticalCount}</p>
              <p className="text-xs text-red-600 font-medium">Anomalies critiques</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-white border border-amber-100">
              <TrendingDown className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{alertCount}</p>
              <p className="text-xs text-amber-600 font-medium">Alertes actives</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{familles.length - criticalCount}</p>
              <p className="text-xs text-emerald-600 font-medium">FI en bonne santé</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Radar + Anomaly List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Radar Chart */}
        <Card className="border border-zinc-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-zinc-400" />
              Santé des Pôles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e4e4e7" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "#71717a" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10, fill: "#a1a1aa" }} />
                  <Radar name="Santé" dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip contentStyle={{ border: "1px solid #e4e4e7", borderRadius: "8px", fontSize: "12px" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Anomalies List */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-36 bg-white border-zinc-200 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes sévérités</SelectItem>
                <SelectItem value="critique">Critique</SelectItem>
                <SelectItem value="alerte">Alerte</SelectItem>
                <SelectItem value="attention">Attention</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPole} onValueChange={setFilterPole}>
              <SelectTrigger className="w-44 bg-white border-zinc-200 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les pôles</SelectItem>
                <SelectItem value="Familles d'Impact">Familles d'Impact</SelectItem>
                <SelectItem value="Formation">Formation</SelectItem>
                <SelectItem value="Évangélisation">Évangélisation</SelectItem>
                <SelectItem value="Communication">Communication</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto text-xs text-zinc-500">
              {filtered.length} anomalie{filtered.length !== 1 && "s"}
            </Badge>
          </div>

          {/* Anomaly Cards */}
          {filtered.length === 0 ? (
            <Card className="border border-zinc-200 bg-white">
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-zinc-700">Aucune anomalie détectée</p>
                <p className="text-xs text-zinc-400 mt-1">Tous les systèmes fonctionnent normalement</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((anomaly) => (
                <AnomalyCard key={anomaly.id} anomaly={anomaly} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}