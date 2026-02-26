import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users, Home, TrendingUp, Target, ArrowUpRight, Zap,
  Globe, GraduationCap, Heart, Activity, CheckCircle2, BarChart2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import { format, subWeeks, startOfWeek, setDay } from "date-fns";
import { fr } from "date-fns/locale";

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"];

const GlassCard = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.45 }}
    className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px) saturate(1.4)" }}
  >{children}</motion.div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1117]/95 backdrop-blur-xl px-3 py-2 shadow-2xl text-xs">
      <p className="text-zinc-400 mb-0.5">{label}</p>
      <p className="font-black text-white">{payload[0].value}</p>
    </div>
  );
};

function getThursday(weeksAgo = 0) {
  const start = startOfWeek(subWeeks(new Date(), weeksAgo), { weekStartsOn: 1 });
  return format(setDay(start, 4, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export default function DefaultDashboard({ user }) {
  const { data: membres = [] } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: okrs = [] } = useQuery({ queryKey: ["okrs"], queryFn: () => base44.entities.OKR.list() });
  const { data: actions = [] } = useQuery({ queryKey: ["actions-evang"], queryFn: () => base44.entities.ActionEvangelisation.list() });
  const { data: saisies = [] } = useQuery({ queryKey: ["saisies-all"], queryFn: () => base44.entities.CliniqueSaisie.list("-semaine", 500) });

  const pipelineData = [
    { name: "Passifs", value: membres.filter(m => m.statut_pipeline === "passif").length },
    { name: "Réguliers", value: membres.filter(m => m.statut_pipeline === "regulier").length },
    { name: "Disciples", value: membres.filter(m => m.statut_pipeline === "disciple").length },
    { name: "Reproducteurs", value: membres.filter(m => m.statut_pipeline === "reproducteur").length },
  ];

  const activeFI = familles.filter(f => f.status === "active").length;
  const engages = membres.filter(m => m.statut_pipeline !== "passif").length;
  const discipesPct = membres.length > 0 ? Math.round((engages / membres.length) * 100) : 0;
  const actionsTerminees = actions.filter(a => a.statut === "termine");
  const totalConversions = actionsTerminees.reduce((s, a) => s + (a.conversions || 0), 0);
  const totalTouches = actionsTerminees.reduce((s, a) => s + (a.personnes_touchees || 0), 0);
  const conversionRate = totalTouches > 0 ? Math.round((totalConversions / totalTouches) * 100) : 0;

  // Présence globale cette semaine
  const thisWeek = getThursday(0);
  const saisiesThisWeek = saisies.filter(s => s.semaine === thisWeek);
  const presenceGlobale = membres.length > 0 ? Math.round((saisiesThisWeek.filter(s => s.presence).length / membres.length) * 100) : null;

  // Tendance présence 6 semaines
  const presenceTrend = Array.from({ length: 6 }, (_, i) => {
    const wStr = getThursday(5 - i);
    const wS = saisies.filter(s => s.semaine === wStr);
    return {
      week: wStr.slice(5),
      pct: membres.length > 0 ? Math.round((wS.filter(s => s.presence).length / membres.length) * 100) : 0
    };
  });

  // Radar pôles OKR
  const radarData = [
    { pole: "FI", value: okrs.filter(o => o.pole === "familles_impact").length },
    { pole: "Formation", value: okrs.filter(o => o.pole === "formation").length },
    { pole: "Évangé.", value: okrs.filter(o => o.pole === "evangelisation").length },
    { pole: "Comm.", value: okrs.filter(o => o.pole === "communication").length },
  ];

  const okrsEnCours = okrs.filter(o => o.statut === "en_cours");
  const avgOKR = okrsEnCours.length > 0
    ? Math.round(okrsEnCours.reduce((s, o) => s + (o.objectif_cible > 0 ? (o.valeur_actuelle / o.objectif_cible) * 100 : 0), 0) / okrsEnCours.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-[10px] font-bold text-blue-500/80 uppercase tracking-[0.25em] mb-2">O.S.P — Vision 2026</p>
        <h1 className="text-3xl font-black text-white tracking-tight">Mouvement des Familles d'Impact</h1>
        <p className="text-sm text-zinc-500 mt-1">{format(new Date(), "EEEE d MMMM yyyy", { locale: fr })} · Structuration · Conquête · Multiplication</p>
      </motion.div>

      {/* Vision Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.5 }}
        className="relative rounded-2xl border border-white/10 overflow-hidden p-5"
        style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.06) 50%, rgba(16,185,129,0.05) 100%)" }}
      >
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.15) 0%, transparent 60%)" }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400/80">Vision Fondatrice</p>
            </div>
            <p className="text-sm leading-relaxed text-zinc-300 max-w-2xl italic">
              "Voir émerger un Royaume visible, organisé, puissant et fécond, porté par une jeunesse engagée, transformée et capable de se multiplier."
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              ["Niveau I", "Direction", "text-amber-400", "bg-amber-400/10 border-amber-400/20"],
              ["Niveau II", "Gouvernance", "text-blue-400", "bg-blue-400/10 border-blue-400/20"],
              ["Niveau III", "Exécution", "text-emerald-400", "bg-emerald-400/10 border-emerald-400/20"]
            ].map(([n, l, tc, bc]) => (
              <div key={n} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${bc}`}>
                <p className={`text-[10px] font-black uppercase tracking-wider ${tc}`}>{n}</p>
                <div className="w-px h-3 bg-white/10" />
                <p className="text-xs text-zinc-400">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Âmes suivies", value: membres.length, sub: `${engages} engagés (${discipesPct}%)`, icon: Users, color: "text-blue-400", link: "FIDossiers", delay: 0.12 },
          { title: "FI Actives", value: activeFI, sub: `${familles.length} au total`, icon: Home, color: "text-emerald-400", link: "FIManager", delay: 0.16 },
          { title: "Conversions évang.", value: totalConversions, sub: `${conversionRate}% de taux (${totalTouches} touchés)`, icon: Globe, color: "text-cyan-400", link: "EvangelisationROI", delay: 0.2 },
          { title: "OKR progression", value: `${avgOKR}%`, sub: `${okrsEnCours.length} en cours`, icon: Target, color: "text-amber-400", link: "GouvMasterPlan", delay: 0.24 },
        ].map(({ title, value, sub, icon: Icon, color, link, delay }) => (
          <Link key={title} to={createPageUrl(link)}>
            <GlassCard delay={delay} className="hover:border-white/[0.14] transition-all group cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
              </div>
              <p className={`text-3xl font-black ${color} tracking-tight`}>{value}</p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mt-1">{title}</p>
              {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
            </GlassCard>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline bar */}
        <GlassCard delay={0.3} className="lg:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">Pipeline de Transformation</p>
          <p className="text-sm font-semibold text-white mb-4">Passif → Reproducteur</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} barSize={32}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#52525b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {pipelineData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Répartition pie */}
        <GlassCard delay={0.35}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">Répartition</p>
          <p className="text-sm font-semibold text-white mb-2">Distribution Globale</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pipelineData.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={4} dataKey="value">
                  {pipelineData.map((_, i) => <Cell key={i} fill={COLORS[i]} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-1">
            {pipelineData.map((e, i) => (
              <div key={e.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-[10px] text-zinc-500">{e.name} ({e.value})</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* 2nd row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Présence trend */}
        <GlassCard delay={0.4} className="lg:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">Assiduité Globale</p>
          <p className="text-sm font-semibold text-white mb-4">Taux de présence · 6 semaines</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={presenceTrend}>
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#52525b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="pct" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* OKRs */}
        <GlassCard delay={0.44}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Objectifs</p>
              <p className="text-sm font-semibold text-white">OKR en cours</p>
            </div>
            <Link to={createPageUrl("GouvMasterPlan")} className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1">Voir <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-2.5">
            {okrsEnCours.slice(0, 5).map(okr => {
              const p = okr.objectif_cible > 0 ? Math.min(100, Math.round((okr.valeur_actuelle / okr.objectif_cible) * 100)) : 0;
              const c = p >= 80 ? "#10b981" : p >= 50 ? "#3b82f6" : "#f59e0b";
              return (
                <div key={okr.id}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-zinc-400 truncate max-w-[130px]">{okr.titre}</span>
                    <span className="font-bold" style={{ color: c }}>{p}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: c }} />
                  </div>
                </div>
              );
            })}
            {okrsEnCours.length === 0 && <p className="text-xs text-zinc-600 py-4 text-center">Aucun OKR en cours</p>}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}