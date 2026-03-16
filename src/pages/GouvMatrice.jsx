import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";
import { motion } from "framer-motion";

const GlassCard = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
    {children}
  </div>
);

export default function GouvMatricePage() {
  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres-all"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: saisies = [] } = useQuery({ queryKey: ["all-saisies"], queryFn: () => base44.entities.CliniqueSaisie.list("-semaine", 1000) });
  const { data: actions = [] } = useQuery({ queryKey: ["actions"], queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 200) });
  const { data: livrables = [] } = useQuery({ queryKey: ["all-livrables-matrice"], queryFn: () => base44.entities.FormationLivrable.list("-date_soumission", 200) });

  const fiMatrix = useMemo(() => familles.map((fi) => {
    const fiMembres = membres.filter((m) => m.famille_impact_id === fi.id);
    const fiSaisies = saisies.filter((s) => s.famille_impact_id === fi.id);
    const recentSaisies = fiSaisies.slice(0, fiMembres.length * 4);
    const avgHealth = recentSaisies.length > 0 ? (() => {
      const notes = recentSaisies.flatMap((s) => [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter((n) => n != null));
      return notes.length > 0 ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : null;
    })() : null;
    const presenceRate = recentSaisies.length > 0 ? Math.round((recentSaisies.filter((s) => s.presence).length / recentSaisies.length) * 100) : null;
    const alertes = fiMembres.filter((m) => detectChuteLivre(m.id, fiSaisies)).length;
    const tauxRempli = Math.round((fiMembres.length / (fi.objectif_membres || 12)) * 100);
    const disciples = fiMembres.filter((m) => m.statut_pipeline === "disciple" || m.statut_pipeline === "reproducteur").length;
    const score = Math.round(((parseFloat(avgHealth) || 0) / 10) * 30 + ((presenceRate || 0) / 100) * 30 + (Math.min(tauxRempli, 100) / 100) * 25 + (alertes === 0 ? 15 : Math.max(0, 15 - alertes * 5)));
    return { fi, membres: fiMembres.length, avgHealth, presenceRate, alertes, tauxRempli, disciples, score };
  }).sort((a, b) => b.score - a.score), [familles, membres, saisies]);

  const radarData = [
    { axe: "Santé FI", value: fiMatrix.length > 0 ? Math.round(fiMatrix.reduce((s, f) => s + (parseFloat(f.avgHealth) || 0), 0) / fiMatrix.length * 10) : 0 },
    { axe: "Présence", value: fiMatrix.length > 0 ? Math.round(fiMatrix.reduce((s, f) => s + (f.presenceRate || 0), 0) / fiMatrix.length) : 0 },
    { axe: "Remplissage", value: fiMatrix.length > 0 ? Math.round(fiMatrix.reduce((s, f) => s + Math.min(f.tauxRempli, 100), 0) / fiMatrix.length) : 0 },
    { axe: "Évangé.", value: actions.filter((a) => a.debrief_complete).length > 0 ? Math.min(100, actions.filter((a) => a.debrief_complete).length * 10) : 0 },
    { axe: "Formation", value: livrables.filter((l) => l.statut === "valide").length > 0 ? Math.min(100, Math.round((livrables.filter((l) => l.statut === "valide").length / Math.max(livrables.length, 1)) * 100)) : 0 },
  ];

  return (
    <div className="px-6 py-10 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Gouvernance</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Évaluation vs Vision</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Matrice comparative des FI · Score de santé global</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Radar Global du Mouvement</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.07)" />
                <PolarAngleAxis dataKey="axe" tick={{ fontSize: 11, fill: "#71717a" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip formatter={(v) => [`${v}%`, ""]} contentStyle={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px", color: "#fff" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Classement des FI</p>
          <div className="space-y-2">
            {fiMatrix.length === 0 ? <p className="text-sm text-zinc-600 text-center py-8">Aucune FI</p> : fiMatrix.map((s, i) => (
              <div key={s.fi.id} className={cn("flex items-center gap-3 p-2.5 rounded-xl border",
                i === 0 ? "border-emerald-500/20 bg-emerald-500/5" : i === fiMatrix.length - 1 && fiMatrix.length > 1 ? "border-red-500/20 bg-red-500/5" : "border-white/[0.07] bg-white/[0.025]")}>
                <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                  i === 0 ? "bg-emerald-500/20 text-emerald-400" : i === fiMatrix.length - 1 && fiMatrix.length > 1 ? "bg-red-500/20 text-red-400" : "bg-white/10 text-zinc-400")}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{s.fi.name}</p>
                  <p className="text-[10px] text-zinc-500">{s.membres} membres · {s.presenceRate != null ? `${s.presenceRate}% présence` : "—"} · santé: {s.avgHealth || "—"}/10</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-lg font-bold", s.score >= 70 ? "text-emerald-400" : s.score >= 50 ? "text-amber-400" : "text-red-400")}>{s.score}</p>
                  <p className="text-[10px] text-zinc-600">/ 100</p>
                </div>
                {s.alertes > 0 && <Badge className="bg-red-500/10 text-red-400 text-[9px] border-red-500/20">⚠ {s.alertes}</Badge>}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Detailed table */}
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
        <div className="px-5 py-3 border-b border-white/[0.07]">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Tableau Comparatif Détaillé</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.07]"><tr>{["FI", "Campus", "Membres", "Remplissage", "Présence", "Santé Moy.", "Alertes", "Disciples", "Score"].map((h) => <th key={h} className="text-left py-2.5 px-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
            <tbody>
              {fiMatrix.map((s) => (
                <tr key={s.fi.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 font-medium text-white">{s.fi.name}</td>
                  <td className="py-2.5 px-3 text-zinc-500">{s.fi.campus || "—"}</td>
                  <td className="py-2.5 px-3 text-zinc-400">{s.membres}</td>
                  <td className="py-2.5 px-3"><span className={cn("font-medium", s.tauxRempli >= 80 ? "text-emerald-400" : s.tauxRempli >= 50 ? "text-amber-400" : "text-red-400")}>{s.tauxRempli}%</span></td>
                  <td className="py-2.5 px-3">{s.presenceRate != null ? <span className={cn("font-medium", s.presenceRate >= 70 ? "text-emerald-400" : s.presenceRate >= 50 ? "text-amber-400" : "text-red-400")}>{s.presenceRate}%</span> : "—"}</td>
                  <td className="py-2.5 px-3">{s.avgHealth ? <span className={cn("font-bold", parseFloat(s.avgHealth) >= 7 ? "text-emerald-400" : parseFloat(s.avgHealth) >= 5 ? "text-amber-400" : "text-red-400")}>{s.avgHealth}/10</span> : "—"}</td>
                  <td className="py-2.5 px-3">{s.alertes > 0 ? <Badge className="bg-red-500/10 text-red-400 text-[10px] border-red-500/20">⚠ {s.alertes}</Badge> : <span className="text-emerald-500">✓</span>}</td>
                  <td className="py-2.5 px-3 text-zinc-400">{s.disciples}</td>
                  <td className="py-2.5 px-3"><Badge className={cn("text-xs font-bold border", s.score >= 70 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : s.score >= 50 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>{s.score}/100</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}