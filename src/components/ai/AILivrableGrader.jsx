import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * AI Livrable Grader — for responsable_formation
 * Compares a FormationLivrable against FormationRessources for the same cycle.
 * Returns a pre-grade and gap analysis.
 */
export default function AILivrableGrader({ livrable, ressources, onApplyGrade }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);

    // Find relevant resources for this cycle
    const cycleRessources = ressources
      .filter((r) => r.mois_cycle === livrable.mois_cycle)
      .map((r) => ({
        titre: r.titre,
        type: r.type_ressource,
        description: r.description || "Pas de description fournie",
      }));

    // Fetch livrable content if it's a URL
    let livrableContent = "Le fichier ne peut pas être lu directement.";
    if (livrable.file_url && (livrable.file_url.endsWith(".txt") || livrable.file_url.includes("text"))) {
      try {
        const resp = await fetch(livrable.file_url);
        livrableContent = await resp.text();
        livrableContent = livrableContent.substring(0, 3000);
      } catch {
        livrableContent = "Impossible de lire le contenu du fichier.";
      }
    }

    const prompt = `Tu es un correcteur expert pour une école de disciples chrétiens. Tu dois évaluer un livrable soumis par un étudiant (pilote de Famille d'Impact).

INFORMATIONS SUR LE LIVRABLE :
- Titre : ${livrable.titre_livrable}
- Pilote : ${livrable.pilote_nom || livrable.pilote_email}
- Cycle / Mois : ${livrable.mois_cycle}
- Version : ${livrable.version || 1}
- URL du fichier : ${livrable.file_url || "Non fourni"}
- Contenu (si disponible) : ${livrableContent}

RESSOURCES DE FORMATION DU MÊME CYCLE (ce que l'étudiant devait maîtriser) :
${cycleRessources.length > 0 ? JSON.stringify(cycleRessources, null, 2) : "Aucune ressource trouvée pour ce cycle."}

CONSIGNE D'ÉVALUATION :
Évalue le livrable sur 20 en te basant sur :
1. La pertinence par rapport aux ressources de formation du cycle (si disponibles)
2. La qualité générale du travail (structure, profondeur, application pratique)
3. L'identification des lacunes ou points non traités

Si le contenu du fichier n'est pas disponible, base-toi sur le titre et le cycle pour donner une pré-note indicative et des axes d'amélioration généraux.

Réponds UNIQUEMENT en JSON avec ce format :
{
  "pre_note": 14.5,
  "appreciation_globale": "Bien|Assez bien|Insuffisant|Excellent",
  "points_forts": ["Point fort 1", "Point fort 2"],
  "lacunes_identifiees": ["Lacune 1 — thème non couvert", "Lacune 2"],
  "ressources_non_exploitees": ["Titre ressource 1", "Titre ressource 2"],
  "commentaire_feedback": "Commentaire constructif et encourageant en 3-5 phrases, à destination directe du pilote.",
  "recommandation": "valider|rejeter|revision_mineure"
}`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          pre_note: { type: "number" },
          appreciation_globale: { type: "string" },
          points_forts: { type: "array", items: { type: "string" } },
          lacunes_identifiees: { type: "array", items: { type: "string" } },
          ressources_non_exploitees: { type: "array", items: { type: "string" } },
          commentaire_feedback: { type: "string" },
          recommandation: { type: "string" },
        },
      },
    });

    setResult(res);
    setLoading(false);
  };

  const recommandationConfig = {
    valider: { color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2, label: "L'IA recommande de Valider" },
    rejeter: { color: "text-red-700 bg-red-50 border-red-200", icon: XCircle, label: "L'IA recommande de Rejeter" },
    revision_mineure: { color: "text-amber-700 bg-amber-50 border-amber-200", icon: AlertTriangle, label: "L'IA recommande une Révision mineure" },
  };

  const noteColor = result?.pre_note >= 14 ? "text-emerald-600" : result?.pre_note >= 10 ? "text-amber-600" : "text-red-600";
  const rec = recommandationConfig[result?.recommandation] || recommandationConfig.revision_mineure;
  const RecIcon = rec?.icon;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">Correction Assistée par IA</span>
        </div>
        <Button
          size="sm"
          onClick={handleAnalyze}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs h-7"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? "Analyse..." : "Pré-noter avec l'IA"}
        </Button>
      </div>

      <p className="text-xs text-blue-700">
        L'IA compare ce livrable avec les <strong>ressources du cycle {livrable.mois_cycle}</strong> pour identifier les lacunes et proposer une note.
      </p>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Note + recommandation */}
            <div className="flex items-center gap-3 bg-white rounded-lg border border-zinc-200 p-3">
              <div className="text-center flex-shrink-0 w-16">
                <p className={`text-3xl font-black tabular-nums ${noteColor}`}>{result.pre_note}</p>
                <p className="text-[9px] text-zinc-400 uppercase tracking-wider">/ 20</p>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-zinc-700">{result.appreciation_globale}</p>
                <div className={`mt-1 flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded border ${rec.color}`}>
                  <RecIcon className="w-3.5 h-3.5" />
                  {rec.label}
                </div>
              </div>
            </div>

            {/* Points forts */}
            {result.points_forts?.length > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-1">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">✓ Points forts</p>
                {result.points_forts.map((p, i) => (
                  <p key={i} className="text-xs text-emerald-800">• {p}</p>
                ))}
              </div>
            )}

            {/* Lacunes */}
            {result.lacunes_identifiees?.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">✗ Lacunes identifiées</p>
                {result.lacunes_identifiees.map((l, i) => (
                  <p key={i} className="text-xs text-red-800">• {l}</p>
                ))}
              </div>
            )}

            {/* Ressources non exploitées */}
            {result.ressources_non_exploitees?.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Ressources non exploitées
                </p>
                {result.ressources_non_exploitees.map((r, i) => (
                  <p key={i} className="text-xs text-amber-800">• {r}</p>
                ))}
              </div>
            )}

            {/* Feedback */}
            {result.commentaire_feedback && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Commentaire suggéré</p>
                <p className="text-xs text-zinc-700 italic leading-relaxed">{result.commentaire_feedback}</p>
              </div>
            )}

            {/* Apply button */}
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs"
              onClick={() => onApplyGrade && onApplyGrade(result.pre_note, result.commentaire_feedback)}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Appliquer cette note et ce commentaire
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}