import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Plus, MessageSquare, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MessageBubble from "@/components/messaging/MessageBubble";

const AGENT_NAME = "ejpn_assistant";

const SUGGESTIONS = [
  "Montre-moi les membres en alerte pastorale cette semaine",
  "Quel est l'état d'avancement de nos OKR ?",
  "Rédige un mémo flash urgent pour tous les pôles",
  "Quels membres ont le plus progressé ce mois-ci ?",
  "Crée une interaction pastorale pour un membre",
  "Résume les actions d'évangélisation du mois",
];

export default function AssistantIA() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const messagesEndRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Subscribe to message updates
  useEffect(() => {
    if (!activeConv?.id) return;
    const unsub = base44.agents.subscribeToConversation(activeConv.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsub;
  }, [activeConv?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    setLoadingConvs(true);
    try {
      const convs = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConversations(convs || []);
    } catch (e) {
      setConversations([]);
    }
    setLoadingConvs(false);
  };

  const createNewConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: {
        name: `Conversation du ${new Date().toLocaleDateString("fr-FR")}`,
      },
    });
    setActiveConv(conv);
    setMessages([]);
    setConversations((prev) => [conv, ...prev]);
  };

  const openConversation = async (conv) => {
    const full = await base44.agents.getConversation(conv.id);
    setActiveConv(full);
    setMessages(full.messages || []);
  };

  const deleteConversation = async (e, convId) => {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConv?.id === convId) {
      setActiveConv(null);
      setMessages([]);
    }
  };

  const sendMessage = async (text) => {
    const content = text || input.trim();
    if (!content || sending) return;
    setInput("");
    setSending(true);

    let conv = activeConv;
    if (!conv) {
      conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: content.slice(0, 50) },
      });
      setActiveConv(conv);
      setConversations((prev) => [conv, ...prev]);
    }

    try {
      await base44.agents.addMessage(conv, { role: "user", content });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isTyping = messages.length > 0 && messages[messages.length - 1]?.role === "user" && sending === false;
  const lastMsg = messages[messages.length - 1];
  const assistantIsTyping = sending || (lastMsg?.role === "user");

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden">
      {/* Sidebar conversations */}
      <aside className="w-64 flex-shrink-0 border-r border-white/[0.07] flex flex-col bg-black/20 backdrop-blur-xl">
        <div className="p-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Assistant IA</p>
              <p className="text-[10px] text-zinc-500">O.S.P — EJPN</p>
            </div>
          </div>
          <Button
            onClick={createNewConversation}
            size="sm"
            className="w-full bg-violet-600/80 hover:bg-violet-600 text-white border-0 gap-1.5 h-8 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle conversation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {loadingConvs ? (
            <div className="flex justify-center py-8">
              <div className="w-4 h-4 border-2 border-violet-500/50 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-center text-[11px] text-zinc-600 py-8 px-2">Aucune conversation.<br />Démarrez en posant une question.</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all group ${
                  activeConv?.id === conv.id
                    ? "bg-violet-500/15 border border-violet-500/25"
                    : "hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <p className="text-xs text-zinc-300 truncate flex-1">
                  {conv.metadata?.name || "Conversation"}
                </p>
                <button
                  onClick={(e) => deleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3 text-zinc-600 hover:text-red-400" />
                </button>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeConv && messages.length === 0 ? (
          /* Welcome screen */
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-md"
            >
              <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_40px_rgba(139,92,246,0.2)]">
                <Sparkles className="w-8 h-8 text-violet-400" />
              </div>
              <h2 className="text-2xl font-light text-white mb-1">
                Assistant <span className="font-black">IA</span>
              </h2>
              <p className="text-sm text-zinc-500 mb-8">
                Posez une question ou donnez une instruction. Je peux consulter les données pastorales, gérer les membres, et vous aider à rédiger des documents.
              </p>
              <div className="grid grid-cols-1 gap-2 text-left">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.03] transition-all group text-left"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-violet-400 flex-shrink-0 transition-colors" />
                    <p className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">{s}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          /* Messages */
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <MessageBubble message={msg} />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {sending && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <div className="flex gap-1 px-4 py-3 rounded-2xl border border-white/[0.07] bg-white/[0.03]">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-white/[0.07]">
          <div className="flex gap-3 items-end max-w-3xl mx-auto">
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez une question ou donnez une instruction..."
                className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-zinc-600 pr-12 h-11 rounded-xl focus-visible:ring-violet-500/50"
              />
            </div>
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || sending}
              size="icon"
              className="h-11 w-11 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-center text-[10px] text-zinc-700 mt-2">
            L'assistant peut accéder aux données de la plateforme selon vos permissions.
          </p>
        </div>
      </div>
    </div>
  );
}