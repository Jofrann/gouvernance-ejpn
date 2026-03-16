import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Users, Heart, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, setDay, startOfWeek } from "date-fns";
import { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";
import { detectAlerteEmotions } from "@/components/fi/AlerteEmotions";
import { motion } from "framer-motion";

function getThisThursday() {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  return setDay(start, 4, { weekStartsOn: 1 });
}

const PIPELINE_STEPS = ["passif", "regulier", "disciple", "serviteur", "reproducteur"];
const PIPELINE_COLORS = {
  passif: "bg-zinc-500/60", regulier: "bg-blue-500/60",
  disciple: "bg-violet-500/60", serviteur: "bg-amber-500/60", reproducteur: "bg-emerald-500/60",
};

const GlassCard = ({ children, className = "" }) => (
  <div className={cn("rounded-2xl border border-white/[0.07] p-5", className)}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
    {children}
  </div>
);

export default function FIDashboardPage() {
  const queryClient = useQueryClient();
  const [selectedFI, setSelectedFI] = useState("all");
  const thisThursday = format(getThisThursday(), "yyyy-MM-dd");

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: familles = [] } = useQuery({ queryKey: ["familles-dash"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: allMembres = [] } = useQuery({ queryKey: ["membres-dash"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: allSaisies = [] } = useQuery({ queryKey: ["saisies-dash"], queryFn: () => base44.entities.CliniqueSaisie.list("-created_date", 2000) });

  useEffect(() => {
    if (familles.length > 0 && selectedFI === "all" && user?.role !== "admin" && user?.role !== "responsable_fi") {
      const myFI = familles.find(f => f.pilote_email === user?.email || f.co_pilote_email === user?.email);
      if (myFI) setSelectedFI(myFI.id);
    }
  }, [familles, user, selectedFI]);

  useEffect(() => {
    const u1 = base44.entities.FamilleImpact.subscribe(() => queryClient.invalidateQueries({ queryKey: ["familles-dash"] }));
    const u2 = base44.entities.Membre.subscribe(() => queryClient.invalidateQueries({ queryKey: ["membres-dash"] }));
    const u3 = base44.entities.CliniqueSaisie.subscribe(() => queryClient.invalidateQueries({ queryKey: ["saisies-dash"] }));
    return () => { u1(); u2(); u3(); };
  }, [queryClient]);

  const isAll = selectedFI === "all";
  const isAdmin = user?.role === "admin" || user?.role === "responsable_fi";

  const membres = isAll ? allMembres : allMembres.filter(m => m.famille_impact_id === selectedFI);
  const saisies = isAll ? allSaisies : allSaisies.filter(s => s.famille_impact_id === selectedFI);
  const lastWeekSaisies = saisies.filter(s => s.semaine === thisThursday);

  const avgSante = useMemo(() => {
    const vals = lastWeekSaisies.flatMap(s => [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter(n => n != null));
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  }, [lastWeekSaisies]);

  const presenceRate = lastWeekSaisies.length > 0
    ? Math.round((lastWeekSaisies.filter(s => s.presence).length / Math.max(membres.length, 1)) * 100) : null;

  const alertes = membres.filter(m => detectChuteLivre(m.id, saisies)).length;
  const alertesEmotions = membres.filter(m => detectAlerteEmotions(m.id, saisies));

  const radarData = [
    { axe: "Temps", value: lastWeekSaisies.reduce((a, s) => a + (s.note_temps || 0), 0) / Math.max(lastWeekSaisies.length, 1) },
    { axe: "Finances", value: lastWeekSaisies.reduce((a, s) => a + (s.note_finances || 0), 0) / Math.max(lastWeekSaisies.length, 1) },
    { axe: "Émotions", value: lastWeekSaisies.reduce((a, s) => a + (s.note_emotions || 0), 0) / Math.max(lastWeekSaisies.length, 1) },
    { axe: "Spirituel", value: lastWeekSaisies.reduce((a, s) => a + (s.note_spirituel || 0), 0) / Math.max(lastWeekSaisies.length, 1) },
  ];

  const pipelineCounts = {};
  PIPELINE_STEPS.forEach(s => { pipelineCounts[s] = 0; });
  membres.forEach(m => { if (pipelineCounts[m.statut_pipeline] !== undefined) pipelineCounts[m.statut_pipeline]++; });

  const availableFIs = isAdmin ? familles : familles.filter(f => f.pilote_email === user?.email || f.co_pilote_email === user?.email);
  const fi = familles.find(f => f.id === selectedFI);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Familles d'Impact</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Dashboard Santé</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Analyse · Radar · Pipeline</p>
        </div>
        <Select value={selectedFI} onValueChange={setSelectedFI}>
          <SelectTrigger className="w-64 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Choisir une FI" />
          </SelectTrigger>
          <SelectContent>
            {isAdmin && <SelectItem value="all">Toutes les FI</SelectItem>}
            {availableFIs.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* FI Info */}
      {fi && !isAll && (
        <div className="px-5 py-4 rounded-2xl border border-blue-500/15 overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.05) 100%)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Famille d'Impact</p>
              <h2 className="text-xl font-bold text-white">{fi.name}</h2>
              <p className="text-xs text-zinc-400 mt-0.5">{fi.campus}{fi.pilote_nom ? ` · ${fi.pilote_nom}` : ""}</p>
            </div>
            <Badge className={cn("text-xs border", fi.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30")}>
              {fi.status}
            </Badge>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Membres", value: membres.length, icon: Users, color: "text-blue-400" },
          { label: "Présence", value: presenceRate != null ? `${presenceRate}%` : "—", icon: Heart, color: presenceRate != null && presenceRate >= 70 ? "text-emerald-400" : "text-amber-400" },
          { label: "Santé Moy.", value: avgSante ? `${avgSante}/10` : "—", icon: TrendingUp, color: avgSante && parseFloat(avgSante) >= 7 ? "text-emerald-400" : "text-amber-400" },
          { label: "Alertes", value: alertes, icon: AlertTriangle, color: alertes > 0 ? "text-red-400" : "text-emerald-400" },
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Radar Santé — Semaine actuelle</p>
          <div className="h-60">
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

        <GlassCard>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Pipeline de Croissance</p>
          <div className="space-y-4 pt-1">
            {PIPELINE_STEPS.map(statut => {
              const count = pipelineCounts[statut] || 0;
              return (
                <div key={statut}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-zinc-300 capitalize">{statut}</span>
                    <span className="font-black text-white">{count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", PIPELINE_COLORS[statut])}
                      initial={{ width: 0 }}
                      animate={{ width: membres.length > 0 ? `${(count / membres.length) * 100}%` : "0%" }}
                      transition={{ duration: 0.7, delay: 0.1 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Chute Libre Alerts */}
      {alertes > 0 && (
        <GlassCard className="border-red-500/20" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.07) 0%, rgba(255,255,255,0.01) 100%)" }}>
          <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {alertes} Alerte(s) Chute Libre — Intervention requise
          </p>
          <div className="space-y-1.5">
            {membres.filter(m => detectChuteLivre(m.id, saisies)).map(m => (
              <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-red-500/15 bg-red-500/5">
                <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-xs font-bold text-red-300 flex-shrink-0">
                  {m.nom_complet?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{m.nom_complet}</p>
                  <p className="text-[10px] text-red-400">3 semaines consécutives en baisse · Suivi pastoral urgent</p>
                </div>
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-red-400/60 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20">{m.statut_pipeline}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Alertes Émotions */}
      {alertesEmotions.length > 0 && (
        <GlassCard className="border-orange-500/20" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.07) 0%, rgba(255,255,255,0.01) 100%)" }}>
          <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {alertesEmotions.length} Alerte(s) Émotionnelle(s) — Baisse critique détectée
          </p>
          <div className="space-y-1.5">
            {alertesEmotions.map(m => {
              const saisiesMembre = saisies
                .filter(s => s.membre_id === m.id && s.presence && s.note_emotions != null)
                .sort((a, b) => new Date(b.semaine) - new Date(a.semaine));
              const last2 = saisiesMembre.slice(0, 2);
              const drop = last2.length === 2 ? (last2[1].note_emotions - last2[0].note_emotions).toFixed(1) : "?";
              return (
                <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-orange-500/15 bg-orange-500/5">
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-300 flex-shrink-0">
                    {m.nom_complet?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">{m.nom_complet}</p>
                    <p className="text-[10px] text-orange-400">Note Émotions : -{Math.abs(drop)} pts en 2 semaines · Suivi pastoral recommandé</p>
                  </div>
                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-orange-400/60 px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20">💭 Émotions</span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Members table with alerts */}
      <GlassCard>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Vue des Membres ({membres.length})</p>
        {membres.length === 0 ? (
          <p className="text-sm text-zinc-600 py-8 text-center">Aucun membre</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {membres.map(m => {
              const lastSaisie = saisies.filter(s => s.membre_id === m.id).sort((a, b) => new Date(b.semaine) - new Date(a.semaine))[0];
              const notes = lastSaisie ? [lastSaisie.note_temps, lastSaisie.note_finances, lastSaisie.note_emotions, lastSaisie.note_spirituel].filter(n => n != null) : [];
              const avg = notes.length > 0 ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : null;
              const alerte = detectChuteLivre(m.id, saisies);
              return (
                <div key={m.id} className={cn("flex items-center justify-between p-3 rounded-xl border transition-all",
                  alerte ? "bg-red-500/5 border-red-500/20" : "border-white/[0.04] hover:bg-white/[0.02]")}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                      {m.nom_complet?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{m.nom_complet}</p>
                      {alerte && <p className="text-[10px] text-red-400">⚠ Chute Libre</p>}
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
    </div>
  );
}