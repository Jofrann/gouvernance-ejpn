import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Crown, Target, FileCheck, TrendingUp, Users, Home, ArrowUpRight, PenTool } from "lucide-react";

const GlassCard = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}
    className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px) saturate(1.4)" }}
  >{children}</motion.div>
);

export default function TroneDashboard({ user }) {
  const { data: okrs = [] } = useQuery({ queryKey: ["okrs"], queryFn: () => base44.entities.OKR.list() });
  const { data: decrets = [] } = useQuery({ queryKey: ["decrets"], queryFn: () => base44.entities.Decret.list() });
  const { data: recommandations = [] } = useQuery({ queryKey: ["reco"], queryFn: () => base44.entities.Recommandation.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });

  const okrsEnCours = okrs.filter(o => o.statut === "en_cours");
  const recoEnAttente = recommandations.filter(r => r.statut === "soumise");

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Crown className="w-4 h-4 text-amber-400" />
          <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-[0.25em]">Tableau de Bord — Direction Souveraine</p>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Vue Globale du Mouvement</h1>
        <p className="text-sm text-zinc-500 mt-1">Décrets · OKR · Recommandations · État du terrain</p>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Âmes suivies", value: membres.length, icon: Users, color: "text-blue-400" },
          { label: "FI Actives", value: familles.filter(f => f.status === "active").length, icon: Home, color: "text-emerald-400" },
          { label: "OKR en cours", value: okrsEnCours.length, icon: Target, color: "text-violet-400" },
          { label: "Reco. en attente", value: recoEnAttente.length, icon: FileCheck, color: recoEnAttente.length > 0 ? "text-amber-400" : "text-zinc-500" },
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
        {/* OKRs */}
        <GlassCard delay={0.3}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Pilotage stratégique</p>
              <p className="text-sm font-semibold text-white">OKR en cours</p>
            </div>
            <Link to={createPageUrl("GouvMasterPlan")} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">Gérer <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-3">
            {okrsEnCours.slice(0, 5).map(okr => {
              const p = okr.objectif_cible > 0 ? Math.min(100, Math.round((okr.valeur_actuelle / okr.objectif_cible) * 100)) : 0;
              const c = p >= 80 ? "#10b981" : p >= 50 ? "#3b82f6" : "#f59e0b";
              return (
                <div key={okr.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-300 truncate">{okr.titre}</p>
                    <p className="text-[10px] text-zinc-600 uppercase">{okr.pole?.replace(/_/g, " ")}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: c }} />
                    </div>
                    <span className="text-xs font-black text-zinc-400 w-8 text-right">{p}%</span>
                  </div>
                </div>
              );
            })}
            {okrsEnCours.length === 0 && <p className="text-sm text-zinc-600 py-4 text-center">Aucun OKR en cours</p>}
          </div>
        </GlassCard>

        {/* Recommandations & Décrets */}
        <GlassCard delay={0.35}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Décisions</p>
              <p className="text-sm font-semibold text-white">Recommandations & Décrets</p>
            </div>
            <Link to={createPageUrl("TroneValidation")} className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1">Valider <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-2">
            {recoEnAttente.length === 0 && <p className="text-xs text-zinc-600 py-2">Aucune recommandation en attente</p>}
            {recoEnAttente.slice(0, 4).map(r => (
              <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <FileCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-300 truncate">{r.titre}</p>
                  <p className="text-[10px] text-zinc-500">{r.pole_concerne?.replace(/_/g, " ")} · {r.auteur_email}</p>
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-white/5">
              <p className="text-[10px] text-zinc-500 mb-2">Derniers Décrets publiés</p>
              {decrets.filter(d => d.statut === "publie").slice(0, 3).map(d => (
                <div key={d.id} className="flex items-center gap-2 py-1.5">
                  <PenTool className="w-3 h-3 text-blue-400/60" />
                  <p className="text-xs text-zinc-400 truncate">{d.titre}</p>
                </div>
              ))}
              {decrets.filter(d => d.statut === "publie").length === 0 && <p className="text-xs text-zinc-600">Aucun décret publié</p>}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}