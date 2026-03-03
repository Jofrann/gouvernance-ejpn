import React, { useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  Heart, Users, TrendingDown, ClipboardList, ArrowUpRight,
  AlertTriangle, Activity, MessageSquare, Clock, CheckCircle2,
  Calendar, Phone, UserCheck, BarChart2
} from "lucide-react";
import { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";
import { format, setDay, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from "recharts";

const GlassCard = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.45 }}
    className={`rounded-2xl border border-white/[0.09] p-5 ${className}`}
    style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.018) 100%)",
      backdropFilter: "blur(40px) saturate(1.7) brightness(1.05)",
      WebkitBackdropFilter: "blur(40px) saturate(1.7) brightness(1.05)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.12), 0 8px 32px rgba(0,0,0,0.32)"
    }}
  >{children}</motion.div>
);

function getThursday(weeksAgo = 0) {
  const start = startOfWeek(subWeeks(new Date(), weeksAgo), { weekStartsOn: 1 });
  return format(setDay(start, 4, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

const PIPELINE_COLORS = {
  passif: "bg-zinc-500/50 text-zinc-400",
  regulier: "bg-blue-500/60 text-blue-300",
  disciple: "bg-violet-500/60 text-violet-300",
  reproducteur: "bg-amber-500/60 text-amber-300",
};

export default function PiloteDashboard({ user }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const subs = [
      base44.entities.FamilleImpact.subscribe(() => queryClient.invalidateQueries({ queryKey: ["familles"] })),
      base44.entities.Membre.subscribe(() => queryClient.invalidateQueries({ queryKey: ["membres-fi"] })),
      base44.entities.CliniqueSaisie.subscribe(() => queryClient.invalidateQueries({ queryKey: ["saisies-fi-dash"] })),
      base44.entities.InteractionPastorale.subscribe(() => queryClient.invalidateQueries({ queryKey: ["interactions-fi"] })),
    ];
    return () => subs.forEach(u => u());
  }, [queryClient]);

  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });

  const mesFamilles = familles.filter(f =>
    f.pilote_email === user?.email || f.co_pilote_email === user?.email
  );
  const firstFI = mesFamilles[0];

  const { data: membres = [] } = useQuery({
    queryKey: ["membres-fi", firstFI?.id],
    queryFn: () => firstFI ? base44.entities.Membre.filter({ famille_impact_id: firstFI.id }) : Promise.resolve([]),
    enabled: !!firstFI,
  });

  const { data: saisies = [] } = useQuery({
    queryKey: ["saisies-fi-dash", firstFI?.id],
    queryFn: () => firstFI ? base44.entities.CliniqueSaisie.filter({ famille_impact_id: firstFI.id }) : Promise.resolve([]),
    enabled: !!firstFI,
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["interactions-fi", firstFI?.id],
    queryFn: () => firstFI
      ? base44.entities.InteractionPastorale.filter({ famille_impact_id: firstFI.id })
      : Promise.resolve([]),
    enabled: !!firstFI,
  });

  const thisWeek = getThursday(0);
  const saisiesSemaine = saisies.filter(s => s.semaine === thisWeek);
  const presenceThisWeek = saisiesSemaine.filter(s => s.presence).length;
  const presenceRate = membres.length > 0 ? Math.round((presenceThisWeek / membres.length) * 100) : null;
  const alertes = membres.filter(m => detectChuteLivre(m.id, saisies));

  const avgSante = useMemo(() => {
    const vals = saisiesSemaine.flatMap(s =>
      [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter(n => n != null)
    );
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  }, [saisiesSemaine]);

  const completedSaisies = membres.filter(m => {
    const s = saisiesSemaine.find(s => s.membre_id === m.id);
    return s && s.note_temps !== null && s.note_temps !== undefined;
  }).length;

  // Tendance présence sur 8 semaines
  const presenceTrend = Array.from({ length: 8 }, (_, i) => {
    const weekStr = getThursday(7 - i);
    const wSaisies = saisies.filter(s => s.semaine === weekStr);
    const pct = membres.length > 0 ? Math.round((wSaisies.filter(s => s.presence).length / membres.length) * 100) : 0;
    return { week: weekStr.slice(5), pct };
  });

  // Santé moyenne par dimension
  const avgDimensions = useMemo(() => {
    const dims = ["note_temps", "note_finances", "note_emotions", "note_spirituel"];
    const labels = ["Temps", "Finances", "Émotions", "Spirituel"];
    return labels.map((label, i) => {
      const vals = saisiesSemaine.map(s => s[dims[i]]).filter(n => n != null);
      return { dim: label, value: vals.length > 0 ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0 };
    });
  }, [saisiesSemaine]);

  // Pipeline
  const pipeline = ["passif", "regulier", "disciple", "reproducteur"].map(s => ({
    label: s,
    count: membres.filter(m => m.statut_pipeline === s).length,
  }));

  // Interactions en attente de suivi
  const interactionsSuivi = interactions.filter(i => i.suivi_requis && !i.suivi_fait);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-[0.25em] mb-1">
          {mesFamilles.length > 0 ? mesFamilles.map(f => f.name).join(" · ") : "Familles d'Impact"}
        </p>
        <h1 className="text-3xl font-light text-white tracking-tight">Tableau de <span className="font-black">Bord</span> Pastoral</h1>
        <p className="text-sm text-zinc-500 mt-1 font-light leading-relaxed">Santé · Présence · Alertes · {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}</p>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Membres", value: membres.length, sub: `${membres.filter(m => m.potentiel_formation).length} potentiel formation`, icon: Users, color: "text-blue-400" },
          { label: "Présence ce jeudi", value: presenceRate != null ? `${presenceRate}%` : "—", sub: `${presenceThisWeek}/${membres.length} présents`, icon: Heart, color: presenceRate != null && presenceRate >= 70 ? "text-emerald-400" : "text-amber-400" },
          { label: "Santé moyenne", value: avgSante ? `${avgSante}/10` : "—", sub: "Clinique hebdo", icon: Activity, color: avgSante && parseFloat(avgSante) >= 7 ? "text-emerald-400" : "text-amber-400" },
          { label: "Alertes", value: alertes.length, sub: interactionsSuivi.length > 0 ? `${interactionsSuivi.length} suivi(s) en attente` : "Aucun suivi requis", icon: AlertTriangle, color: alertes.length > 0 ? "text-red-400" : "text-zinc-500" },
        ].map(({ label, value, sub, icon: Icon, color }, i) => (
          <GlassCard key={label} delay={0.05 + i * 0.05}>
            <div className={`p-2 rounded-lg inline-flex mb-2`} style={{ background: "rgba(255,255,255,0.04)" }}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{label}</p>
            {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tendance présence */}
        <GlassCard delay={0.25} className="lg:col-span-2">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Évolution</p>
          <p className="text-sm font-semibold text-white mb-4">Présence · 8 dernières semaines</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={presenceTrend}>
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#52525b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="rounded-xl border border-white/10 bg-[#0f1117]/95 px-3 py-2 text-xs">
                        <p className="text-zinc-400">{label}</p>
                        <p className="text-white font-black">{payload[0].value}%</p>
                      </div>
                    ) : null
                  }
                />
                <Line type="monotone" dataKey="pct" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Santé par dimension */}
        <GlassCard delay={0.3}>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Cette semaine</p>
          <p className="text-sm font-semibold text-white mb-3">Santé par Dimension</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={avgDimensions}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 9, fill: "#71717a" }} />
                <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tâches de la semaine */}
        <GlassCard delay={0.35}>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Priorités</p>
          <p className="text-sm font-semibold text-white mb-3">Cette semaine</p>
          <div className="space-y-2">
            <Link to={createPageUrl("FIClinique")} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.03] transition-all group">
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-zinc-200 group-hover:text-white">Saisie Clinique</p>
                  <p className="text-[10px] text-zinc-500">{completedSaisies}/{membres.length} membres évalués</p>
                </div>
              </div>
              <div className={cn("w-2 h-2 rounded-full", completedSaisies >= membres.length && membres.length > 0 ? "bg-emerald-400" : "bg-amber-400")} />
            </Link>
            <Link to={createPageUrl("FIDossiers")} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.03] transition-all group">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-zinc-200 group-hover:text-white">Journal Pastoral</p>
                  <p className="text-[10px] text-zinc-500">{interactionsSuivi.length} suivi(s) requis</p>
                </div>
              </div>
              <div className={cn("w-2 h-2 rounded-full", interactionsSuivi.length > 0 ? "bg-amber-400" : "bg-emerald-400")} />
            </Link>
            {alertes.length > 0 && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl border border-red-500/20 bg-red-500/5">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-red-300">{alertes.length} Chute Libre</p>
                  <p className="text-[10px] text-zinc-500">Intervention urgente</p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Pipeline */}
        <GlassCard delay={0.38}>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Transformation</p>
          <p className="text-sm font-semibold text-white mb-4">Pipeline des Membres</p>
          <div className="space-y-2.5">
            {pipeline.map(({ label, count }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400 capitalize">{label}</span>
                  <span className="font-bold text-white">{count}</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${PIPELINE_COLORS[label]?.split(" ")[0]}`}
                    style={{ width: `${membres.length > 0 ? (count / membres.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Membres en alerte */}
        <GlassCard delay={0.41}>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Alertes pastorales</p>
          <p className="text-sm font-semibold text-white mb-3">À contacter</p>
          {alertes.length === 0 ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-400/30 mx-auto mb-2" />
              <p className="text-xs text-zinc-600">Tous les membres sont stables</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertes.slice(0, 5).map(m => (
                <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-red-500/20 bg-red-500/5">
                  <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-xs font-bold text-red-300 flex-shrink-0">
                    {m.nom_complet?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-200 truncate">{m.nom_complet}</p>
                    <p className="text-[10px] text-red-400">⚠ Chute Libre</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}