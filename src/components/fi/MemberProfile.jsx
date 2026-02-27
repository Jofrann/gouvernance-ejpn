import React from "react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import AssiduitéMatrix from "@/components/fi/AssiduitéMatrix";
import InteractionsPastorales from "@/components/fi/InteractionsPastorales";
import MemberTrendChart from "@/components/fi/MemberTrendChart";
import ChuteLivreAlert, { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";

const STATUT_COLORS = {
  passif: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  regulier: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  disciple: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  reproducteur: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export default function MemberProfile({ membre, isOpen, onClose, fiId, user, saisies }) {
  if (!membre) return null;

  const alerte = detectChuteLivre(membre.id, saisies);
  const memberSaisies = saisies.filter(s => s.membre_id === membre.id);
  const lastAvg = memberSaisies.length > 0 
    ? (() => {
        const notes = [memberSaisies[0].note_temps, memberSaisies[0].note_finances, memberSaisies[0].note_emotions, memberSaisies[0].note_spirituel].filter(n => n !== null && n !== undefined);
        return notes.length > 0 ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : null;
      })()
    : null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto border-l border-white/[0.07]" style={{ background: "rgba(8,11,18,0.95)", backdropFilter: "blur(40px)" }}>
        <SheetHeader className="pb-4 border-b border-white/[0.07] sticky top-0 bg-[#080c14]/80 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
              {membre.nom_complet?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <SheetTitle className="text-lg font-bold text-white">{membre.nom_complet}</SheetTitle>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge className={cn("text-[10px] border", STATUT_COLORS[membre.statut_pipeline])}>
                  {membre.statut_pipeline}
                </Badge>
                {alerte && <ChuteLivreAlert />}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="py-5 space-y-6">
          {/* Infos basiques */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Ville", value: membre.ville || "—" },
              { label: "Âge", value: membre.age ? `${membre.age} ans` : "—" },
              { label: "Tél", value: membre.telephone || "—" },
              { label: "Entrée FI", value: membre.date_entree || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl border border-white/[0.07] bg-white/[0.03]">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
                <p className="font-medium mt-0.5 text-xs text-zinc-300">{value}</p>
              </div>
            ))}
          </div>

          {/* Assiduité */}
          <div>
            <p className="text-xs font-semibold text-zinc-300 mb-2">Assiduité · 13 dernières semaines</p>
            <AssiduitéMatrix membreId={membre.id} saisies={saisies} nbWeeks={13} />
            <div className="flex flex-wrap gap-3 mt-3">
              {[["bg-emerald-500", "Présent (8-10)"], ["bg-amber-400", "Présent (5-7)"], ["bg-red-500", "Présent (<5)"], ["bg-red-200", "Absent"], ["bg-white/10", "Non saisi"]].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1">
                  <div className={`w-2.5 h-2.5 rounded-sm ${c}`} />
                  <span className="text-[10px] text-zinc-500">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tendances graphiques */}
          <div>
            <p className="text-xs font-semibold text-zinc-300 mb-3">Tendances · Dernières 8 semaines</p>
            <MemberTrendChart saisies={saisies} membreId={membre.id} />
          </div>

          {/* Interactions pastorales */}
          <div className="rounded-xl border border-white/[0.07] p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
            <InteractionsPastorales
              membre={membre}
              famillId={fiId}
              user={user}
              canWrite={["admin", "responsable_fi", "pilote_fi", "copilote_fi"].includes(user?.role)}
            />
          </div>

          {/* Notes */}
          {membre.notes && (
            <div className="rounded-xl border border-white/[0.07] p-4 bg-white/[0.02]">
              <p className="text-xs font-semibold text-zinc-300 mb-2">Notes</p>
              <p className="text-xs text-zinc-400 leading-relaxed">{membre.notes}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}