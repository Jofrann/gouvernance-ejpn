import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  Crown, Target, FileCheck, Users, Home, ArrowUpRight, PenTool,
  TrendingUp, AlertTriangle, Heart, Globe, GraduationCap, Megaphone,
  Activity, CheckCircle2, Clock, BarChart2
} from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from "recharts";

const GlassCard = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.45 }}
    className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px) saturate(1.4)" }}
  >{children}</motion.div>
);

const KPICard = ({ label, value, sub, icon: Icon, color, delay, link }) => {
  const content = (
    <GlassCard delay={delay} className="hover:border-white/[0.14] transition-all cursor-pointer group">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl border`} style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        {link && <ArrowUpRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />}
      </div>
      <p className={`text-3xl font-black mt-3 ${color}`}>{value}</p>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-zinc-600 mt-1">{sub}</p>}
    </GlassCard>
  );
  return link ? <Link to={createPageUrl(link)}>{content}</Link> : content;
};

export default function TroneDashboard({ user }) {
  const { data: okrs = [] } = useQuery({ queryKey: ["okrs"], queryFn: () => base44.entities.OKR.list() });
  const { data: decrets = [] } = useQuery({ queryKey: ["decrets"], queryFn: () => base44.entities.Decret.list() });
  const { data: recommandations = [] } = useQuery({ queryKey: ["reco"], queryFn: () => base44.entities.Recommandation.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: actions = [] } = useQuery({ queryKey: ["actions-evang"], queryFn: () => base44.entities.ActionEvangelisation.list() });
  const { data: saisies = [] } = useQuery({ queryKey: ["saisies-all"], queryFn: () => base44.entities.CliniqueSaisie.list("-semaine", 500) });
  const { data: livrables = [] } = useQuery({ queryKey: ["livrables"], queryFn: () => base44.entities.FormationLivrable.list() });

  const okrsEnCours = okrs.filter(o => o.statut === "en_cours");
  const recoEnAttente = recommandations.filter(r => r.statut === "soumise");
  const fIActives = familles.filter(f => f.status === "active");
  const fIEnPause = familles.filter(f => f.status === "en_pause");

  // Pipeline stats
  const pipeline = {
    passif: membres.filter(m => m.statut_pipeline === "passif").length,
    regulier: membres.filter(m => m.statut_pipeline === "regulier").length,
    disciple: membres.filter(m => m.statut_pipeline === "disciple").length,
    reproducteur: membres.filter(m => m.statut_pipeline === "reproducteur").length,
  };
  const engagesTotal = pipeline.regulier + pipeline.disciple + pipeline.reproducteur;
  const engagesPct = membres.length > 0 ? Math.round((engagesTotal / membres.length) * 100) : 0;

  // Évangélisation stats
  const actionsTerminees = actions.filter(a => a.statut === "termine");
  const totalPersonnes = actionsTerminees.reduce((s, a) => s + (a.personnes_touchees || 0), 0);
  const totalConversions = actionsTerminees.reduce((s, a) => s + (a.conversions || 0), 0);

  // Santé moyenne globale (dernières saisies par membre)
  const avgGlobale = (() => {
    const map = {};
    [...saisies].sort((a, b) => new Date(b.semaine) - new Date(a.semaine)).forEach(s => {
      if (!map[s.membre_id] && s.presence) map[s.membre_id] = s;
    });
    const notes = Object.values(map).flatMap(s =>
      [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter(n => n != null)
    );
    return notes.length > 0 ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : null;
  })();

  // Formation livrable stats
  const livrablesEnAttente = livrables.filter(l => l.statut === "soumis").length;
  const livrablesValides = livrables.filter(l => l.statut === "valide").length;

  // Radar data per pole
  const poleRadar = [
    { pole: "FI", value: Math.min(100, Math.round((fIActives.length / Math.max(familles.length, 1)) * 100)) },
    { pole: "Formation", value: livrables.length > 0 ? Math.round((livrablesValides / livrables.length) * 100) : 0 },
    { pole: "Évangé.", value: actionsTerminees.length > 0 ? Math.min(100, Math.round((totalConversions / Math.max(totalPersonnes, 1)) * 100)) : 0 },
    { pole: "Pipeline", value: engagesPct },
    { pole: "OKR", value: okrs.length > 0 ? Math.round((okrs.filter(o => o.statut === "atteint").length / okrs.length) * 100) : 0 },
  ];

  // OKR par pôle
  const okrByPole = ["familles_impact", "formation", "evangelisation", "communication"].map(pole => ({
    name: pole.replace("_", " "),
    value: okrs.filter(o => o.pole === pole && o.statut === "en_cours").length,
  }));

  const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Crown className="w-4 h-4 text-amber-400" />
          <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-[0.25em]">Direction Souveraine</p>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Vue Globale du Mouvement</h1>
        <p className="text-sm text-zinc-500 mt-1">Synthèse stratégique · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </motion.div>

      {/* KPIs row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Âmes suivies" value={membres.length} sub={`${engagesPct}% engagés`} icon={Users} color="text-blue-400" delay={0.05} link="FIDossiers" />
        <KPICard label="FI Actives" value={fIActives.length} sub={fIEnPause.length > 0 ? `${fIEnPause.length} en pause` : `${familles.length} au total`} icon={Home} color="text-emerald-400" delay={0.1} link="FIManager" />
        <KPICard label="OKR en cours" value={okrsEnCours.length} sub={`${okrs.filter(o => o.statut === "atteint").length} atteints`} icon={Target} color="text-violet-400" delay={0.15} link="GouvMasterPlan" />
        <KPICard label="Reco. en attente" value={recoEnAttente.length} sub={`${recommandations.filter(r => r.statut === "approuvee").length} approuvées`} icon={FileCheck} color={recoEnAttente.length > 0 ? "text-amber-400" : "text-zinc-500"} delay={0.2} link="TroneValidation" />
      </div>

      {/* KPIs row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Santé globale" value={avgGlobale ? `${avgGlobale}/10` : "—"} sub="Moyenne clinique" icon={Heart} color={avgGlobale && parseFloat(avgGlobale) >= 7 ? "text-emerald-400" : "text-amber-400"} delay={0.25} />
        <KPICard label="Personnes touchées" value={totalPersonnes} sub={`${totalConversions} conversions`} icon={Globe} color="text-cyan-400" delay={0.28} link="EvangelisationROI" />
        <KPICard label="Livrables soumis" value={livrablesEnAttente} sub={`${livrablesValides} validés`} icon={GraduationCap} color={livrablesEnAttente > 0 ? "text-amber-400" : "text-zinc-500"} delay={0.31} link="FormationCorrection" />
        <KPICard label="Décrets publiés" value={decrets.filter(d => d.statut === "publie").length} sub={`${decrets.filter(d => d.statut === "brouillon").length} en brouillon`} icon={PenTool} color="text-rose-400" delay={0.34} link="TroneArchives" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Radar santé des pôles */}
        <GlassCard delay={0.38}>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Santé du Mouvement</p>
          <p className="text-sm font-semibold text-white mb-3">Performance par Pôle</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={poleRadar}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis dataKey="pole" tick={{ fontSize: 10, fill: "#71717a" }} />
                <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* OKR en cours */}
        <GlassCard delay={0.42} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Pilotage stratégique</p>
              <p className="text-sm font-semibold text-white">OKR en cours</p>
            </div>
            <Link to={createPageUrl("GouvMasterPlan")} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">Gérer <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-2.5">
            {okrsEnCours.slice(0, 5).map(okr => {
              const p = okr.objectif_cible > 0 ? Math.min(100, Math.round((okr.valeur_actuelle / okr.objectif_cible) * 100)) : 0;
              const c = p >= 80 ? "#10b981" : p >= 50 ? "#3b82f6" : "#f59e0b";
              return (
                <div key={okr.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-300 truncate">{okr.titre}</p>
                    <p className="text-[10px] text-zinc-600 uppercase">{okr.pole?.replace(/_/g, " ")}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-zinc-600">{okr.valeur_actuelle ?? 0}/{okr.objectif_cible} {okr.unite}</span>
                    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: c }} />
                    </div>
                    <span className="text-xs font-black w-8 text-right" style={{ color: c }}>{p}%</span>
                  </div>
                </div>
              );
            })}
            {okrsEnCours.length === 0 && <p className="text-sm text-zinc-600 py-4 text-center">Aucun OKR en cours</p>}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline */}
        <GlassCard delay={0.45}>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Transformation</p>
          <p className="text-sm font-semibold text-white mb-4">Pipeline des Âmes</p>
          <div className="space-y-2.5">
            {[
              { label: "Passifs", val: pipeline.passif, color: "bg-zinc-500/50" },
              { label: "Réguliers", val: pipeline.regulier, color: "bg-blue-500/60" },
              { label: "Disciples", val: pipeline.disciple, color: "bg-violet-500/60" },
              { label: "Reproducteurs", val: pipeline.reproducteur, color: "bg-amber-500/60" },
            ].map(({ label, val, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">{label}</span>
                  <span className="font-bold text-white">{val}</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${membres.length > 0 ? (val / membres.length) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Recommandations en attente */}
        <GlassCard delay={0.48}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Décisions</p>
              <p className="text-sm font-semibold text-white">Recommandations</p>
            </div>
            <Link to={createPageUrl("TroneValidation")} className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1">Valider <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          {recoEnAttente.length === 0 ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400/40 mx-auto mb-1.5" />
              <p className="text-xs text-zinc-600">Aucune recommandation en attente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recoEnAttente.slice(0, 4).map(r => (
                <div key={r.id} className="flex items-start gap-2.5 p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                  <FileCheck className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-300 truncate">{r.titre}</p>
                    <p className="text-[10px] text-zinc-500">{r.pole_concerne?.replace(/_/g, " ")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Derniers décrets */}
        <GlassCard delay={0.51}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Autorité</p>
              <p className="text-sm font-semibold text-white">Décrets récents</p>
            </div>
            <Link to={createPageUrl("TroneArchives")} className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1">Archives <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-2">
            {decrets.filter(d => d.statut === "publie").slice(0, 5).map(d => (
              <div key={d.id} className="flex items-center gap-2.5 p-2 rounded-lg border border-white/5 hover:border-white/10 transition-all">
                <PenTool className="w-3 h-3 text-rose-400/60 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-zinc-300 truncate">{d.titre}</p>
                  <p className="text-[10px] text-zinc-600 capitalize">{d.type}</p>
                </div>
              </div>
            ))}
            {decrets.filter(d => d.statut === "publie").length === 0 && (
              <p className="text-xs text-zinc-600 py-4 text-center">Aucun décret publié</p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}