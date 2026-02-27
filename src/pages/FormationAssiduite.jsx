import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserCheck, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { format, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

const MONTHS = Array.from({ length: 4 }, (_, i) => format(subMonths(new Date(), i), "yyyy-MM")).reverse();

export default function FormationAssiduitePage() {
  const { data: livrables = [] } = useQuery({
    queryKey: ["livrables-assiduite"],
    queryFn: () => base44.entities.FormationLivrable.list("-date_soumission", 500),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const pilotes = users.filter((u) => ["pilote_fi", "copilote_fi", "etudiant"].includes(u.role));

  const stats = useMemo(() => {
    return pilotes.map((p) => {
      const pliv = livrables.filter((l) => l.pilote_email === p.email);
      const byMonth = MONTHS.map((m) => ({
        mois: m,
        livrable: pliv.find((l) => l.mois_cycle === m),
      }));
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Tableau d'Assiduité</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Suivi de la formation continue · {format(new Date(), "MMMM yyyy")}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-zinc-200 bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-zinc-400">Taux Formation Continue</p>
              <p className="text-3xl font-bold text-blue-700">{tauxContinue}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-zinc-600" />
            <div>
              <p className="text-xs text-zinc-400">Pilotes actifs ce mois</p>
              <p className="text-3xl font-bold text-zinc-900">{enFormation}/{totalPilotes}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border", absents.length > 0 ? "border-red-200 bg-red-50/30" : "border-emerald-200 bg-emerald-50/30")}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className={cn("w-5 h-5", absents.length > 0 ? "text-red-500" : "text-emerald-500")} />
            <div>
              <p className="text-xs text-zinc-400">Absents ce mois</p>
              <p className={cn("text-3xl font-bold", absents.length > 0 ? "text-red-700" : "text-emerald-700")}>{absents.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Absents alert */}
      {absents.length > 0 && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/40">
          <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Pilotes sans livrable ce mois</p>
          <div className="flex flex-wrap gap-2">
            {absents.map((s) => (
              <Badge key={s.pilote.id} className="bg-red-100 text-red-700 border border-red-200 text-xs">{s.pilote.full_name || s.pilote.email}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Main table */}
      <Card className="border-zinc-200 bg-white overflow-hidden">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Matrice d'Assiduité — 4 derniers mois</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Pilote</th>
                  {MONTHS.map((m) => <th key={m} className="text-center py-2.5 px-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{format(new Date(m + "-01"), "MMM yy")}</th>)}
                  <th className="text-center py-2.5 px-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Note moy.</th>
                  <th className="text-right py-2.5 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Complétion</th>
                </tr>
              </thead>
              <tbody>
                {stats.length === 0 ? (
                  <tr><td colSpan={MONTHS.length + 3} className="py-12 text-center text-zinc-400"><UserCheck className="w-8 h-8 mx-auto mb-2 text-zinc-200" />Aucun pilote en formation</td></tr>
                ) : stats.map(({ pilote, byMonth, submitted, validated, avgNote, isAbsent }) => (
                  <tr key={pilote.id} className={cn("border-b border-zinc-50 hover:bg-zinc-50", isAbsent ? "bg-red-50/20" : "")}>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
                          {(pilote.full_name || pilote.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{pilote.full_name || pilote.email}</p>
                          <p className="text-[10px] text-zinc-400">{pilote.role}</p>
                        </div>
                      </div>
                    </td>
                    {byMonth.map(({ mois, livrable }) => (
                      <td key={mois} className="py-2.5 px-3 text-center">
                        {!livrable ? (
                          <span className="text-lg">⬜</span>
                        ) : livrable.statut === "valide" ? (
                          <span className="text-lg">✅</span>
                        ) : livrable.statut === "rejete" ? (
                          <span className="text-lg">❌</span>
                        ) : (
                          <span className="text-lg">🕐</span>
                        )}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center font-bold text-zinc-900">{avgNote ? `${avgNote}/20` : "—"}</td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-16 h-1.5 bg-zinc-100 rounded-full">
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
          <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-100 flex gap-4 text-[10px] text-zinc-400">
            <span>✅ Validé</span><span>❌ Rejeté</span><span>🕐 En attente</span><span>⬜ Non soumis</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}