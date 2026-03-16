import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { X, Send, Loader2, Sparkles } from "lucide-react";
import CopilotMessageBubble from "@/components/ai/CopilotMessageBubble";

const TONE_LABELS = { direct: "Direct", empathique: "Empathique", soutenu: "Soutenu" };
const FORMAT_LABELS = { bullet_points: "Listes", paragraphes: "Paragraphes", synthese_courte: "Synthèse" };

// ─── Nomenclature Prophétique des Agents ──────────────────────────────────────
const AGENT_IDENTITY = {
  trone:                    { name: "Issacar",   icon: "👑", tagline: "Analyste Stratégique",      placeholder: "Issacar analyse les temps… tapez votre requête stratégique" },
  admin:                    { name: "Issacar",   icon: "👑", tagline: "Analyste Stratégique",      placeholder: "Issacar analyse les temps… tapez votre requête stratégique" },
  responsable_general:      { name: "Issacar",   icon: "👑", tagline: "Analyste Stratégique",      placeholder: "Issacar analyse les temps… tapez votre requête stratégique" },
  gouvernance_direction:    { name: "Néhémie",   icon: "🏗️", tagline: "Planification Stratégique", placeholder: "Néhémie est prêt… tapez votre objectif ou tâche" },
  directrice_execution:     { name: "Néhémie",   icon: "🏗️", tagline: "Planification Stratégique", placeholder: "Néhémie est prêt… tapez votre objectif ou tâche" },
  responsable_fi:           { name: "Esdras",    icon: "📜", tagline: "Suivi & Données",           placeholder: "Esdras recense… tapez votre requête de données" },
  analyste_strategique:     { name: "Esdras",    icon: "📜", tagline: "Suivi & Données",           placeholder: "Esdras recense… tapez votre requête de données" },
  pilote_fi:                { name: "Barnabas",  icon: "🔥", tagline: "Copilote Pastoral",         placeholder: "Barnabas est à l'écoute… tapez votre demande pastorale" },
  copilote_fi:              { name: "Barnabas",  icon: "🔥", tagline: "Copilote Pastoral",         placeholder: "Barnabas est à l'écoute… tapez votre demande pastorale" },
  responsable_evangelisation:{ name: "Josué",   icon: "⚔️", tagline: "Stratège de Conquête",      placeholder: "Josué prépare la mission… tapez votre requête d'évangélisation" },
  responsable_communication: { name: "Bétsaleel",icon: "✨", tagline: "Directeur Artistique",      placeholder: "Bétsaleel crée… tapez votre demande de communication" },
  responsable_formation:    { name: "Élisée",   icon: "📖", tagline: "Tuteur & Formation",        placeholder: "Élisée enseigne… tapez votre question de formation" },
};

const DEFAULT_AGENT = { name: "EJP Copilot", icon: "✦", tagline: "Assistant IA", placeholder: "Posez votre question ou demandez une action…" };

function getAgentIdentity(user) {
  return AGENT_IDENTITY[user?.role] || DEFAULT_AGENT;
}

export default function CopilotFloatingChat({ user }) {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Create or load conversation on open
  useEffect(() => {
    if (open && !conversation) {
      setLoading(true);
      base44.agents.createConversation({
        agent_name: "ejp_copilot",
        metadata: { name: "Session EJP Copilot", user_role: user?.role }
      }).then(conv => {
        setConversation(conv);
        setMessages(conv.messages || []);
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      });
    }
  }, [open]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsub;
  }, [conversation?.id]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending || !conversation) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: "user", content: text });
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isTyping = messages.length > 0 &&
    messages[messages.length - 1]?.role === "assistant" &&
    messages[messages.length - 1]?.content === "";

  const prefs = user?.ai_preferences || {};
  const agent = getAgentIdentity(user);

  return (
    <>
      {/* FAB Button */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[60] h-12 px-4 rounded-2xl flex items-center gap-2.5 shadow-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(99,102,241,0.85) 100%)",
          border: "1px solid rgba(99,155,255,0.35)",
          boxShadow: "0 0 30px rgba(59,130,246,0.35), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)"
        }}
        whileHover={{ scale: 1.04, boxShadow: "0 0 48px rgba(59,130,246,0.5), 0 8px 32px rgba(0,0,0,0.4)" }}
        whileTap={{ scale: 0.95 }}
        animate={open ? { scale: 0, opacity: 0, pointerEvents: "none" } : { scale: 1, opacity: 1 }}
      >
        <span className="text-base leading-none">{agent.icon}</span>
        <div className="text-left">
          <p className="text-[11px] font-bold text-white leading-tight">{agent.name}</p>
          <p className="text-[9px] text-blue-200/70 leading-tight">{agent.tagline}</p>
        </div>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-[60] w-[380px] max-h-[600px] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg, rgba(18,24,42,0.97) 0%, rgba(10,14,28,0.98) 100%)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(48px) saturate(1.8)",
              WebkitBackdropFilter: "blur(48px) saturate(1.8)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08)"
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                  style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))", border: "1px solid rgba(99,155,255,0.2)" }}>
                  {agent.icon}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Agent {agent.name}</p>
                  <p className="text-[10px] text-zinc-500">{agent.tagline} · {TONE_LABELS[prefs.tone] || "Empathique"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Preferences indicator */}
                <div className="flex gap-1 mr-1">
                  {prefs.format && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md text-zinc-500 border border-white/[0.06]">
                      {FORMAT_LABELS[prefs.format] || "Listes"}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0" style={{ maxHeight: "430px" }}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border border-blue-500/20 rounded-full relative">
                      <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin" />
                    </div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Initialisation</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <WelcomeState user={user} onSuggestion={(s) => setInput(s)} />
              ) : (
                messages.map((msg, i) => (
                  <CopilotMessageBubble key={i} message={msg} />
                ))
              )}
              {isTyping && (
                <div className="flex items-center gap-2 px-1">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400/60 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/[0.07]">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pose une question ou demande une action…"
                  rows={1}
                  className="flex-1 resize-none rounded-xl px-3 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    maxHeight: "80px",
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                  style={{
                    background: input.trim() ? "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.85))" : "rgba(255,255,255,0.04)",
                    border: input.trim() ? "1px solid rgba(99,155,255,0.35)" : "1px solid rgba(255,255,255,0.06)",
                    boxShadow: input.trim() ? "0 0 16px rgba(59,130,246,0.3)" : "none"
                  }}
                >
                  {sending ? (
                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-white" />
                  )}
                </button>
              </div>
              <p className="text-[9px] text-zinc-700 mt-1.5 text-center">Entrée pour envoyer · Shift+Entrée pour saut de ligne</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function WelcomeState({ user, onSuggestion }) {
  const roleBasedSuggestions = {
    pilote_fi: [
      "Quels membres sont en chute libre cette semaine ?",
      "Génère un bilan de santé de ma FI",
      "Qui n'a pas été contacté depuis 2 semaines ?",
    ],
    trone: [
      "Compare les métriques des FI ce mois-ci",
      "Génère un rapport stratégique global",
      "Quels sont les OKR en retard ?",
    ],
    gouvernance_direction: [
      "Quelle FI a le meilleur taux de présence ?",
      "Liste les recommandations en attente",
      "Analyse les tendances d'évangélisation",
    ],
    default: [
      "Résume l'activité de la semaine",
      "Quelles sont les alertes prioritaires ?",
      "Aide-moi à rédiger un rapport",
    ]
  };

  const suggestions = roleBasedSuggestions[user?.role] || roleBasedSuggestions.default;

  return (
    <div className="py-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))", border: "1px solid rgba(99,155,255,0.15)" }}>
          <Sparkles className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Bonjour, {user?.full_name?.split(" ")[0]} 👋</p>
          <p className="text-[10px] text-zinc-500">Comment puis-je vous aider aujourd'hui ?</p>
        </div>
      </div>
      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestion(s)}
            className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-zinc-300 hover:text-white transition-all group"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}
          >
            <span className="text-blue-400/70 mr-2 text-[10px]">›</span>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}