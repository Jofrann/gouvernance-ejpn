import React, { useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { UserCheck, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { format, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const MONTHS = Array.from({ length: 4 }, (_, i) => format(subMonths(new Date(), i), "yyyy-MM")).reverse();

const GlassCard = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
    {children}
  </div>
);

export default function FormationAssiduitePage() {
  const queryClient = useQueryClient();
  
  const { data: livrables = [] } = useQuery({
    queryKey: ["livrables-assiduite"],
    queryFn: () => base44.entities.FormationLivrable.list("-date_soumission", 500),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  // Real-time subscriptions
  useEffect(() => {
    const unsub1 = base44.entities.FormationLivrable.subscribe(() => queryClient.invalidateQueries({ queryKey: ["livrables-assiduite"] }));
    const unsub2 = base44.entities.User.subscribe(() => queryClient.invalidateQueries({ queryKey: ["users"] }));
    return () => { unsub1(); unsub2(); };
  }, [queryClient]);

  const pilotes = users.filter((u) => ["pilote_fi", "copilote_fi", "etudiant"].includes(u.role));

  const stats = useMemo(() => {
    return pilotes.map((p) => {
      const pliv = livrables.filter((l) => l.pilote_email === p.email);
      const byMonth = MONTHS.map((m) => ({ mois: m, livrable: pliv.find((l) => l.mois_cycle === m) }));
      const submitted = pliv.length;
      const validated = pliv.filter((l) => l.statut === "valide").length;
      const avgNote = pliv.filter((l) => l.note != null).length > 0
        ? (pliv.filter((l) => l.note != null).reduce((a, l) => a + l.note, 0) / pliv.filter((l) => l.note != null).length).toFixed(1)
        : null;
      const lastMonthLivrable = pliv.find((l) => l.mois_cycle === MONTHS[MONTHS.length - 1]);
      const isAbsent = !lastMonthLivrable;
      return { pilote: p, byMonth, submitted, validated, avgNote, isAbsent };
    });
  }, [pilotes, livrables]);

  const absents = stats.filter((s) => s.isAbsent);
  const totalPilotes = pilotes.length;
  const enFormation = stats.filter((s) => s.submitted > 0).length;
  const tauxContinue = totalPilotes > 0 ? Math.round((enFormation / totalPilotes) * 100) : 0;

  return (
    <div className="px-6 py-10 max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-bold text-violet-400/80 uppercase tracking-[0.25em] mb-1">Formation</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Tableau d'Assiduité</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Suivi de la formation continue · {format(new Date(), "MMMM yyyy")}</p>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <div>
            <p className="text-xs text-zinc-500">Taux Formation Continue</p>
            <p className="text-3xl font-bold text-blue-400">{tauxContinue}%</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3">
          <Users className="w-5 h-5 text-zinc-500" />
          <div>
            <p className="text-xs text-zinc-500">Pilotes actifs ce mois</p>
            <p className="text-3xl font-bold text-white">{enFormation}/{totalPilotes}</p>
          </div>
        </GlassCard>
        <div className={cn("rounded-2xl border p-5 flex items-center gap-3", absents.length > 0 ? "border-red-500/20 bg-red-500/5" : "border-emerald-500/20 bg-emerald-500/5")}>
          <AlertTriangle className={cn("w-5 h-5", absents.length > 0 ? "text-red-400" : "text-emerald-400")} />
          <div>
            <p className="text-xs text-zinc-500">Absents ce mois</p>
            <p className={cn("text-3xl font-bold", absents.length > 0 ? "text-red-400" : "text-emerald-400")}>{absents.length}</p>
          </div>
        </div>
      </div>

      {/* Absents alert */}
      {absents.length > 0 && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <p className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Pilotes sans livrable ce mois</p>
          <div className="flex flex-wrap gap-2">
            {absents.map((s) => (
              <Badge key={s.pilote.id} className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs">{s.pilote.full_name || s.pilote.email}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Main table */}
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
        <div className="px-5 py-3 border-b border-white/[0.07]">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Matrice d'Assiduité — 4 derniers mois</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.07]">
              <tr>
                <th className="text-left py-2.5 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pilote</th>
                {MONTHS.map((m) => <th key={m} className="text-center py-2.5 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{format(new Date(m + "-01"), "MMM yy")}</th>)}
                <th className="text-center py-2.5 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Note moy.</th>
                <th className="text-right py-2.5 px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Complétion</th>
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 ? (
                <tr><td colSpan={MONTHS.length + 3} className="py-12 text-center text-zinc-600"><UserCheck className="w-8 h-8 mx-auto mb-2 text-zinc-700" />Aucun pilote en formation</td></tr>
              ) : stats.map(({ pilote, byMonth, submitted, validated, avgNote, isAbsent }) => (
                <tr key={pilote.id} className={cn("border-b border-white/[0.04] hover:bg-white/[0.02]", isAbsent && "bg-red-500/[0.03]")}>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-600/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                        {(pilote.full_name || pilote.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{pilote.full_name || pilote.email}</p>
                        <p className="text-[10px] text-zinc-600">{pilote.role}</p>
                      </div>
                    </div>
                  </td>
                  {byMonth.map(({ mois, livrable }) => (
                    <td key={mois} className="py-2.5 px-3 text-center">
                      {!livrable ? <span className="text-lg">⬜</span> : livrable.statut === "valide" ? <span className="text-lg">✅</span> : livrable.statut === "rejete" ? <span className="text-lg">❌</span> : <span className="text-lg">🕐</span>}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-center font-bold text-white">{avgNote ? `${avgNote}/20` : "—"}</td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-16 h-1.5 bg-white/5 rounded-full">
                        <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${MONTHS.length > 0 ? (submitted / MONTHS.length) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500">{submitted}/{MONTHS.length}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-white/[0.05] flex gap-4 text-[10px] text-zinc-600">
          <span>✅ Validé</span><span>❌ Rejeté</span><span>🕐 En attente</span><span>⬜ Non soumis</span>
        </div>
      </div>
    </div>
  );
}