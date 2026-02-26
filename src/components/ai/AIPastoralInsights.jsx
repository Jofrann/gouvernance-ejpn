import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, AlertTriangle, Heart, PhoneCall, BookOpen, TrendingDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ACTION_ICONS = {
  "contacter": PhoneCall,
  "ressource": BookOpen,
  "alerte": AlertTriangle,
  "encourager": Heart,
};

function getActionIcon(action) {
  const key = Object.keys(ACTION_ICONS).find((k) => action.toLowerCase().includes(k));
  return ACTION_ICONS[key] || Heart;
}

/**
 * AI Pastoral Insights — for pilote_fi
 * Analyzes CliniqueSaisie data for all members of a FI and returns pastoral care summaries.
 */
export default function AIPastoralInsights({ membres, saisies, fiName }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setResults(null);

    // Build member summaries with their last 4 weeks of data
    const memberData = membres.map((m) => {
      const memberSaisies = saisies
        .filter((s) => s.membre_id === m.id)
        .sort((a, b) => new Date(b.semaine) - new Date(a.semaine))
        .slice(0, 4)
        .map((s) => ({
          semaine: s.semaine,
          presence: s.presence,
          note_temps: s.note_temps,
          note_finances: s.note_finances,
          note_emotions: s.note_emotions,
          note_spirituel: s.note_spirituel,
          commentaire: s.commentaire,
        }));

      const avgs = memberSaisies
        .filter((s) => s.presence)
        .map((s) => {
          const notes = [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter((n) => n != null);
          return notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : null;
        })
        .filter((a) => a !== null);

      const trend = avgs.length >= 2
        ? avgs[0] < avgs[avgs.length - 1] ? "hausse" : avgs[0] > avgs[avgs.length - 1] ? "baisse" : "stable"
        : "insuffisant";

      return {
        id: m.id,
        nom: m.nom_complet,
        statut_pipeline: m.statut_pipeline,
        dernières_semaines: memberSaisies,
        tendance: trend,
        absences_consecutives: memberSaisies.filter(s => !s.presence).length,
      };
    });

    const prompt = `Tu es un assistant pastoral expert en accompagnement de jeunes au sein de Familles d'Impact (FI).

FI concernée : ${fiName}

DONNÉES DES MEMBRES (4 dernières semaines) :
${JSON.stringify(memberData, null, 2)}

ANALYSE DEMANDÉE :
Pour chaque membre qui nécessite de l'attention, produis un résumé pastoral avec :
1. Le problème identifié (baisse de notes, absences, dimension particulièrement basse)
2. Une suggestion d'action concrète pour le pilote de la FI

Ne retourne que les membres qui nécessitent une attention (score moyen < 6, tendance à la baisse sur 3 semaines, ou 2+ absences consécutives).

Réponds UNIQUEMENT en JSON avec ce format :
{
  "membres_attention": [
    {
      "membre_id": "...",
      "nom": "...",
      "niveau_urgence": "critique|moyen|observation",
      "probleme": "Description concise du problème pastoral identifié",
      "dimension_faible": "temps|finances|emotions|spirituel|presence|plusieurs",
      "prediction_chute_libre": true/false,
      "suggestions_actions": [
        "Action concrète 1 (ex: Contacter en urgence pour un entretien)",
        "Action concrète 2 (ex: Proposer la ressource sur la gestion du temps)"
      ]
    }
  ],
  "bilan_fi": "Résumé général de la santé de la FI en 1-2 phrases",
  "score_sante_fi": 75
}`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          membres_attention: {
            type: "array",
            items: {
              type: "object",
              properties: {
                membre_id: { type: "string" },
                nom: { type: "string" },
                niveau_urgence: { type: "string" },
                probleme: { type: "string" },
                dimension_faible: { type: "string" },
                prediction_chute_libre: { type: "boolean" },
                suggestions_actions: { type: "array", items: { type: "string" } },
              },
            },
          },
          bilan_fi: { type: "string" },
          score_sante_fi: { type: "number" },
        },
      },
    });

    setResults(res);
    setLoading(false);
  };

  const urgenceConfig = {
    critique: { color: "border-red-300 bg-red-50", badge: "bg-red-100 text-red-700", label: "Critique" },
    moyen: { color: "border-amber-300 bg-amber-50", badge: "bg-amber-100 text-amber-700", label: "Attention" },
    observation: { color: "border-blue-200 bg-blue-50", badge: "bg-blue-100 text-blue-700", label: "Observation" },
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">Analyse Pastorale IA</span>
        </div>
        <Button
          size="sm"
          onClick={handleAnalyze}
          disabled={loading || membres.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-7"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? "Analyse en cours..." : "Analyser la FI"}
        </Button>
      </div>

      <p className="text-xs text-emerald-700">
        L'IA analyse les 4 dernières semaines de saisies cliniques pour identifier les membres nécessitant un soin pastoral.
      </p>

      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Bilan global */}
            <div className="rounded-lg border border-emerald-200 bg-white p-3 flex items-center gap-3">
              <div className="text-center flex-shrink-0">
                <p className="text-2xl font-black" style={{
                  color: results.score_sante_fi >= 70 ? "#10b981" : results.score_sante_fi >= 50 ? "#f59e0b" : "#ef4444"
                }}>
                  {results.score_sante_fi}
                </p>
                <p className="text-[9px] text-zinc-400 uppercase tracking-wider">Santé FI</p>
              </div>
              <p className="text-xs text-zinc-700 italic">{results.bilan_fi}</p>
            </div>

            {/* Membres en attention */}
            {results.membres_attention?.length === 0 && (
              <div className="rounded-lg border border-emerald-200 bg-white p-3 text-center">
                <p className="text-sm text-emerald-700 font-medium">✓ Tous les membres sont en bonne santé cette semaine !</p>
              </div>
            )}

            {results.membres_attention?.map((m) => {
              const cfg = urgenceConfig[m.niveau_urgence] || urgenceConfig.observation;
              return (
                <div key={m.membre_id} className={`rounded-lg border-2 p-3 space-y-2 ${cfg.color}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
                        {m.nom?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-zinc-900">{m.nom}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {m.prediction_chute_libre && (
                        <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" /> Chute Libre
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${cfg.badge}`}>{cfg.label}</span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-700">{m.probleme}</p>

                  <div className="space-y-1">
                    {m.suggestions_actions?.map((action, i) => {
                      const ActionIcon = getActionIcon(action);
                      return (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-zinc-600 bg-white/70 rounded px-2 py-1.5">
                          <ActionIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 mt-0.5" />
                          {action}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}