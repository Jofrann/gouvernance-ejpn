import React from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Returns true if there are 3+ consecutive declining weeks for a member
export function detectChuteLivre(membreId, allSaisies) {
  const saisiesMembre = allSaisies
    .filter((s) => s.membre_id === membreId && s.presence)
    .sort((a, b) => new Date(a.semaine) - new Date(b.semaine));

  if (saisiesMembre.length < 3) return false;

  const getAvg = (s) => {
    const notes = [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter((n) => n !== null && n !== undefined);
    return notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : null;
  };

  const last3 = saisiesMembre.slice(-3).map(getAvg);
  if (last3.some((v) => v === null)) return false;

  return last3[2] < last3[1] && last3[1] < last3[0];
}

export default function ChuteLivreAlert() {
  return (
    <Badge className="bg-red-100 text-red-800 border border-red-200 gap-1 text-[10px]">
      <AlertTriangle className="w-3 h-3" />
      Alerte Soin Pastoral
    </Badge>
  );
}