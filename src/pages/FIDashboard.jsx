import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from "recharts";
import { Heart, Users, TrendingUp, TrendingDown, Home } from "lucide-react";
import { format, setDay, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";

function getThisThursday() {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  return format(setDay(start, 4, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

const PIPELINE_COLORS = { passif: "bg-zinc-200", regulier: "bg-blue-400", disciple: "bg-violet-500", reproducteur: "bg-amber-500" };

export default function FIDashboardPage() {
  const [selectedFI, setSelectedFI] = useState(null);
  const thisThursday = getThisThursday();

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: familles = [] } = useQuery({
    queryKey: ["familles"],
    queryFn: () => base44.entities.FamilleImpact.list(),
    onSuccess: (data) => { if (data.length > 0 && !selectedFI) setSelectedFI(data[0].id); }
  });
  const { data: membres = [] } = useQuery({
    queryKey: ["membres", selectedFI],
    queryFn: () => selectedFI ? base44.entities.Membre.filter({ famille_impact_id: selectedFI }) : Promise.resolve([]),
    enabled: !!selectedFI,
  });
  const { data: saisies = [] } = useQuery({
    queryKey: ["saisies-fi", selectedFI],
    queryFn: () => selectedFI ? base44.entities.CliniqueSaisie.filter({ famille_impact_id: selectedFI }) : Promise.resolve([]),
    enabled: !!selectedFI,
  });

  const fi = familles.find((f) => f.id === selectedFI);

  const lastWeekSaisies = saisies.filter((s) => s.semaine === thisThursday);
  const avgSante = useMemo(() => {
    const vals = lastWeekSaisies.flatMap((s) => [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter((n) => n != null));
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  }, [lastWeekSaisies]);

  const radarData = [
    { axe: "Temps", value: lastWeekSaisies.reduce((a, s) => a + (s.note_temps || 0), 0) / Math.max(lastWeekSaisies.length, 1) },
    { axe: "Finances", value: lastWeekSaisies.reduce((a, s) => a + (s.note_finances || 0), 0) / Math.max(lastWeekSaisies.length, 1) },
    { axe: "Émotions", value: lastWeekSaisies.reduce((a, s) => a + (s.note_emotions || 0), 0) / Math.max(lastWeekSaisies.length, 1) },
    { axe: "Spirituel", value: lastWeekSaisies.reduce((a, s) => a + (s.note_spirituel || 0), 0) / Math.max(lastWeekSaisies.length, 1) },
  ];

  const presenceRate = lastWeekSaisies.length > 0
    ? Math.round((lastWeekSaisies.filter((s) => s.presence).length / Math.max(membres.length, 1)) * 100)
    : null;

  const alertes = membres.filter((m) => detectChuteLivre(m.id, saisies)).length;
  const pipelineCounts = { passif: 0, regulier: 0, disciple: 0, reproducteur: 0 };
  membres.forEach((m) => { if (pipelineCounts[m.statut_pipeline] !== undefined) pipelineCounts[m.statut_pipeline]++; });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Mes Maisons</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Vue santé de la Famille d'Impact</p>
        </div>
        <Select value={selectedFI || ""} onValueChange={setSelectedFI}>
          <SelectTrigger className="w-60 bg-white border-zinc-200"><SelectValue placeholder="Choisir une FI" /></SelectTrigger>
          <SelectContent>{familles.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {fi && (
        <div className="p-4 rounded-xl bg-zinc-900 text-white flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Famille d'Impact</p>
            <h2 className="text-xl font-bold">{fi.name}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{fi.campus} · Pilote: {fi.pilote_email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs border", fi.status === "active" ? "bg-emerald-900 text-emerald-300 border-emerald-700" : "bg-zinc-700 text-zinc-300")}>{fi.status}</Badge>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Membres", value: membres.length, icon: Users, color: "text-zinc-700" },
          { label: "Présence", value: presenceRate != null ? `${presenceRate}%` : "—", icon: Heart, color: presenceRate != null && presenceRate >= 70 ? "text-emerald-600" : "text-amber-600" },
          { label: "Santé Moy.", value: avgSante ? `${avgSante}/10` : "—", icon: TrendingUp, color: avgSante && parseFloat(avgSante) >= 7 ? "text-emerald-600" : "text-amber-600" },
          { label: "Alertes", value: alertes, icon: TrendingDown, color: alertes > 0 ? "text-red-600" : "text-emerald-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-zinc-200 bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={cn("w-5 h-5", color)} />
              <div>
                <p className="text-xs text-zinc-400">{label}</p>
                <p className={cn("text-xl font-bold", color)}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar */}
        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Radar Santé — {format(new Date(), "d MMMM", { locale: fr })}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#f4f4f5" />
                  <PolarAngleAxis dataKey="axe" tick={{ fontSize: 12, fill: "#71717a" }} />
                  <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline */}
        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Pipeline de Transformation</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-2">
            {Object.entries(pipelineCounts).map(([statut, count]) => (
              <div key={statut}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-zinc-700 capitalize">{statut}</span>
                  <span className="font-bold text-zinc-900">{count}</span>
                </div>
                <div className="w-full h-2 bg-zinc-100 rounded-full">
                  <div className={cn("h-full rounded-full transition-all", PIPELINE_COLORS[statut])} style={{ width: membres.length > 0 ? `${(count / membres.length) * 100}%` : "0%" }} />
                </div>
              </div>
            ))}
            {membres.length === 0 && <p className="text-sm text-zinc-400 text-center py-8">Aucun membre dans cette FI</p>}
          </CardContent>
        </Card>
      </div>

      {/* Members list */}
      <Card className="border-zinc-200 bg-white">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Membres ({membres.length})</CardTitle></CardHeader>
        <CardContent>
          {membres.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center"><Home className="w-8 h-8 mx-auto mb-2 text-zinc-200" />Aucun membre</p>
          ) : (
            <div className="space-y-1">
              {membres.map((m) => {
                const lastSaisie = saisies.filter((s) => s.membre_id === m.id).sort((a, b) => new Date(b.semaine) - new Date(a.semaine))[0];
                const notes = lastSaisie ? [lastSaisie.note_temps, lastSaisie.note_finances, lastSaisie.note_emotions, lastSaisie.note_spirituel].filter((n) => n != null) : [];
                const avg = notes.length > 0 ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : null;
                const alerte = detectChuteLivre(m.id, saisies);
                return (
                  <div key={m.id} className={cn("flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 transition", alerte ? "bg-red-50/40" : "")}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">{m.nom_complet?.[0]?.toUpperCase()}</div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{m.nom_complet}</p>
                        {alerte && <p className="text-[10px] text-red-600">⚠ Alerte Chute Libre</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-[10px]", PIPELINE_COLORS[m.statut_pipeline]?.replace("bg-", "bg-").replace("-400", "-100").replace("-500", "-100").replace("-200", "-100"), "text-zinc-700")}>{m.statut_pipeline}</Badge>
                      {avg && <span className={cn("text-sm font-bold", parseFloat(avg) >= 7 ? "text-emerald-600" : parseFloat(avg) >= 5 ? "text-amber-600" : "text-red-600")}>{avg}/10</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}