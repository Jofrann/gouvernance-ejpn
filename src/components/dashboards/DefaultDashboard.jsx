import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Users, Home, TrendingUp, Target, ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

const GlassCard = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}
    className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px) saturate(1.4)" }}
  >{children}</motion.div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1117]/95 backdrop-blur-xl px-4 py-3 shadow-2xl">
      <p className="text-xs font-semibold text-zinc-300 mb-1">{label}</p>
      <p className="text-lg font-black text-white">{payload[0].value}</p>
    </div>
  );
};

export default function DefaultDashboard({ user }) {
  const { data: membres = [] } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: okrs = [] } = useQuery({ queryKey: ["okrs"], queryFn: () => base44.entities.OKR.list() });

  const pipelineData = [
    { name: "Passifs", value: membres.filter(m => m.statut_pipeline === "passif").length },
    { name: "Réguliers", value: membres.filter(m => m.statut_pipeline === "regulier").length },
    { name: "Disciples", value: membres.filter(m => m.statut_pipeline === "disciple").length },
    { name: "Reproducteurs", value: membres.filter(m => m.statut_pipeline === "reproducteur").length },
  ];

  const activeFI = familles.filter(f => f.status === "active").length;
  const discipesPct = membres.length > 0 ? Math.round((membres.filter(m => m.statut_pipeline !== "passif").length / membres.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-[10px] font-bold text-blue-500/80 uppercase tracking-[0.25em] mb-2">O.S.P — Vision 2026</p>
        <h1 className="text-3xl font-black text-white tracking-tight">Mouvement des Familles d'Impact</h1>
        <p className="text-sm text-zinc-500 mt-1">Structuration · Conquête · Multiplication consciente</p>
      </motion.div>

      {/* Vision Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
        className="relative rounded-2xl border border-white/10 overflow-hidden p-6"
        style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.06) 50%, rgba(16,185,129,0.05) 100%)" }}
      >
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.15) 0%, transparent 60%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400/80">Vision Fondatrice</p>
          </div>
          <p className="text-sm leading-relaxed text-zinc-300 max-w-3xl italic">
            "Voir émerger un Royaume visible, organisé, puissant et fécond, porté par une jeunesse engagée, transformée et capable de se multiplier."
          </p>
          <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-white/10">
            {[["Niveau I", "Direction Souveraine", "text-amber-400", "bg-amber-400/10 border-amber-400/20"],
              ["Niveau II", "Gouvernance & Traduction", "text-blue-400", "bg-blue-400/10 border-blue-400/20"],
              ["Niveau III", "Exécution & Terrain", "text-emerald-400", "bg-emerald-400/10 border-emerald-400/20"]].map(([n, l, tc, bc]) => (
              <div key={n} className={`flex items-center gap-2.5 rounded-lg border px-3 py-1.5 ${bc}`}>
                <p className={`text-[10px] font-black uppercase tracking-wider ${tc}`}>{n}</p>
                <div className="w-px h-3 bg-white/10" />
                <p className="text-xs text-zinc-400">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Âmes suivies", value: membres.length, icon: Users, color: "text-blue-400", trend: "+12%", up: true, delay: 0.15 },
          { title: "Maisons actives", value: activeFI, icon: Home, color: "text-emerald-400", delay: 0.2 },
          { title: "Pipeline disciples", value: `${discipesPct}%`, icon: TrendingUp, color: "text-violet-400", trend: "+3.2%", up: true, delay: 0.25 },
          { title: "OKR en cours", value: okrs.filter(o => o.statut === "en_cours").length, icon: Target, color: "text-amber-400", delay: 0.3 },
        ].map(({ title, value, icon: Icon, color, trend, up, delay }) => (
          <GlassCard key={title} delay={delay}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">{title}</p>
                <p className={`text-4xl font-black ${color} tracking-tight`}>{value}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
            {trend && (
              <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-white/5">
                {up ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />}
                <span className={`text-xs font-bold ${up ? "text-emerald-400" : "text-red-400"}`}>{trend}</span>
                <span className="text-xs text-zinc-600">vs mois dernier</span>
              </div>
            )}
          </GlassCard>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard delay={0.35}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">Pipeline de Transformation</p>
          <p className="text-sm font-semibold text-white mb-5">Passif → Reproducteur</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} barSize={36}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#52525b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {pipelineData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard delay={0.4}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">Répartition des Statuts</p>
          <p className="text-sm font-semibold text-white mb-2">Distribution Globale</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pipelineData.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {pipelineData.map((_, i) => <Cell key={i} fill={COLORS[i]} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center flex-wrap gap-4 mt-1">
            {pipelineData.map((e, i) => (
              <div key={e.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs text-zinc-500">{e.name}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* OKRs */}
      <GlassCard delay={0.45}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">Objectifs du Cycle</p>
        <p className="text-sm font-semibold text-white mb-5">OKR en cours</p>
        {okrs.filter(o => o.statut === "en_cours").length === 0 ? (
          <p className="text-sm text-zinc-600 py-10 text-center">Aucun OKR en cours</p>
        ) : (
          <div className="space-y-3">
            {okrs.filter(o => o.statut === "en_cours").slice(0, 5).map(okr => {
              const p = okr.objectif_cible > 0 ? Math.min(100, Math.round((okr.valeur_actuelle / okr.objectif_cible) * 100)) : 0;
              const barColor = p >= 80 ? "#10b981" : p >= 50 ? "#3b82f6" : "#f59e0b";
              return (
                <div key={okr.id} className="flex items-center gap-4 p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-200 truncate">{okr.titre}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-wider">{okr.pole?.replace(/_/g, " ")}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, backgroundColor: barColor }} />
                    </div>
                    <span className="text-xs font-black text-zinc-300 w-10 text-right tabular-nums">{p}%</span>
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