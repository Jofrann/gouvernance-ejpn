import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { UserCheck, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { format, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const MONTHS = Array.from({ length: 4 }, (_, i) => format(subMonths(new Date(), i), "yyyy-MM")).reverse();

export default function FormationAssiduitePage() {
  useTrackActivity("FormationAssiduite");

  const { data: livrables = [] } = useQuery({
    queryKey: ["livrables-assiduite"],
    queryFn: () => base44.entities.FormationLivrable.list("-date_soumission", 500),
    refetchInterval: 30000,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const pilotes = users.filter(u => ["pilote_fi", "copilote_fi", "etudiant"].includes(u.role));

  const stats = useMemo(() =>
    pilotes.map(p => {
      const pliv = livrables.filter(l => l.pilote_email === p.email);
      const byMonth = MONTHS.map(m => ({ mois: m, livrable: pliv.find(l => l.mois_cycle === m) }));
      const submitted = pliv.length;
      const validated = pliv.filter(l => l.statut === "valide").length;
      const notedOnes = pliv.filter(l => l.note != null);
      const avgNote = notedOnes.length > 0 ? (notedOnes.reduce((a, l) => a + l.note, 0) / notedOnes.length).toFixed(1) : null;
      const isAbsent = !pliv.find(l => l.mois_cycle === MONTHS[MONTHS.length - 1]);
      return { pilote: p, byMonth, submitted, validated, avgNote, isAbsent };
    }), [pilotes, livrables]);

  const absents = stats.filter(s => s.isAbsent);
  const enFormation = stats.filter(s => s.submitted > 0).length;
  const tauxContinue = pilotes.length > 0 ? Math.round((enFormation / pilotes.length) * 100) : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-bold text-white">Tableau d'Assiduité</h1>
          <p className="text-xs text-zinc-600">Suivi de la formation continue · {format(new Date(), "MMMM yyyy", { locale: fr })}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="ai-card rounded-xl border border-blue-500/20 bg-blue-900/10 p-4 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xs text-zinc-600">Taux Formation Continue</p>
              <p className="text-3xl font-bold text-blue-400">{tauxContinue}%</p>
            </div>
          </div>
          <div className="ai-card rounded-xl border border-white/8 p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-zinc-500" />
            <div>
              <p className="text-xs text-zinc-600">Actifs ce mois</p>
              <p className="text-3xl font-bold text-white">{enFormation}/{pilotes.length}</p>
            </div>
          </div>
          <div className={cn("ai-card rounded-xl border p-4 flex items-center gap-3",
            absents.length > 0 ? "border-red-500/20 bg-red-900/10" : "border-emerald-500/20 bg-emerald-900/10")}>
            <AlertTriangle className={cn("w-5 h-5", absents.length > 0 ? "text-red-400" : "text-emerald-400")} />
            <div>
              <p className="text-xs text-zinc-600">Absents ce mois</p>
              <p className={cn("text-3xl font-bold", absents.length > 0 ? "text-red-400" : "text-emerald-400")}>{absents.length}</p>
            </div>
          </div>
        </div>

        {/* Absents alert */}
        {absents.length > 0 && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-900/10">
            <p className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Pilotes sans livrable ce mois
            </p>
            <div className="flex flex-wrap gap-2">
              {absents.map(s => (
                <span key={s.pilote.id} className="text-xs text-red-400 bg-red-900/30 border border-red-500/20 rounded-full px-3 py-0.5">
                  {s.pilote.full_name || s.pilote.email}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Matrix */}
        <div className="ai-card rounded-xl border border-white/8 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white">Matrice d'Assiduité — 4 derniers mois</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/5">
                <tr>
                  <th className="text-left py-3 px-5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Pilote</th>
                  {MONTHS.map(m => (
                    <th key={m} className="text-center py-3 px-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                      {format(new Date(m + "-01"), "MMM yy")}
                    </th>
                  ))}
                  <th className="text-center py-3 px-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Note moy.</th>
                  <th className="text-right py-3 px-5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Complétion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/3">
                {stats.length === 0 ? (
                  <tr>
                    <td colSpan={MONTHS.length + 3} className="py-12 text-center text-zinc-600">
                      <UserCheck className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                      Aucun pilote en formation
                    </td>
                  </tr>
                ) : stats.map(({ pilote, byMonth, submitted, validated, avgNote, isAbsent }) => (
                  <tr key={pilote.id} className={cn("hover:bg-white/3 transition-colors", isAbsent && "bg-red-900/5")}>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-zinc-400">
                          {(pilote.full_name || pilote.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{pilote.full_name || pilote.email}</p>
                          <p className="text-[10px] text-zinc-600">{pilote.role}</p>
                        </div>
                      </div>
                    </td>
                    {byMonth.map(({ mois, livrable }) => (
                      <td key={mois} className="py-3 px-3 text-center text-lg">
                        {!livrable ? "⬜" : livrable.statut === "valide" ? "✅" : livrable.statut === "rejete" ? "❌" : "🕐"}
                      </td>
                    ))}
                    <td className="py-3 px-3 text-center font-bold text-white">{avgNote ? `${avgNote}/20` : "—"}</td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${MONTHS.length > 0 ? (submitted / MONTHS.length) * 100 : 0}%` }} />
                        </div>
                        <span className="text-xs text-zinc-500">{submitted}/{MONTHS.length}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5 bg-white/2 border-t border-white/5 flex gap-4 text-[10px] text-zinc-600">
            <span>✅ Validé</span><span>❌ Rejeté</span><span>🕐 En attente</span><span>⬜ Non soumis</span>
          </div>
        </div>
      </div>
    </div>
  );
}