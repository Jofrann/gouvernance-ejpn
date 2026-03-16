import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2, FileText, Download, Copy, Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

function buildBilanPrompt({ fi, membres, saisies, transferts, moisLabel }) {
  const totalMembres = membres.length;
  const saisiesMois = saisies.filter(s => s.semaine >= format(startOfMonth(new Date()), "yyyy-MM-dd"));

  const presences = saisiesMois.filter(s => s.presence);
  const tauxPresence = saisiesMois.length > 0
    ? Math.round((presences.length / saisiesMois.length) * 100)
    : 0;

  const avgSante = presences.length > 0
    ? {
        finances: Math.round(presences.reduce((a, s) => a + (s.note_finances || 0), 0) / presences.length * 10) / 10,
        emotions: Math.round(presences.reduce((a, s) => a + (s.note_emotions || 0), 0) / presences.length * 10) / 10,
        spirituel: Math.round(presences.reduce((a, s) => a + (s.note_spirituel || 0), 0) / presences.length * 10) / 10,
        temps: Math.round(presences.reduce((a, s) => a + (s.note_temps || 0), 0) / presences.length * 10) / 10,
      }
    : { finances: 0, emotions: 0, spirituel: 0, temps: 0 };

  const transfertsMois = transferts.filter(t => t.statut === "approuve");
  const membresFormation = membres.filter(m => m.potentiel_formation).length;

  return `Tu es un assistant de rédaction ecclésiastique professionnel pour l'organisation EJP.
Tu rédiges le rapport mensuel officiel d'une Famille d'Impact (FI) pour la Gouvernance.

Données brutes du mois de ${moisLabel} :
- Nom de la FI : ${fi?.name || "FI inconnue"}
- Pilote : ${fi?.pilote_nom || "Non renseigné"}
- Membres actifs : ${totalMembres}
- Taux de présence : ${tauxPresence}%
- Santé Finances moyenne : ${avgSante.finances}/10
- Santé Émotions moyenne : ${avgSante.emotions}/10
- Santé Spirituelle moyenne : ${avgSante.spirituel}/10
- Gestion du Temps moyenne : ${avgSante.temps}/10
- Membres identifiés pour la Formation : ${membresFormation}
- Transferts approuvés : ${transfertsMois.length}
- Séances cliniques enregistrées : ${saisiesMois.length}

Rédige un rapport structuré, professionnel et sans faute en français, avec les sections :
1. **Synthèse générale** (3-4 phrases)
2. **Santé des membres** (analyse les scores, pointe les forces et fragilités)
3. **Progression spirituelle et discipleship** (pipeline, potentiel formation)
4. **Points de vigilance** (membres à risque si scores faibles, axes à renforcer)
5. **Recommandations pour le mois suivant** (2-3 actions concrètes)

Ton style : pastoral, clair, structuré. Utilise "nous" pour la FI. Maximum 400 mots.`;
}

export default function BilanMensuelGenerator({ user, familleImpactId }) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bilan, setBilan] = useState(null);
  const [copied, setCopied] = useState(false);
  const [moisOffset, setMoisOffset] = useState(0);

  const targetMonth = subMonths(new Date(), moisOffset);
  const moisLabel = format(targetMonth, "MMMM yyyy", { locale: fr });

  const { data: fi } = useQuery({
    queryKey: ["fi-bilan", familleImpactId],
    queryFn: () => base44.entities.FamilleImpact.filter({ id: familleImpactId }).then(r => r[0]),
    enabled: !!familleImpactId,
  });

  const { data: membres = [] } = useQuery({
    queryKey: ["membres-bilan", familleImpactId],
    queryFn: () => base44.entities.Membre.filter({ famille_impact_id: familleImpactId }),
    enabled: !!familleImpactId,
  });

  const { data: saisies = [] } = useQuery({
    queryKey: ["saisies-bilan", familleImpactId],
    queryFn: () => base44.entities.CliniqueSaisie.filter({ famille_impact_id: familleImpactId }),
    enabled: !!familleImpactId,
  });

  const { data: transferts = [] } = useQuery({
    queryKey: ["transferts-bilan", familleImpactId],
    queryFn: () => base44.entities.Transfert.filter({ fi_source_id: familleImpactId }),
    enabled: !!familleImpactId,
  });

  const handleGenerate = async () => {
    setGenerating(true);
    setBilan(null);
    try {
      const prompt = buildBilanPrompt({ fi, membres, saisies, transferts, moisLabel });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: "claude_sonnet_4_6",
      });
      setBilan(result);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(bilan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all"
        style={{
          background: "rgba(245,158,11,0.12)",
          border: "1px solid rgba(245,158,11,0.25)",
          boxShadow: "0 0 16px rgba(245,158,11,0.1)",
        }}
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-amber-300">Bilan Mensuel IA</span>
        <ChevronDown className={`w-3.5 h-3.5 text-amber-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[520px] max-w-[90vw] rounded-2xl p-5 z-50"
            style={{
              background: "linear-gradient(135deg, rgba(12,14,24,0.98) 0%, rgba(8,10,18,0.99) 100%)",
              border: "1px solid rgba(245,158,11,0.2)",
              backdropFilter: "blur(40px)",
              boxShadow: "0 0 60px rgba(245,158,11,0.12), 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.3), rgba(234,88,12,0.3))",
                border: "1px solid rgba(245,158,11,0.3)",
              }}>
                <FileText className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Générateur de Bilan IA</p>
                <p className="text-[10px] text-zinc-500">LLM Reporting · Claude Sonnet</p>
              </div>
            </div>

            {/* Month selector */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-zinc-500">Mois :</span>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((offset) => {
                  const m = subMonths(new Date(), offset);
                  const label = format(m, "MMM yyyy", { locale: fr });
                  return (
                    <button
                      key={offset}
                      onClick={() => { setMoisOffset(offset); setBilan(null); }}
                      className="text-[11px] px-2.5 py-1 rounded-lg transition-all capitalize"
                      style={{
                        background: moisOffset === offset ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${moisOffset === offset ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.07)"}`,
                        color: moisOffset === offset ? "#fbbf24" : "#71717a",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate button */}
            {!bilan && (
              <button
                onClick={handleGenerate}
                disabled={generating || !familleImpactId}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white mb-3 disabled:opacity-50 transition-all"
                style={{
                  background: "linear-gradient(135deg, rgba(245,158,11,0.85), rgba(234,88,12,0.8))",
                  border: "1px solid rgba(245,158,11,0.3)",
                  boxShadow: "0 0 24px rgba(245,158,11,0.2)",
                }}
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Rédaction en cours...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Générer le bilan de {moisLabel}</>
                )}
              </button>
            )}

            {/* Generated report */}
            {bilan && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider">Rapport généré · {moisLabel}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={handleCopy} className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
                      {copied ? <><Check className="w-3 h-3 text-emerald-400" /> Copié</> : <><Copy className="w-3 h-3" /> Copier</>}
                    </button>
                    <button onClick={() => setBilan(null)} className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
                      Regénérer
                    </button>
                  </div>
                </div>
                <div
                  className="rounded-xl p-4 text-xs text-zinc-300 leading-relaxed overflow-y-auto max-h-80 whitespace-pre-wrap"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    fontFamily: "inherit",
                  }}
                >
                  {bilan}
                </div>
                <p className="text-[10px] text-zinc-600 mt-2">⚠ Relire avant envoi. Ce rapport est généré par IA à partir des données saisies.</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}