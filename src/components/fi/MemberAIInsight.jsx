import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Analyses a member's last N saisies with LLM and returns pastoral insight.
 * Props:
 *   membre: Membre object
 *   saisies: all CliniqueSaisie for this member (sorted newest first)
 */
export default function MemberAIInsight({ membre, saisies }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState(null);

  const recentSaisies = [...saisies]
    .filter((s) => s.membre_id === membre.id)
    .sort((a, b) => new Date(b.semaine) - new Date(a.semaine))
    .slice(0, 8);

  const analyse = async () => {
    if (insight) { setOpen(!open); return; }
    setLoading(true);
    setOpen(true);

    const saisiesStr = recentSaisies.map((s) =>
      `Semaine ${s.semaine}: présent=${s.presence ? "oui" : "non"}, temps=${s.note_temps ?? "?"}/10, finances=${s.note_finances ?? "?"}/10, émotions=${s.note_emotions ?? "?"}/10, spirituel=${s.note_spirituel ?? "?"}/10`
    ).join("\n");

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un conseiller pastoral expert en accompagnement de jeunes adultes au sein d'un mouvement chrétien (EJPN). Tu analyses les données de suivi hebdomadaire d'un membre pour alerter son Pilote de maison.

Membre : ${membre.nom_complet}, ${membre.age || "??"} ans, statut: ${membre.statut_pipeline}.

Données des ${recentSaisies.length} dernières semaines :
${saisiesStr || "Aucune donnée disponible."}

Analyse ces données et produis :
1. Un diagnostic court (2-3 phrases) des patterns détectés (points positifs, points d'attention, dimensions en déclin).
2. Une liste de 2-3 actions concrètes et pastorales que le Pilote doit prioriser cette semaine pour ce membre.
3. Un score de risque de décrochage : "faible", "modéré" ou "élevé".

Réponds en JSON uniquement.`,
      response_json_schema: {
        type: "object",
        properties: {
          diagnostic: { type: "string" },
          actions: { type: "array", items: { type: "string" } },
          risque_decrochage: { type: "string", enum: ["faible", "modéré", "élevé"] },
        },
      },
    });

    setInsight(result);
    setLoading(false);
  };

  const risqueColor = {
    "faible": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "modéré": "bg-amber-50 text-amber-700 border-amber-200",
    "élevé": "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="mt-2">
      <button
        onClick={analyse}
        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        {loading ? "Analyse IA en cours..." : insight ? (open ? "Masquer l'analyse" : "Voir l'analyse IA") : "Analyser avec l'IA"}
        {insight && !loading && (open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </button>

      {open && insight && (
        <div className="mt-3 space-y-3 p-3 rounded-lg bg-blue-50/60 border border-blue-100">
          {/* Risk badge */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Risque de décrochage</span>
            <Badge className={cn("text-[10px] border", risqueColor[insight.risque_decrochage] || "bg-zinc-50 text-zinc-600")}>
              {insight.risque_decrochage}
            </Badge>
          </div>

          {/* Diagnostic */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Diagnostic</p>
            <p className="text-xs text-zinc-700 leading-relaxed">{insight.diagnostic}</p>
          </div>

          {/* Actions */}
          {insight.actions?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Actions prioritaires</p>
              <ul className="space-y-1">
                {insight.actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-700">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}