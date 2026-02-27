import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import AssiduitéMatrix from "@/components/fi/AssiduitéMatrix";
import ChuteLivreAlert, { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";

const STATUT_COLORS = {
  passif: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  regulier: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  disciple: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  reproducteur: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export default function MembersGrid({ membres, saisies, onSelectMember }) {
  const getLastAvg = (membreId) => {
    const memberSaisies = saisies.filter(s => s.membre_id === membreId && s.presence).sort((a, b) => new Date(b.semaine) - new Date(a.semaine));
    if (memberSaisies.length === 0) return null;
    const s = memberSaisies[0];
    const notes = [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter(n => n !== null && n !== undefined);
    return notes.length > 0 ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {membres.map((membre, i) => {
        const alerte = detectChuteLivre(membre.id, saisies);
        const avg = getLastAvg(membre.id);
        return (
          <motion.div key={membre.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <div
              className={cn(
                "rounded-2xl border cursor-pointer transition-all duration-200 p-4 space-y-3",
                alerte ? "border-red-500/30" : "border-white/[0.07] hover:border-white/[0.14]"
              )}
              style={{ background: alerte ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.025)", backdropFilter: "blur(24px) saturate(1.4)" }}
              onClick={() => onSelectMember(membre)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {membre.nom_complet?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{membre.nom_complet}</p>
                    <p className="text-xs text-zinc-500">{membre.ville} · {membre.age} ans</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={cn("text-[10px] px-1.5 border", STATUT_COLORS[membre.statut_pipeline])}>
                    {membre.statut_pipeline}
                  </Badge>
                  {alerte && <ChuteLivreAlert />}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Assiduité · 13 semaines</p>
                <AssiduitéMatrix membreId={membre.id} saisies={saisies} nbWeeks={13} />
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
                <span className="text-[10px] text-zinc-500">Dernière santé</span>
                {avg ? (
                  <span className={cn("text-sm font-black", parseFloat(avg) >= 7 ? "text-emerald-400" : parseFloat(avg) >= 5 ? "text-amber-400" : "text-red-400")}>
                    {avg}/10
                  </span>
                ) : (
                  <span className="text-xs text-zinc-600">—</span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}