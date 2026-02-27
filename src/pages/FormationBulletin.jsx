import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Award, CheckCircle2, XCircle, Clock, TrendingUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const STATUT_CONFIG = {
  soumis:     { label: "Soumis",     cls: "text-blue-400 bg-blue-500/10 border-blue-500/20",     icon: Clock },
  en_attente: { label: "En attente", cls: "text-zinc-400 bg-zinc-800 border-zinc-700",            icon: Clock },
  valide:     { label: "Validé",     cls: "text-emerald-400 bg-emerald-900/30 border-emerald-500/20", icon: CheckCircle2 },
  rejete:     { label: "Rejeté",     cls: "text-red-400 bg-red-900/30 border-red-500/20",         icon: XCircle },
};

export default function FormationBulletinPage() {
  useTrackActivity("FormationBulletin");
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
  const validated = livrables.filter(l => l.statut === "valide");
  const notedOnes = validated.filter(l => l.note != null);
  const avgNote = notedOnes.length > 0 ? (notedOnes.reduce((a, l) => a + l.note, 0) / notedOnes.length).toFixed(1) : null;
  const completionRate = livrables.length > 0 ? Math.round((validated.length / livrables.length) * 100) : 0;

  const byPilote = {};
  if (isResponsable) {
    livrables.forEach(l => {
      const k = l.pilote_email;
      if (!byPilote[k]) byPilote[k] = { email: k, nom: l.pilote_nom || k, livrables: [] };
      byPilote[k].livrables.push(l);
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-bold text-white">{isResponsable ? "Bulletin de Formation" : "Mon Portfolio"}</h1>
          <p className="text-xs text-zinc-600">{isResponsable ? "Synthèse de progression de tous les pilotes" : "Historique de vos livrables validés"}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="ai-card rounded-xl border border-amber-500/20 bg-amber-900/10 p-4 flex items-center gap-3">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-xs text-zinc-600">Validés</p>
              <p className="text-xl font-bold text-white">{validated.length}/{livrables.length}</p>
            </div>
          </div>
          <div className="ai-card rounded-xl border border-white/8 p-4 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xs text-zinc-600">Note moyenne</p>
              <p className="text-xl font-bold text-white">{avgNote ? `${avgNote}/20` : "—"}</p>
            </div>
          </div>
          <div className="ai-card rounded-xl border border-white/8 p-4">
            <p className="text-xs text-zinc-600 mb-2">Taux de complétion</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
              </div>
              <span className="text-sm font-bold text-white">{completionRate}%</span>
            </div>
          </div>
        </div>

        {isResponsable ? (
          <div className="ai-card rounded-xl border border-white/8 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white">Progression par Pilote</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Pilote", "Soumis", "Validés", "Moy.", "Progression"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/3">
                  {Object.values(byPilote).map(p => {
                    const pVal = p.livrables.filter(l => l.statut === "valide");
                    const pNotes = pVal.filter(l => l.note != null);
                    const pAvg = pNotes.length > 0 ? (pNotes.reduce((a, l) => a + l.note, 0) / pNotes.length).toFixed(1) : "—";
                    const pRate = Math.round((pVal.length / Math.max(p.livrables.length, 1)) * 100);
                    return (
                      <tr key={p.email} className="hover:bg-white/3 transition-colors">
                        <td className="px-5 py-3 font-medium text-white">{p.nom}</td>
                        <td className="px-5 py-3 text-zinc-500">{p.livrables.length}</td>
                        <td className="px-5 py-3 text-emerald-400 font-medium">{pVal.length}</td>
                        <td className="px-5 py-3 font-bold text-white">{pAvg !== "—" ? `${pAvg}/20` : "—"}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-white/5 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${pRate}%` }} /></div>
                            <span className="text-xs text-zinc-500">{pRate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {Object.keys(byPilote).length === 0 && (
                    <tr><td colSpan={5} className="py-12 text-center text-zinc-600">Aucun livrable soumis</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Votre Portfolio</h2>
            {livrables.length === 0 ? (
              <div className="ai-card rounded-xl border border-white/5 p-12 text-center">
                <Award className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
                <p className="text-sm text-zinc-600">Aucun livrable soumis — commencez dès maintenant</p>
              </div>
            ) : (
              [...livrables].sort((a, b) => new Date(b.date_soumission) - new Date(a.date_soumission)).map(l => {
                const cfg = STATUT_CONFIG[l.statut] || STATUT_CONFIG.soumis;
                const Icon = cfg.icon;
                return (
                  <div key={l.id} className={cn("ai-card p-4 rounded-xl border",
                    l.statut === "valide" ? "border-emerald-500/20 bg-emerald-900/10" :
                    l.statut === "rejete" ? "border-red-500/20 bg-red-900/10" : "border-white/8")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-xl border", cfg.cls)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{l.titre_livrable}</p>
                          <p className="text-xs text-zinc-600">{l.mois_cycle} · V{l.version || 1} · {l.date_soumission}</p>
                          {l.commentaire_responsable && (
                            <p className="text-xs text-amber-300/80 mt-1.5 p-2 bg-amber-900/20 rounded-lg border border-amber-500/20">💬 {l.commentaire_responsable}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={cn("text-[10px] border px-2 py-0.5 rounded-md", cfg.cls)}>{cfg.label}</span>
                        {l.note != null && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
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
    </div>
  );
}