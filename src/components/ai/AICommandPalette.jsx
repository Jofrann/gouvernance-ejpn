import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, X, Zap, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

// ─── Fonction Calling definitions ──────────────────────────────────────────────
const AVAILABLE_FUNCTIONS = `
Tu es l'Agent EJP OS. Tu analyses une intention en langage naturel et retournes JSON.

Fonctions disponibles :
- creerInteraction(membre_nom, type, date, heure, sujet) → créer un suivi pastoral
- ajouterMembre(nom, genre, telephone) → ajouter un nouveau membre
- ouvrirClinique(semaine) → ouvrir la saisie clinique de la semaine
- creerTache(titre, description, priorite) → créer une tâche dans le workspace
- rechercherMembre(query) → chercher un membre par nom

Réponds UNIQUEMENT avec un JSON valide de la forme :
{
  "fonction": "nomFonction",
  "params": { ... },
  "confirmation_message": "message court résumant ce que tu vas faire"
}

Si la requête est ambiguë ou ne correspond à aucune fonction, retourne :
{
  "fonction": null,
  "params": {},
  "confirmation_message": "Je n'ai pas compris. Essaie : 'Ajoute un RDV demain avec Marc pour ses finances' ou 'Crée une tâche urgente : atelier prière'"
}
`;

// ─── Action labels for UI ──────────────────────────────────────────────────────
const ACTION_META = {
  creerInteraction: { label: "Créer un suivi pastoral", color: "text-violet-400", icon: "🤝" },
  ajouterMembre: { label: "Ajouter un membre", color: "text-emerald-400", icon: "👤" },
  ouvrirClinique: { label: "Ouvrir la Clinique", color: "text-blue-400", icon: "📋" },
  creerTache: { label: "Créer une tâche", color: "text-amber-400", icon: "✅" },
  rechercherMembre: { label: "Rechercher un membre", color: "text-pink-400", icon: "🔍" },
};

// ─── Suggestions rapides ──────────────────────────────────────────────────────
const QUICK_SUGGESTIONS = [
  "Crée un suivi avec Marc pour ses finances",
  "Ajoute un RDV prière demain à 15h",
  "Ouvre la clinique de cette semaine",
  "Crée une tâche : atelier éducation financière",
];

export default function AICommandPalette({ user, onAction }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setQuery("");
      setResult(null);
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (q) => {
    const input = (q || query).trim();
    if (!input) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${AVAILABLE_FUNCTIONS}\n\nRequête utilisateur : "${input}"`,
        response_json_schema: {
          type: "object",
          properties: {
            fonction: { type: "string" },
            params: { type: "object" },
            confirmation_message: { type: "string" },
          },
        },
      });
      setResult(response);
    } catch {
      setError("Une erreur est survenue. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (result?.fonction && onAction) {
      onAction(result.fonction, result.params);
    }
    setOpen(false);
  };

  return (
    <>
      {/* Trigger button flottant */}
      <button
        onClick={() => setOpen(true)}
        data-joyride="ai-command"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all"
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(139,92,246,0.85))",
          border: "1px solid rgba(99,155,255,0.35)",
          boxShadow: "0 0 32px rgba(59,130,246,0.35), 0 0 64px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.15)",
        }}
      >
        <Sparkles className="w-4 h-4" />
        Agent IA
        <span className="text-[10px] font-mono opacity-60 ml-1 hidden sm:inline">⌘K</span>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-lg rounded-2xl p-5 text-white"
              style={{
                background: "linear-gradient(135deg, rgba(12,14,24,0.97) 0%, rgba(8,10,18,0.99) 100%)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(40px)",
                boxShadow: "0 0 60px rgba(59,130,246,0.2), 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
                    background: "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(139,92,246,0.4))",
                    border: "1px solid rgba(99,155,255,0.3)",
                  }}>
                    <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">Agent EJP OS</p>
                    <p className="text-[10px] text-zinc-500">NLP → Action directe</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all">
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>

              {/* Input */}
              <div className="relative mb-3">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder="Dis-moi ce que tu veux faire..."
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none pr-10"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                  }}
                />
                {loading ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
                ) : (
                  <button
                    onClick={() => handleSubmit()}
                    disabled={!query.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                    style={{
                      background: "linear-gradient(135deg, rgba(59,130,246,0.7), rgba(139,92,246,0.6))",
                      border: "1px solid rgba(99,155,255,0.3)",
                    }}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick suggestions */}
              {!result && !loading && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {QUICK_SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setQuery(s); handleSubmit(s); }}
                      className="text-[11px] px-2.5 py-1 rounded-lg text-zinc-400 hover:text-white transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Result */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-4 mb-3"
                    style={{
                      background: result.fonction
                        ? "rgba(59,130,246,0.08)"
                        : "rgba(239,68,68,0.07)",
                      border: `1px solid ${result.fonction ? "rgba(59,130,246,0.2)" : "rgba(239,68,68,0.2)"}`,
                    }}
                  >
                    {result.fonction && ACTION_META[result.fonction] && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">{ACTION_META[result.fonction].icon}</span>
                        <span className={`text-xs font-semibold ${ACTION_META[result.fonction].color}`}>
                          {ACTION_META[result.fonction].label}
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-zinc-300">{result.confirmation_message}</p>

                    {result.params && Object.keys(result.params).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(result.params).map(([k, v]) => (
                          <span key={k} className="text-[10px] px-2 py-0.5 rounded-md font-mono"
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
                            <span className="text-zinc-500">{k}:</span> <span className="text-zinc-200">{String(v)}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {result.fonction && (
                      <button
                        onClick={handleConfirm}
                        className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                        style={{
                          background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.85))",
                          border: "1px solid rgba(99,155,255,0.35)",
                          boxShadow: "0 0 16px rgba(59,130,246,0.25)",
                        }}
                      >
                        <Zap className="w-3 h-3" /> Exécuter l'action
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <p className="text-xs text-red-400 mt-2">{error}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}