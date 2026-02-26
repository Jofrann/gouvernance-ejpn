import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Heart, Users, TrendingDown, ClipboardList, ArrowUpRight, AlertTriangle } from "lucide-react";
import { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";
import { format, setDay, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";

const GlassCard = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}
    className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px) saturate(1.4)" }}
  >{children}</motion.div>
);

function getThisThursdayStr() {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return format(setDay(start, 4, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export default function PiloteDashboard({ user }) {
  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });

  const mesFamilles = familles.filter(f =>
    f.pilote_nom === user?.full_name || f.co_pilote_nom === user?.full_name ||
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

  const thisWeek = getThisThursdayStr();
  const saisiesSemaine = saisies.filter(s => s.semaine === thisWeek);
  const presenceRate = membres.length > 0 ? Math.round((saisiesSemaine.filter(s => s.presence).length / membres.length) * 100) : null;
  const alertes = membres.filter(m => detectChuteLivre(m.id, saisies));

  const avgSante = useMemo(() => {
    const vals = saisiesSemaine.flatMap(s => [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter(n => n != null));
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  }, [saisiesSemaine]);

  const completedSaisies = membres.filter(m => {
    const s = saisiesSemaine.find(s => s.membre_id === m.id);
    return s && s.note_temps !== null && s.note_temps !== undefined;
  }).length;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-[0.25em] mb-1">
          {firstFI ? firstFI.name : "Familles d'Impact"}
        </p>
        <h1 className="text-3xl font-black text-white tracking-tight">Tableau de Bord Pastoral</h1>
        <p className="text-sm text-zinc-500 mt-1">Santé · Présence · Alertes de soin</p>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Membres", value: membres.length, icon: Users, color: "text-blue-400" },
          { label: "Présence ce jeudi", value: presenceRate != null ? `${presenceRate}%` : "—", icon: Heart, color: presenceRate != null && presenceRate >= 70 ? "text-emerald-400" : "text-amber-400" },
          { label: "Santé moyenne", value: avgSante ? `${avgSante}/10` : "—", icon: TrendingDown, color: avgSante && parseFloat(avgSante) >= 7 ? "text-emerald-400" : "text-amber-400" },
          { label: "Alertes", value: alertes.length, icon: AlertTriangle, color: alertes.length > 0 ? "text-red-400" : "text-zinc-500" },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <GlassCard key={label} delay={0.1 + i * 0.05}>
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
                <p className={`text-3xl font-black ${color}`}>{value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tâches de la semaine */}
        <GlassCard delay={0.3}>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Cette semaine</p>
          <p className="text-sm font-semibold text-white mb-4">Tâches prioritaires</p>
          <div className="space-y-2">
            <Link to={createPageUrl("FIClinique")} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.03] transition-all group">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-200 group-hover:text-white">Saisie Clinique du Jeudi</p>
                  <p className="text-xs text-zinc-500">{completedSaisies}/{membres.length} membres évalués</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
            </Link>
            {alertes.length > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl border border-red-500/20 bg-red-500/5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-red-300">{alertes.length} alerte(s) Chute Libre</p>
                    <p className="text-xs text-zinc-500">Intervention pastorale urgente requise</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Membres en alerte */}
        <GlassCard delay={0.35}>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Alertes pastorales</p>
          <p className="text-sm font-semibold text-white mb-4">Membres à contacter</p>
          {alertes.length === 0 ? (
            <div className="py-8 text-center">
              <Heart className="w-8 h-8 text-emerald-400/30 mx-auto mb-2" />
              <p className="text-sm text-zinc-600">Tous les membres sont stables</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertes.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-red-500/20 bg-red-500/5">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-xs font-bold text-red-300">
                    {m.nom_complet?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{m.nom_complet}</p>
                    <p className="text-[10px] text-red-400">⚠ Chute Libre détectée</p>
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