import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Users, Home, TrendingUp, Activity, CheckCircle2, PauseCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const GlassCard = ({ children, className = "" }) => (
  <div
    className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px) saturate(1.4)" }}
  >
    {children}
  </div>
);

const STATUS_CONFIG = {
  active:    { label: "Actives",    color: "#10b981", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  en_pause:  { label: "En pause",   color: "#f59e0b", bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",      icon: PauseCircle  },
  fermee:    { label: "Fermées",    color: "#ef4444", bg: "bg-red-500/10 text-red-400 border-red-500/30",             icon: XCircle      },
};

const PIPELINE_COLORS = {
  passif:       "#71717a",
  regulier:     "#3b82f6",
  disciple:     "#8b5cf6",
  reproducteur: "#f59e0b",
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-xs text-white shadow-xl">
      <p className="font-semibold">{payload[0].name}</p>
      <p className="text-zinc-400">{payload[0].value} FI</p>
    </div>
  );
};

export default function FIStatsPage() {
  const { data: familles = [], isLoading: loadingFI } = useQuery({
    queryKey: ["fi-stats-familles"],
    queryFn: () => base44.entities.FamilleImpact.list(),
  });

  const { data: membres = [], isLoading: loadingMembres } = useQuery({
    queryKey: ["fi-stats-membres"],
    queryFn: () => base44.entities.Membre.list(),
  });

  const loading = loadingFI || loadingMembres;

  // Répartition des statuts (donut)
  const statusData = useMemo(() => {
    const counts = { active: 0, en_pause: 0, fermee: 0 };
    familles.forEach(f => { if (counts[f.status] !== undefined) counts[f.status]++; });
    return Object.entries(counts).map(([key, value]) => ({
      name: STATUS_CONFIG[key].label,
      value,
      color: STATUS_CONFIG[key].color,
    }));
  }, [familles]);

  // Taux de remplissage par FI (bar chart)
  const fillData = useMemo(() => {
    return familles
      .filter(f => f.status === "active")
      .map(f => {
        const count = membres.filter(m => m.famille_impact_id === f.id).length;
        const objectif = f.objectif_membres || 12;
        const taux = Math.min(Math.round((count / objectif) * 100), 100);
        return { name: f.name.length > 16 ? f.name.slice(0, 14) + "…" : f.name, taux, count, objectif };
      })
      .sort((a, b) => b.taux - a.taux);
  }, [familles, membres]);

  // KPIs globaux
  const totalActives = familles.filter(f => f.status === "active").length;
  const totalMembres = membres.length;
  const avgFill = useMemo(() => {
    if (!familles.length) return 0;
    const totaux = familles.filter(f => f.status === "active").map(f => {
      const count = membres.filter(m => m.famille_impact_id === f.id).length;
      return Math.min((count / (f.objectif_membres || 12)) * 100, 100);
    });
    return totaux.length ? Math.round(totaux.reduce((a, b) => a + b, 0) / totaux.length) : 0;
  }, [familles, membres]);

  // Répartition pipeline globale
  const pipelineGlobal = useMemo(() => {
    const counts = { passif: 0, regulier: 0, disciple: 0, reproducteur: 0 };
    membres.forEach(m => { if (counts[m.statut_pipeline] !== undefined) counts[m.statut_pipeline]++; });
    return Object.entries(counts).map(([k, v]) => ({ name: k, value: v, color: PIPELINE_COLORS[k] }));
  }, [membres]);

  // FI les plus récentes (créées en dernier)
  const recentFIs = useMemo(() =>
    [...familles]
      .filter(f => f.date_ouverture)
      .sort((a, b) => new Date(b.date_ouverture) - new Date(a.date_ouverture))
      .slice(0, 5),
    [familles]
  );

  // FI les plus actives (plus de membres)
  const topFIs = useMemo(() =>
    familles
      .filter(f => f.status === "active")
      .map(f => ({ ...f, nbMembres: membres.filter(m => m.famille_impact_id === f.id).length }))
      .sort((a, b) => b.nbMembres - a.nbMembres)
      .slice(0, 5),
    [familles, membres]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-t-2 border-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Vue Globale</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Dashboard FI</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Statistiques consolidées sur toutes les Familles d'Impact</p>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "FI Actives",       value: totalActives,         icon: Home,       color: "text-emerald-400", border: "border-emerald-500/20" },
          { label: "Total Membres",    value: totalMembres,         icon: Users,      color: "text-blue-400",    border: "border-blue-500/20"    },
          { label: "Remplissage Moy.", value: `${avgFill}%`,        icon: TrendingUp, color: avgFill >= 70 ? "text-emerald-400" : "text-amber-400", border: "" },
          { label: "Total FI",         value: familles.length,      icon: Activity,   color: "text-violet-400",  border: "border-violet-500/20"  },
        ].map(({ label, value, icon: Icon, color, border }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05 }}>
            <GlassCard className={cn("border", border || "border-white/[0.07]")}>
              <div className="flex items-center gap-3">
                <Icon className={cn("w-5 h-5 flex-shrink-0", color)} />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider leading-tight">{label}</p>
                  <p className={cn("text-2xl font-black", color)}>{value}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Donut statuts + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="h-full">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-0.5">Statuts</p>
            <p className="text-sm font-semibold text-white mb-4">Répartition des FI</p>
            <div className="flex items-center gap-6">
              <div className="h-52 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                  const count = familles.filter(f => f.status === key).length;
                  const Icon = cfg.icon;
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                      <div>
                        <p className="text-xs font-semibold text-white">{count}</p>
                        <p className="text-[10px] text-zinc-500">{cfg.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Pipeline global */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <GlassCard className="h-full">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-0.5">Transformation</p>
            <p className="text-sm font-semibold text-white mb-4">Pipeline Global</p>
            <div className="space-y-3 pt-1">
              {pipelineGlobal.map(({ name, value, color }) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-zinc-300 font-medium">{name}</span>
                    <span className="font-black text-white">{value}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: totalMembres > 0 ? `${(value / totalMembres) * 100}%` : "0%", background: color }}
                    />
                  </div>
                </div>
              ))}
              {totalMembres === 0 && <p className="text-sm text-zinc-600 text-center py-6">Aucun membre enregistré</p>}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Bar chart remplissage */}
      {fillData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-0.5">Capacité</p>
            <p className="text-sm font-semibold text-white mb-4">Taux de remplissage par FI active (%)</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fillData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#fff", fontWeight: 700 }}
                    formatter={(v, _, props) => [`${v}% (${props.payload.count}/${props.payload.objectif})`, "Remplissage"]}
                  />
                  <Bar dataKey="taux" radius={[6, 6, 0, 0]}>
                    {fillData.map((entry, i) => (
                      <Cell key={i} fill={entry.taux >= 80 ? "#10b981" : entry.taux >= 50 ? "#3b82f6" : "#f59e0b"} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-3 justify-end">
              {[["#10b981", "≥ 80%"], ["#3b82f6", "50–79%"], ["#f59e0b", "< 50%"]].map(([color, label]) => (
                <span key={label} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
                  {label}
                </span>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* FI récentes + Top FI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top FI */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <GlassCard>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-0.5">Classement</p>
            <p className="text-sm font-semibold text-white mb-4">FI les plus actives</p>
            <div className="space-y-2">
              {topFIs.length === 0 && <p className="text-sm text-zinc-600 text-center py-6">Aucune FI active</p>}
              {topFIs.map((fi, i) => (
                <div key={fi.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/[0.04] hover:bg-white/[0.03] transition-all">
                  <span className="w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-black"
                    style={{ background: i === 0 ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.05)", color: i === 0 ? "#fbbf24" : "#71717a" }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-200 truncate">{fi.name}</p>
                    <p className="text-[10px] text-zinc-500">{fi.pilote_nom || fi.pilote_email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-blue-400">{fi.nbMembres}</p>
                    <p className="text-[10px] text-zinc-500">membres</p>
                  </div>
                  <div className="w-16">
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500/70"
                        style={{ width: `${Math.min((fi.nbMembres / (fi.objectif_membres || 12)) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-zinc-600 mt-0.5 text-right">
                      {Math.min(Math.round((fi.nbMembres / (fi.objectif_membres || 12)) * 100), 100)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* FI récentes */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <GlassCard>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-0.5">Récentes</p>
            <p className="text-sm font-semibold text-white mb-4">Dernières FI créées</p>
            <div className="space-y-2">
              {recentFIs.length === 0 && <p className="text-sm text-zinc-600 text-center py-6">Aucune date d'ouverture renseignée</p>}
              {recentFIs.map((fi) => {
                const cfg = STATUS_CONFIG[fi.status] || STATUS_CONFIG.active;
                const nbM = membres.filter(m => m.famille_impact_id === fi.id).length;
                return (
                  <div key={fi.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/[0.04] hover:bg-white/[0.03] transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-zinc-200 truncate">{fi.name}</p>
                        <Badge className={cn("text-[9px] border px-1.5 py-0", cfg.bg)}>{cfg.label}</Badge>
                      </div>
                      <p className="text-[10px] text-zinc-500">{fi.campus} · {fi.pilote_nom || fi.pilote_email}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-zinc-400">
                        {format(new Date(fi.date_ouverture), "d MMM yyyy", { locale: fr })}
                      </p>
                      <p className="text-[10px] text-zinc-600">{nbM} membres</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}