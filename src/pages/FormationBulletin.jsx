import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, CheckCircle2, XCircle, Clock, TrendingUp, Star } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STATUT_CONFIG = {
  soumis: { label: "Soumis", class: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  en_attente: { label: "En attente", class: "bg-zinc-50 text-zinc-600 border-zinc-200", icon: Clock },
  valide: { label: "Validé", class: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  rejete: { label: "Rejeté", class: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
};

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

  // Group by pilote for responsable view
  const byPilote = {};
  if (isResponsable) {
    livrables.forEach((l) => {
      const key = l.pilote_email;
      if (!byPilote[key]) byPilote[key] = { email: key, nom: l.pilote_nom || key, livrables: [] };
      byPilote[key].livrables.push(l);
    });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{isResponsable ? "Bulletin de Formation" : "Mon Portfolio"}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{isResponsable ? "Synthèse de progression de tous les pilotes" : "Historique de vos livrables validés"}</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-zinc-200 bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-xs text-zinc-400">Livrables validés</p>
              <p className="text-2xl font-bold text-zinc-900">{validated.length}/{livrables.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-xs text-zinc-400">Note moyenne</p>
              <p className="text-2xl font-bold text-zinc-900">{avgNote ? `${avgNote}/20` : "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 bg-white">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Taux de complétion</span>
              <span className="font-bold text-zinc-700">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {isResponsable ? (
        // Responsable: table per pilote
        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Progression par Pilote</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-zinc-100"><th className="text-left py-2 text-xs text-zinc-400 font-medium">Pilote</th><th className="text-center py-2 text-xs text-zinc-400 font-medium">Soumis</th><th className="text-center py-2 text-xs text-zinc-400 font-medium">Validés</th><th className="text-center py-2 text-xs text-zinc-400 font-medium">Moy.</th><th className="text-right py-2 text-xs text-zinc-400 font-medium">Progression</th></tr></thead>
                <tbody>
                  {Object.values(byPilote).map((p) => {
                    const pValidated = p.livrables.filter((l) => l.statut === "valide");
                    const pNotes = pValidated.filter((l) => l.note != null);
                    const pAvg = pNotes.length > 0 ? (pNotes.reduce((a, l) => a + l.note, 0) / pNotes.length).toFixed(1) : "—";
                    const pRate = Math.round((pValidated.length / Math.max(p.livrables.length, 1)) * 100);
                    return (
                      <tr key={p.email} className="border-b border-zinc-50 hover:bg-zinc-50">
                        <td className="py-2.5 font-medium text-zinc-900">{p.nom}</td>
                        <td className="py-2.5 text-center text-zinc-500">{p.livrables.length}</td>
                        <td className="py-2.5 text-center text-emerald-600 font-medium">{pValidated.length}</td>
                        <td className="py-2.5 text-center font-bold text-zinc-900">{pAvg !== "—" ? `${pAvg}/20` : "—"}</td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-20 h-1.5 bg-zinc-100 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${pRate}%` }} /></div>
                            <span className="text-xs text-zinc-500 w-8">{pRate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {Object.keys(byPilote).length === 0 && <tr><td colSpan={5} className="py-10 text-center text-zinc-400">Aucun livrable soumis</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Pilote: portfolio view
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">Votre Portfolio</h2>
          {livrables.length === 0 ? (
            <Card className="border-zinc-200 bg-white"><CardContent className="py-16 text-center"><Award className="w-10 h-10 mx-auto mb-2 text-zinc-200" /><p className="text-sm text-zinc-400">Aucun livrable soumis — commencez dès maintenant</p></CardContent></Card>
          ) : (
            livrables.sort((a, b) => new Date(b.date_soumission) - new Date(a.date_soumission)).map((l) => {
              const cfg = STATUT_CONFIG[l.statut] || STATUT_CONFIG.soumis;
              const Icon = cfg.icon;
              return (
                <div key={l.id} className={cn("p-4 rounded-xl border", l.statut === "valide" ? "border-emerald-200 bg-emerald-50/20" : l.statut === "rejete" ? "border-red-200 bg-red-50/20" : "border-zinc-200 bg-white")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-white border border-zinc-100">
                        <Icon className={cn("w-4 h-4", l.statut === "valide" ? "text-emerald-500" : l.statut === "rejete" ? "text-red-500" : "text-zinc-400")} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{l.titre_livrable}</p>
                        <p className="text-xs text-zinc-400">{l.mois_cycle} · V{l.version || 1} · soumis le {l.date_soumission}</p>
                        {l.commentaire_responsable && (
                          <p className="text-xs text-amber-700 mt-1.5 p-2 bg-amber-50 rounded border border-amber-200">💬 {l.commentaire_responsable}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={cn("text-[10px] border", cfg.class)}>{cfg.label}</Badge>
                      {l.note != null && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          <span className="text-sm font-bold text-zinc-900">{l.note}/20</span>
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