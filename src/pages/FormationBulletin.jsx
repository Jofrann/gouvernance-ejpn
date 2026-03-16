import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Award, CheckCircle2, XCircle, Clock, TrendingUp, Star } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const STATUT_CONFIG = {
  soumis: { label: "Soumis", class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
  en_attente: { label: "En attente", class: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", icon: Clock },
  valide: { label: "Validé", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  rejete: { label: "Rejeté", class: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
};

const GlassCard = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
    {children}
  </div>
);

export default function FormationBulletinPage() {
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isResponsable = user?.role === "admin" || user?.role === "responsable_formation";

  const { data: allLivrables = [] } = useQuery({
    queryKey: ["all-livrables-bulletin"],
    queryFn: () => base44.entities.FormationLivrable.list("-created_date", 500),
    enabled: isResponsable,
  });

  const { data: myLivrables = [] } = useQuery({
    queryKey: ["my-livrables", user?.email],
    queryFn: () => user ? base44.entities.FormationLivrable.filter({ pilote_email: user.email }) : Promise.resolve([]),
    enabled: !!user && !isResponsable,
  });

  const livrables = isResponsable ? allLivrables : myLivrables;
  const validated = livrables.filter((l) => l.statut === "valide");
  const totalNotes = validated.filter((l) => l.note != null);
  const avgNote = totalNotes.length > 0 ? (totalNotes.reduce((a, l) => a + l.note, 0) / totalNotes.length).toFixed(1) : null;
  const completionRate = livrables.length > 0 ? Math.round((validated.length / livrables.length) * 100) : 0;

  const byPilote = {};
  if (isResponsable) {
    livrables.forEach((l) => {
      const key = l.pilote_email;
      if (!byPilote[key]) byPilote[key] = { email: key, nom: l.pilote_nom || key, livrables: [] };
      byPilote[key].livrables.push(l);
    });
  }

  return (
    <div className="px-6 py-10 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-bold text-violet-400/80 uppercase tracking-[0.25em] mb-1">Formation</p>
        <h1 className="text-2xl font-black text-white tracking-tight">{isResponsable ? "Bulletin de Formation" : "Mon Portfolio"}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{isResponsable ? "Synthèse de progression de tous les pilotes" : "Historique de vos livrables validés"}</p>
      </motion.div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="flex items-center gap-3">
          <Award className="w-5 h-5 text-amber-400" />
          <div>
            <p className="text-xs text-zinc-500">Livrables validés</p>
            <p className="text-2xl font-bold text-white">{validated.length}/{livrables.length}</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <div>
            <p className="text-xs text-zinc-500">Note moyenne</p>
            <p className="text-2xl font-bold text-white">{avgNote ? `${avgNote}/20` : "—"}</p>
          </div>
        </GlassCard>
        <GlassCard className="space-y-2 flex flex-col justify-center">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Taux de complétion</span>
            <span className="font-bold text-white">{completionRate}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${completionRate}%` }} />
          </div>
        </GlassCard>
      </div>

      {isResponsable ? (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
          <div className="px-5 py-3 border-b border-white/[0.07]">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Progression par Pilote</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  {["Pilote", "Soumis", "Validés", "Moy.", "Progression"].map((h) => (
                    <th key={h} className="text-left py-2 px-4 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.values(byPilote).map((p) => {
                  const pValidated = p.livrables.filter((l) => l.statut === "valide");
                  const pNotes = pValidated.filter((l) => l.note != null);
                  const pAvg = pNotes.length > 0 ? (pNotes.reduce((a, l) => a + l.note, 0) / pNotes.length).toFixed(1) : "—";
                  const pRate = Math.round((pValidated.length / Math.max(p.livrables.length, 1)) * 100);
                  return (
                    <tr key={p.email} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-2.5 px-4 font-medium text-white">{p.nom}</td>
                      <td className="py-2.5 px-4 text-center text-zinc-500">{p.livrables.length}</td>
                      <td className="py-2.5 px-4 text-center text-emerald-400 font-medium">{pValidated.length}</td>
                      <td className="py-2.5 px-4 text-center font-bold text-white">{pAvg !== "—" ? `${pAvg}/20` : "—"}</td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-20 h-1.5 bg-white/5 rounded-full"><div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${pRate}%` }} /></div>
                          <span className="text-xs text-zinc-500 w-8">{pRate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {Object.keys(byPilote).length === 0 && <tr><td colSpan={5} className="py-10 text-center text-zinc-600">Aucun livrable soumis</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Votre Portfolio</h2>
          {livrables.length === 0 ? (
            <GlassCard className="py-12 text-center">
              <Award className="w-10 h-10 mx-auto mb-2 text-zinc-700" />
              <p className="text-sm text-zinc-500">Aucun livrable soumis — commencez dès maintenant</p>
            </GlassCard>
          ) : (
            livrables.sort((a, b) => new Date(b.date_soumission) - new Date(a.date_soumission)).map((l) => {
              const cfg = STATUT_CONFIG[l.statut] || STATUT_CONFIG.soumis;
              const Icon = cfg.icon;
              return (
                <div key={l.id} className={cn("p-4 rounded-xl border", l.statut === "valide" ? "border-emerald-500/20 bg-emerald-500/5" : l.statut === "rejete" ? "border-red-500/20 bg-red-500/5" : "border-white/[0.07] bg-white/[0.025]")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg border", cfg.class.replace("text-", "border-").replace("bg-", "border-"))}>
                        <Icon className={cn("w-4 h-4", l.statut === "valide" ? "text-emerald-400" : l.statut === "rejete" ? "text-red-400" : "text-zinc-500")} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{l.titre_livrable}</p>
                        <p className="text-xs text-zinc-500">{l.mois_cycle} · V{l.version || 1} · soumis le {l.date_soumission}</p>
                        {l.commentaire_responsable && (
                          <p className="text-xs text-amber-400 mt-1.5 p-2 bg-amber-500/5 rounded border border-amber-500/20">💬 {l.commentaire_responsable}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={cn("text-[10px] border", cfg.class)}>{cfg.label}</Badge>
                      {l.note != null && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/50" />
                          <span className="text-sm font-bold text-white">{l.note}/20</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}