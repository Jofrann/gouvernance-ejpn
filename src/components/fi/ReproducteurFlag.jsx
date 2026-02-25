import React from "react";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Determines if a member qualifies as "Potentiel Reproducteur" based on:
 * - At least 6 saisies with presence
 * - Average score >= 7.5/10 over last 6 weeks
 * - No more than 1 absence in last 8 weeks
 * - Not already a reproducteur
 */
export function detectPotentielReproducteur(membreId, allSaisies, statut) {
  if (statut === "reproducteur") return false;

  const membreSaisies = allSaisies
    .filter((s) => s.membre_id === membreId)
    .sort((a, b) => new Date(b.semaine) - new Date(a.semaine));

  if (membreSaisies.length < 6) return false;

  const last8 = membreSaisies.slice(0, 8);
  const absences = last8.filter((s) => !s.presence).length;
  if (absences > 1) return false;

  const last6WithPresence = membreSaisies.filter((s) => s.presence).slice(0, 6);
  if (last6WithPresence.length < 6) return false;

  const avgScore = last6WithPresence.reduce((sum, s) => {
    const notes = [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel]
      .filter((n) => n !== null && n !== undefined);
    return sum + (notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : 0);
  }, 0) / last6WithPresence.length;

  return avgScore >= 7.5;
}

export default function ReproducteurFlag({ compact = false }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-amber-50 text-amber-700 border border-amber-300 gap-1 text-[10px] cursor-default">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            {!compact && "Potentiel Reproducteur"}
            {compact && "⭐"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs font-semibold mb-1">Potentiel Reproducteur détecté</p>
          <p className="text-xs text-zinc-500">Ce membre affiche une moyenne ≥ 7.5/10 sur 6 semaines consécutives avec une présence quasi-parfaite. Il est prêt à prendre de nouvelles responsabilités.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}