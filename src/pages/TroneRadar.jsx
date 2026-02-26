import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  BarChart3, Users, Globe, GraduationCap, Megaphone,
  TrendingUp, TrendingDown, Minus, Crown, ArrowUpRight,
  Target, Heart, BookOpen, Zap
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  LineChart, Line
} from "recharts";
import { format, subWeeks, startOfWeek, setDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const GlassCard = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.45 }}
    className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px) saturate(1.4)" }}
  >{children}</motion.div>
);

function getThursday(weeksAgo = 0) {
  const start = startOfWeek(subWeeks(new Date(), weeksAgo), { weekStartsOn: 1 });
  return format(setDay(start, 4, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1117]/95 px-3 py-2 shadow-2xl text-xs">
      <p className="text-zinc-400 mb-0.5">{label}</p>
      <p className="font-black text-white">{payload[0].value}</p>
    </div>
  );
};

function MacroIndicator({ titre, value, max, icon: Icon, color, trend, description, link, delay }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-zinc-500";

  const content = (
    <GlassCard delay={delay} className={`hover:border-white/[0.14] transition-all ${link ? "cursor-pointer group" : ""}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl border border-white/[0.06]`} style={{ background: "rgba(255,255,255,0.04)" }}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex items-center gap-1.5">
          <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
          {link && <ArrowUpRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />}
        </div>
      </div>
      <p className={`text-4xl font-black ${color} tracking-tight`}>{pct}%</p>
      <p className="text-xs font-bold text-white mt-1">{titre}</p>
      <p className="text-[10px] text-zinc-600 mt-0.5">{description}</p>
      <div className="mt-3 w-full h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color.replace("text-", "").replace("-400", "") === "amber" ? "#f59e0b" : color.replace("text-", "").replace("-400", "") === "emerald" ? "#10b981" : color.replace("text-", "").replace("-400", "") === "blue" ? "#3b82f6" : "#8b5cf6" }} />
      </div>
    </GlassCard>
  );
  return link ? <Link to={createPageUrl(link)}>{content}</Link> : content;
}

export default function TroneRadarPage() {
  useTrackActivity("TroneRadar");
  const qc = useQueryClient();

  useEffect(() => {
    const subs = [
      base44.entities.Membre.subscribe(() => qc.invalidateQueries({ queryKey: ["membres"] })),
      base44.entities.FamilleImpact.subscribe(() => qc.invalidateQueries({ queryKey: ["familles"] })),
      base44.entities.OKR.subscribe(() => qc.invalidateQueries({ queryKey: ["okrs"] })),
      base44.entities.ActionEvangelisation.subscribe(() => qc.invalidateQueries({ queryKey: ["actions-evang"] })),
      base44.entities.CliniqueSaisie.subscribe(() => qc.invalidateQueries({ queryKey: ["saisies-all"] })),
      base44.entities.FormationLivrable.subscribe(() => qc.invalidateQueries({ queryKey: ["livrables"] })),
    ];
    return () => subs.forEach(u => u());
  }, [qc]);

  const { data: membres = [] } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: okrs = [] } = useQuery({ queryKey: ["okrs"], queryFn: () => base44.entities.OKR.list() });
  const { data: actions = [] } = useQuery({ queryKey: ["actions-evang"], queryFn: () => base44.entities.ActionEvangelisation.list() });
  const { data: saisies = [] } = useQuery({ queryKey: ["saisies-all"], queryFn: () => base44.entities.CliniqueSaisie.list("-semaine", 500) });
  const { data: livrables = [] } = useQuery({ queryKey: ["livrables"], queryFn: () => base44.entities.FormationLivrable.list() });

  // ── DOMINATION : Taux de pénétration (membres actifs / objectif cumulé des FI)
  const objectifTotal = familles.reduce((s, f) => s + (f.objectif_membres || 12), 0);
  const membresActifs = membres.filter(m => m.statut_pipeline !== "passif").length;
  const dominationValue = membresActifs;
  const dominationMax = Math.max(objectifTotal, 1);

  // ── AVANCEMENT : Taux OKR atteints
  const okrsAtteints = okrs.filter(o => o.statut === "atteint").length;
  const avancementValue = okrsAtteints;
  const avancementMax = Math.max(okrs.length, 1);

  // ── STATURE : Taux de présence global moyen (6 dernières semaines)
  const presenceSemaines = Array.from({ length: 6 }, (_, i) => {
    const wStr = getThursday(5 - i);
    const wS = saisies.filter(s => s.semaine === wStr);
    return { week: wStr.slice(5), pct: membres.length > 0 ? Math.round((wS.filter(s => s.presence).length / membres.length) * 100) : 0 };
  });
  const avgPresence = Math.round(presenceSemaines.reduce((s, w) => s + w.pct, 0) / 6);
  const statureValue = avgPresence;
  const statureMax = 100;

  // ── CULTURE : Livrables formation validés
  const livrablesValides = livrables.filter(l => l.statut === "valide").length;
  const cultureValue = livrablesValides;
  const cultureMax = Math.max(livrables.length, 1);

  // Radar global
  const radarData = [
    { axe: "Domination", value: Math.round((dominationValue / dominationMax) * 100) },
    { axe: "Avancement", value: Math.round((avancementValue / avancementMax) * 100) },
    { axe: "Stature", value: statureValue },
    { axe: "Culture", value: Math.round((cultureValue / cultureMax) * 100) },
  ];
  const scoreGlobal = Math.round(radarData.reduce((s, d) => s + d.value, 0) / 4);

  // Évangélisation trend
  const actionsTerminees = actions.filter(a => a.statut === "termine");
  const touchesMois = actionsTerminees.slice(-10).map((a, i) => ({
    label: `A${i + 1}`, touched: a.personnes_touchees || 0, conv: a.conversions || 0
  }));

  // FI santé
  const fiHealth = familles.slice(0, 8).map(fi => {
    const fiMembres = membres.filter(m => m.famille_impact_id === fi.id);
    const engages = fiMembres.filter(m => m.statut_pipeline !== "passif").length;
    return {
      name: fi.name.length > 12 ? fi.name.slice(0, 12) + "…" : fi.name,
      taux: fiMembres.length > 0 ? Math.round((engages / fiMembres.length) * 100) : 0,
    };
  });

  const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Crown className="w-4 h-4 text-amber-400" />
          <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-[0.25em]">Niveau I — Direction Souveraine</p>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Radar Global du Mouvement</h1>
        <p className="text-sm text-zinc-500 mt-1">4 macro-indicateurs : Domination · Avancement · Stature · Culture</p>
      </motion.div>

      {/* Score global */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="relative rounded-2xl border border-amber-500/20 overflow-hidden p-6"
        style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(139,92,246,0.04) 100%)" }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400/80 mb-1">Score Stratégique Global</p>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-black text-amber-400">{scoreGlobal}%</span>
              <span className="text-sm text-zinc-500">Performance du mouvement</span>
            </div>
            <div className="mt-3 w-full max-w-sm h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all" style={{ width: `${scoreGlobal}%` }} />
            </div>
          </div>
          <div className="h-52 w-full lg:w-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="axe" tick={{ fontSize: 10, fill: "#a1a1aa" }} />
                <Radar dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* 4 Macro-indicateurs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MacroIndicator
          titre="Domination"
          value={dominationValue} max={dominationMax}
          icon={Zap} color="text-blue-400" trend={dominationValue > 0 ? "up" : "minus"}
          description={`${dominationValue} actifs sur ${objectifTotal} objectif cumulé`}
          link="FIHub" delay={0.15}
        />
        <MacroIndicator
          titre="Avancement"
          value={avancementValue} max={avancementMax}
          icon={Target} color="text-violet-400" trend={okrsAtteints > 0 ? "up" : "minus"}
          description={`${okrsAtteints} OKR atteints sur ${okrs.length}`}
          link="GouvMasterPlan" delay={0.2}
        />
        <MacroIndicator
          titre="Stature"
          value={statureValue} max={statureMax}
          icon={Heart} color="text-emerald-400" trend={statureValue >= 70 ? "up" : statureValue < 50 ? "down" : "minus"}
          description={`Présence moy. sur 6 semaines`}
          link="FIClinique" delay={0.25}
        />
        <MacroIndicator
          titre="Culture"
          value={cultureValue} max={cultureMax}
          icon={BookOpen} color="text-amber-400" trend={livrablesValides > 0 ? "up" : "minus"}
          description={`${livrablesValides} livrables validés sur ${livrables.length}`}
          link="FormationCorrection" delay={0.3}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Présence 6 semaines */}
        <GlassCard delay={0.35}>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Stature</p>
          <p className="text-sm font-semibold text-white mb-4">Présence globale · 6 semaines</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={presenceSemaines}>
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#52525b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="pct" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Taux d'engagement par FI */}
        <GlassCard delay={0.4}>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Domination</p>
          <p className="text-sm font-semibold text-white mb-4">Taux d'engagement par FI</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fiHealth} barSize={20}>
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#52525b" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="taux" radius={[4, 4, 0, 0]}>
                  {fiHealth.map((e, i) => <Cell key={i} fill={e.taux >= 70 ? "#10b981" : e.taux >= 40 ? "#3b82f6" : "#f59e0b"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* OKR progression par pôle */}
      <GlassCard delay={0.45}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Avancement</p>
            <p className="text-sm font-semibold text-white">OKR en cours — tous pôles</p>
          </div>
          <Link to={createPageUrl("GouvMasterPlan")} className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1">Gérer <ArrowUpRight className="w-3 h-3" /></Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {okrs.filter(o => o.statut === "en_cours").slice(0, 8).map(okr => {
            const p = okr.objectif_cible > 0 ? Math.min(100, Math.round((okr.valeur_actuelle / okr.objectif_cible) * 100)) : 0;
            const c = p >= 80 ? "#10b981" : p >= 50 ? "#3b82f6" : "#f59e0b";
            return (
              <div key={okr.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-300 truncate">{okr.titre}</p>
                  <p className="text-[10px] text-zinc-600 uppercase">{okr.pole?.replace(/_/g, " ")}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: c }} />
                  </div>
                  <span className="text-xs font-black w-8 text-right" style={{ color: c }}>{p}%</span>
                </div>
              </div>
            );
          })}
          {okrs.filter(o => o.statut === "en_cours").length === 0 && (
            <p className="text-sm text-zinc-600 py-4 col-span-2 text-center">Aucun OKR en cours</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}