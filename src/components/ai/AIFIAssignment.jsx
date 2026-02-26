import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, MapPin, Users, Star, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * AI FI Assignment Tool — for responsable_fi
 * Analyzes a new member's city, interests and notes to suggest the best FI.
 */
export default function AIFIAssignment({ membre, familles, membres: allMembres }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);

    // Build context: FI load per family
    const fiContext = familles.map((fi) => {
      const count = allMembres.filter((m) => m.famille_impact_id === fi.id).length;
      return {
        id: fi.id,
        name: fi.name,
        campus: fi.campus || "Non précisé",
        status: fi.status,
        membres_actuels: count,
        objectif_membres: fi.objectif_membres || 12,
        taux_charge: Math.round((count / (fi.objectif_membres || 12)) * 100),
      };
    }).filter((fi) => fi.status === "active");

    const prompt = `Tu es un assistant pastoral expert en affectation de jeunes à des Familles d'Impact (FI).

PROFIL DU NOUVEAU MEMBRE :
- Nom : ${membre.nom_complet}
- Ville : ${membre.ville || "Non précisé"}
- Âge : ${membre.age || "Non précisé"} ans
- Genre : ${membre.genre || "Non précisé"}
- Notes / Centres d'intérêt : ${membre.notes || "Aucune note disponible"}

FAMILLES D'IMPACT DISPONIBLES (actives) :
${JSON.stringify(fiContext, null, 2)}

CRITÈRES DE SUGGESTION (par ordre de priorité) :
1. Proximité géographique (campus / ville proches)
2. Charge de la FI (préférer les FI sous les 80% de leur objectif)
3. Compatibilité des centres d'intérêt si mentionnés dans les notes

Réponds UNIQUEMENT en JSON avec ce format exact :
{
  "suggestion_principale": {
    "fi_id": "...",
    "fi_name": "...",
    "score": 95,
    "raisons": ["Raison 1", "Raison 2", "Raison 3"]
  },
  "suggestion_alternative": {
    "fi_id": "...",
    "fi_name": "...",
    "score": 78,
    "raisons": ["Raison 1", "Raison 2"]
  },
  "points_attention": ["Point 1", "Point 2"]
}`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggestion_principale: {
            type: "object",
            properties: {
              fi_id: { type: "string" },
              fi_name: { type: "string" },
              score: { type: "number" },
              raisons: { type: "array", items: { type: "string" } },
            },
          },
          suggestion_alternative: {
            type: "object",
            properties: {
              fi_id: { type: "string" },
              fi_name: { type: "string" },
              score: { type: "number" },
              raisons: { type: "array", items: { type: "string" } },
            },
          },
          points_attention: { type: "array", items: { type: "string" } },
        },
      },
    });

    setResult(res);
    setLoading(false);
    setOpen(true);
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-violet-800">Suggestion IA d'affectation</span>
        </div>
        <Button
          size="sm"
          onClick={handleAnalyze}
          disabled={loading}
          className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5 text-xs h-7"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? "Analyse..." : "Analyser"}
        </Button>
      </div>

      <p className="text-xs text-violet-600">
        L'IA analyse la ville et les intérêts de <strong>{membre.nom_complet}</strong> pour suggérer la FI la plus adaptée.
      </p>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {/* Suggestion principale */}
            <div className="rounded-lg border-2 border-violet-300 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-bold text-zinc-800">Recommandation principale</span>
                </div>
                <span className="text-xs font-black text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                  Score {result.suggestion_principale?.score}%
                </span>
              </div>
              <p className="text-sm font-bold text-zinc-900">{result.suggestion_principale?.fi_name}</p>
              <ul className="space-y-1">
                {result.suggestion_principale?.raisons?.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600">
                    <span className="text-violet-400 mt-0.5">✦</span> {r}
                  </li>
                ))}
              </ul>
            </div>

            {/* Alternative */}
            {result.suggestion_alternative?.fi_name && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-600">Alternative</span>
                  <span className="text-xs font-bold text-zinc-500">{result.suggestion_alternative?.score}%</span>
                </div>
                <p className="text-sm font-semibold text-zinc-700">{result.suggestion_alternative?.fi_name}</p>
                <ul className="space-y-0.5">
                  {result.suggestion_alternative?.raisons?.map((r, i) => (
                    <li key={i} className="text-xs text-zinc-500">• {r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Points d'attention */}
            {result.points_attention?.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1.5">⚠ Points d'attention</p>
                {result.points_attention.map((p, i) => (
                  <p key={i} className="text-xs text-amber-800">• {p}</p>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}