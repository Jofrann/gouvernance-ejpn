import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, X, Zap, TrendingDown, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Analyser les chutes libres (3 semaines consécutives en baisse)
function detectChutesLibres(membres, saisies) {
  const alerts = [];

  membres.forEach((membre) => {
    const memberSaisies = saisies
      .filter(s => s.membre_id === membre.id && s.presence)
      .sort((a, b) => new Date(a.semaine) - new Date(b.semaine))
      .slice(-4); // 4 dernières semaines

    if (memberSaisies.length < 3) return;

    // Calculer les scores moyens
    const scores = memberSaisies.map(s => ({
      semaine: s.semaine,
      finances: s.note_finances || 0,
      emotions: s.note_emotions || 0,
      spirituel: s.note_spirituel || 0,
      temps: s.note_temps || 0,
      avg: ((s.note_finances || 0) + (s.note_emotions || 0) + (s.note_spirituel || 0) + (s.note_temps || 0)) / 4,
    }));

    // Détecter chute 3 semaines consécutives
    const last3 = scores.slice(-3);
    if (last3.length === 3 && last3[0].avg > last3[1].avg && last3[1].avg > last3[2].avg) {
      // Trouver l'axe le plus faible
      const lastScore = last3[2];
      const axes = [
        { nom: "Finances", val: lastScore.finances },
        { nom: "Émotions", val: lastScore.emotions },
        { nom: "Spirituel", val: lastScore.spirituel },
        { nom: "Temps", val: lastScore.temps },
      ].sort((a, b) => a.val - b.val);

      alerts.push({
        membre_nom: membre.nom_complet,
        axe_critique: axes[0].nom,
        score_actuel: Math.round(axes[0].val * 10) / 10,
        tendance: Math.round((last3[0].avg - last3[2].avg) * 10) / 10,
      });
    }
  });

  return alerts;
}

// Générer le message IA (LLM)
async function generateInsightMessage(alerts, firstName) {
  if (alerts.length === 0) return null;

  const nomsMembres = alerts.map(a => `${a.membre_nom} (${a.axe_critique} : ${a.score_actuel}/10)`).join(", ");

  const response = await base44.integrations.Core.InvokeLLM({
    prompt: `Tu es le Copilote Pastoral de l'Agent EJP OS. Tu analyses des données de suivi et génères une alerte empathique et pastorale.

Données : ${alerts.length} membre(s) en chute libre (3 semaines consécutives) : ${nomsMembres}.

Génère un message court (2-3 phrases max), chaleureux mais alertant, à destination d'un Pilote de Famille d'Impact. 
Propose UNE action concrète (ex: atelier, appel, prière). 
Commence par "💡 Salut ${firstName}." - Ne dépasse pas 60 mots.`,
  });

  return response;
}

export default function CopiloteInsights({ user, familleImpactId }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const firstName = user?.full_name?.split(" ")[0] || "Pilote";

  const { data: membres = [] } = useQuery({
    queryKey: ["membres-insights", familleImpactId],
    queryFn: () => familleImpactId
      ? base44.entities.Membre.filter({ famille_impact_id: familleImpactId })
      : Promise.resolve([]),
    enabled: !!familleImpactId,
  });

  const { data: saisies = [] } = useQuery({
    queryKey: ["saisies-insights", familleImpactId],
    queryFn: () => familleImpactId
      ? base44.entities.CliniqueSaisie.filter({ famille_impact_id: familleImpactId })
      : Promise.resolve([]),
    enabled: !!familleImpactId,
  });

  useEffect(() => {
    if (!membres.length || !saisies.length) {
      setLoading(false);
      return;
    }

    // Vérifier si déjà vu aujourd'hui
    const lastSeen = localStorage.getItem(`copilote_insights_${user?.id}`);
    const today = new Date().toDateString();
    if (lastSeen === today) {
      setLoading(false);
      return;
    }

    const foundAlerts = detectChutesLibres(membres, saisies);
    if (foundAlerts.length === 0) {
      setLoading(false);
      return;
    }

    setAlerts(foundAlerts);

    generateInsightMessage(foundAlerts, firstName)
      .then(msg => {
        setMessage(msg);
        setVisible(true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [membres.length, saisies.length]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem(`copilote_insights_${user?.id}`, new Date().toDateString());
  };

  if (loading || dismissed || !visible || !message) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative rounded-2xl p-5 mb-2"
        style={{
          background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.06) 100%)",
          border: "1px solid rgba(139,92,246,0.25)",
          boxShadow: "0 0 40px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        {/* Glow line */}
        <div className="absolute top-0 left-8 right-8 h-px" style={{
          background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.5), rgba(59,130,246,0.5), transparent)"
        }} />

        <div className="flex items-start gap-3">
          {/* Agent avatar */}
          <div className="relative shrink-0 mt-0.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.4), rgba(59,130,246,0.4))",
              border: "1px solid rgba(139,92,246,0.3)",
              boxShadow: "0 0 16px rgba(139,92,246,0.3)",
            }}>
              <Sparkles className="w-4 h-4 text-violet-300" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#060810]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Copilote Pastoral · Alerte</span>
              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                <AlertTriangle className="w-3 h-3" />
                {alerts.length} membre{alerts.length > 1 ? "s" : ""} en vigilance
              </span>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed mb-3">{message}</p>

            {/* Members chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {alerts.map((a, i) => (
                <span key={i} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <TrendingDown className="w-3 h-3 text-red-400" />
                  <span className="text-zinc-300">{a.membre_nom}</span>
                  <span className="text-red-400 font-semibold">{a.axe_critique}</span>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, rgba(139,92,246,0.8), rgba(59,130,246,0.7))",
                  border: "1px solid rgba(139,92,246,0.35)",
                  boxShadow: "0 0 12px rgba(139,92,246,0.2)",
                }}
                onClick={handleDismiss}
              >
                <Zap className="w-3 h-3" /> Créer une tâche de suivi
              </button>
              <button
                onClick={handleDismiss}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Ignorer pour aujourd'hui
              </button>
            </div>
          </div>

          <button onClick={handleDismiss} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all shrink-0">
            <X className="w-3.5 h-3.5 text-zinc-600" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}