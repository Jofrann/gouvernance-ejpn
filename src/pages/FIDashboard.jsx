import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from "recharts";
import { Heart, Users, TrendingUp, TrendingDown, Home } from "lucide-react";
import { format, setDay, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";
import { motion } from "framer-motion";

function getThisThursday() {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  return format(setDay(start, 4, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

const PIPELINE_COLORS = {
  passif: "bg-zinc-500/60",
  regulier: "bg-blue-500/60",
  disciple: "bg-violet-500/60",
  reproducteur: "bg-amber-500/60",
};

const GlassCard = ({ children, className = "" }) => (
  <div
    className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px) saturate(1.4)" }}
  >
    {children}
  </div>
);

export default function FIDashboardPage() {
  const [selectedFI, setSelectedFI] = useState(null);
  const thisThursday = getThisThursday();

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
    { axe: "Temps",    value: lastWeekSaisies.reduce((a, s) => a + (s.note_temps    || 0), 0) / Math.max(lastWeekSaisies.length, 1) },
    { axe: "Finances", value: lastWeekSaisies.reduce((a, s) => a + (s.note_finances || 0), 0) / Math.max(lastWeekSaisies.length, 1) },
    { axe: "Émotions", value: lastWeekSaisies.reduce((a, s) => a + (s.note_emotions || 0), 0) / Math.max(lastWeekSaisies.length, 1) },
    { axe: "Spirituel",value: lastWeekSaisies.reduce((a, s) => a + (s.note_spirituel|| 0), 0) / Math.max(lastWeekSaisies.length, 1) },
  ];

  const presenceRate = lastWeekSaisies.length > 0
    ? Math.round((lastWeekSaisies.filter((s) => s.presence).length / Math.max(membres.length, 1)) * 100)
    : null;

  const alertes = membres.filter((m) => detectChuteLivre(m.id, saisies)).length;
  const pipelineCounts = { passif: 0, regulier: 0, disciple: 0, reproducteur: 0 };
  membres.forEach((m) => { if (pipelineCounts[m.statut_pipeline] !== undefined) pipelineCounts[m.statut_pipeline]++; });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Familles d'Impact</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Mes Maisons</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Vue santé de la Famille d'Impact</p>
        </div>
        <Select value={selectedFI || ""} onValueChange={setSelectedFI}>
          <SelectTrigger className="w-60 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Choisir une FI" />
          </SelectTrigger>
          <SelectContent>
            {familles.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </motion.div>

      {/* FI Banner */}
      {fi && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="relative rounded-2xl border border-white/[0.08] px-5 py-4 overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.07) 100%)", backdropFilter: "blur(24px)" }}
        >
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at 10% 50%, rgba(59,130,246,0.3) 0%, transparent 60%)" }} />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Famille d'Impact</p>
              <h2 className="text-xl font-bold text-white">{fi.name}</h2>
              <p className="text-xs text-zinc-400 mt-0.5">{fi.campus} · Pilote: {fi.pilote_email}</p>
            </div>
            <Badge className={cn("text-xs border", fi.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30")}>
              {fi.status}
            </Badge>
          </div>
        </motion.div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Membres",    value: membres.length,                                          icon: Users,        color: "text-blue-400",    glow: "border-blue-500/20" },
          { label: "Présence",   value: presenceRate != null ? `${presenceRate}%` : "—",         icon: Heart,        color: presenceRate != null && presenceRate >= 70 ? "text-emerald-400" : "text-amber-400", glow: "" },
          { label: "Santé Moy.", value: avgSante ? `${avgSante}/10` : "—",                       icon: TrendingUp,   color: avgSante && parseFloat(avgSante) >= 7 ? "text-emerald-400" : "text-amber-400", glow: "" },
          { label: "Alertes",    value: alertes,                                                  icon: TrendingDown, color: alertes > 0 ? "text-red-400" : "text-emerald-400", glow: alertes > 0 ? "border-red-500/20" : "" },
        ].map(({ label, value, icon: Icon, color, glow }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
            <GlassCard className={cn("border", glow || "border-white/[0.07]")}>
              <div className="flex items-center gap-3">
                <Icon className={cn("w-5 h-5", color)} />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
                  <p className={cn("text-2xl font-black", color)}>{value}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <GlassCard>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-0.5">Analyse IA</p>
            <p className="text-sm font-semibold text-white mb-4">Radar Santé — {format(new Date(), "d MMMM", { locale: fr })}</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="axe" tick={{ fontSize: 11, fill: "#71717a" }} />
                  <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* Pipeline */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-0.5">Transformation</p>
            <p className="text-sm font-semibold text-white mb-4">Pipeline</p>
            <div className="space-y-4 pt-1">
              {Object.entries(pipelineCounts).map(([statut, count]) => (
                <div key={statut}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-zinc-300 capitalize">{statut}</span>
                    <span className="font-black text-white">{count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", PIPELINE_COLORS[statut])}
                      style={{ width: membres.length > 0 ? `${(count / membres.length) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
              {membres.length === 0 && <p className="text-sm text-zinc-600 text-center py-8">Aucun membre dans cette FI</p>}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Members list */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <GlassCard>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-0.5">CRM</p>
          <p className="text-sm font-semibold text-white mb-4">Membres ({membres.length})</p>
          {membres.length === 0 ? (
            <p className="text-sm text-zinc-600 py-8 text-center flex flex-col items-center gap-2">
              <Home className="w-8 h-8 text-zinc-700" />Aucun membre
            </p>
          ) : (
            <div className="space-y-1">
              {membres.map((m) => {
                const lastSaisie = saisies.filter((s) => s.membre_id === m.id).sort((a, b) => new Date(b.semaine) - new Date(a.semaine))[0];
                const notes = lastSaisie ? [lastSaisie.note_temps, lastSaisie.note_finances, lastSaisie.note_emotions, lastSaisie.note_spirituel].filter((n) => n != null) : [];
                const avg = notes.length > 0 ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : null;
                const alerte = detectChuteLivre(m.id, saisies);
                return (
                  <div key={m.id} className={cn("flex items-center justify-between p-3 rounded-xl border transition-all cursor-default", alerte ? "bg-red-500/5 border-red-500/20" : "border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08]")}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                        {m.nom_complet?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{m.nom_complet}</p>
                        {alerte && <p className="text-[10px] text-red-400">⚠ Alerte Chute Libre</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">{m.statut_pipeline}</span>
                      {avg && <span className={cn("text-sm font-black", parseFloat(avg) >= 7 ? "text-emerald-400" : parseFloat(avg) >= 5 ? "text-amber-400" : "text-red-400")}>{avg}/10</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}