import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Send, Paperclip, X, MessageSquare, ArrowLeft, File, Image, Check, CheckCheck, Pencil, Trash2, ExternalLink } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const urlParams = new URLSearchParams(window.location.search);
const INIT_RECIPIENT = urlParams.get("to");

// ─── Typing state stored in user entity (current_typing field) ────────────────
// We reuse base44.auth.updateMe to broadcast typing status.

function formatMsgTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Hier";
  return format(d, "d MMM", { locale: fr });
}

// Detect URLs in text
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

function LinkPreview({ url }) {
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Use Open Graph / meta extraction via LLM (lightweight)
    base44.integrations.Core.InvokeLLM({
      prompt: `Extract title, description and image_url from this URL's Open Graph tags: ${url}. Return JSON only with keys: title, description, image_url, domain. Keep description under 100 chars. If you can't access the page, use the domain name as title.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          image_url: { type: "string" },
          domain: { type: "string" },
        },
      },
    }).then(res => {
      setMeta(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [url]);

  if (loading) {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 animate-pulse">
        <div className="w-4 h-4 border-t border-blue-400 rounded-full animate-spin flex-shrink-0" />
        <span className="text-[10px] text-zinc-600 truncate">{url}</span>
      </div>
    );
  }
  if (!meta) return null;

  return (
    <a href={url} target="_blank" rel="noreferrer"
      className="mt-2 flex items-start gap-3 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer">
      {meta.image_url && (
        <img src={meta.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-white/5" onError={e => e.target.style.display = 'none'} />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{meta.title || meta.domain || url}</p>
        {meta.description && <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{meta.description}</p>}
        <p className="text-[10px] text-blue-400 mt-1 flex items-center gap-1 truncate">
          <ExternalLink className="w-2.5 h-2.5" />{meta.domain || url}
        </p>
      </div>
    </a>
  );
}

function MessageBubble({ msg, isMine, onEdit, onDelete }) {
  const [showActions, setShowActions] = useState(false);
  const hasFile = !!msg.file_url;
  const isImage = msg.file_type?.startsWith("image/");
  const urls = msg.content?.match(URL_REGEX) || [];

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Actions (shown on hover) */}
      {isMine && (
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-1 mr-2 self-center"
            >
              {msg.content && (
                <button onClick={() => onEdit(msg)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <Pencil className="w-3 h-3 text-zinc-400" />
                </button>
              )}
              <button onClick={() => onDelete(msg.id)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 transition-colors">
                <Trash2 className="w-3 h-3 text-zinc-400 hover:text-red-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <div className={`max-w-[72%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {hasFile && (
          <div className={`rounded-xl overflow-hidden ${isMine ? "bg-blue-600/30 border border-blue-500/30" : "bg-white/5 border border-white/10"}`}>
            {isImage ? (
              <img src={msg.file_url} alt={msg.file_name} className="max-w-[240px] rounded-xl object-cover" />
            ) : (
              <a href={msg.file_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white transition-colors">
                <File className="w-4 h-4 flex-shrink-0" />
                <span className="truncate max-w-[160px]">{msg.file_name || "Fichier"}</span>
              </a>
            )}
          </div>
        )}
        {msg.content && (
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isMine
              ? "bg-blue-600 text-white rounded-br-sm"
              : "bg-white/8 text-zinc-200 border border-white/10 rounded-bl-sm"
          }`}>
            <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</span>
            {msg.edited && <span className="text-[10px] opacity-60 ml-2">(modifié)</span>}
            {/* Link previews */}
            {urls.map(url => <LinkPreview key={url} url={url} />)}
          </div>
        )}
        <div className="flex items-center gap-1 px-1">
          <span className="text-[10px] text-zinc-600">{formatMsgTime(msg.created_date)}</span>
          {isMine && (
            msg.status === "read"
              ? <CheckCheck className="w-3 h-3 text-blue-400" />
              : <Check className="w-3 h-3 text-zinc-600" />
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator({ name }) {
  return (
    <div className="flex justify-start mb-2">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/8 border border-white/10 rounded-bl-sm">
        <span className="text-xs text-zinc-500">{name} écrit</span>
        <div className="flex gap-0.5">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ConversationItem({ conv, currentUserEmail, isActive, onClick }) {
  const otherName = conv.participant_names?.find((_, i) => conv.participant_emails?.[i] !== currentUserEmail) || "Inconnu";
  const otherInitial = otherName[0]?.toUpperCase() || "?";
  const myIndex = conv.participant_emails?.indexOf(currentUserEmail);
  const unread = myIndex === 0 ? (conv.unread_count_a || 0) : (conv.unread_count_b || 0);

  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left ${isActive ? "bg-white/10" : "hover:bg-white/5"}`}>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {otherInitial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-white truncate">{otherName}</span>
          <span className="text-[10px] text-zinc-600 flex-shrink-0">{formatMsgTime(conv.last_message_at)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-xs text-zinc-500 truncate">{conv.last_message || "Aucun message"}</span>
          {unread > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-blue-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center px-1">
              {unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function MessageriePage() {
  useTrackActivity("Messagerie");
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [search, setSearch] = useState("");
  const [msgText, setMsgText] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [showNewConv, setShowNewConv] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [editingMsg, setEditingMsg] = useState(null); // {id, content}
  const [editText, setEditText] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingCheckRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users-msg"],
    queryFn: async () => {
      const res = await base44.functions.invoke("listUsers", {});
      return res.data?.users || [];
    },
    enabled: !!currentUser,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", currentUser?.email],
    queryFn: () => base44.entities.Conversation.filter({ participant_emails: currentUser.email }, "-last_message_at", 50),
    enabled: !!currentUser,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!currentUser) return;
    const unsub = base44.entities.Conversation.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    });
    return unsub;
  }, [currentUser]);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", selectedConvId],
    queryFn: () => base44.entities.Message.filter({ conversation_id: selectedConvId }, "created_date", 200),
    enabled: !!selectedConvId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!selectedConvId) return;
    const unsub = base44.entities.Message.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["messages", selectedConvId] });
    });
    return unsub;
  }, [selectedConvId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  // Mark as read
  useEffect(() => {
    if (!selectedConvId || !currentUser || messages.length === 0) return;
    const conv = conversations.find(c => c.id === selectedConvId);
    if (!conv) return;
    const unread = messages.filter(m => m.sender_email !== currentUser.email && !m.read_by?.includes(currentUser.email));
    if (unread.length === 0) return;
    unread.forEach(m => {
      base44.entities.Message.update(m.id, { read_by: [...(m.read_by || []), currentUser.email], status: "read" });
    });
    const myIndex = conv.participant_emails?.indexOf(currentUser.email);
    base44.entities.Conversation.update(selectedConvId, myIndex === 0 ? { unread_count_a: 0 } : { unread_count_b: 0 });
    qc.invalidateQueries({ queryKey: ["conversations"] });
  }, [selectedConvId, messages, currentUser]);

  // Typing detection: broadcast when user types
  const handleMsgTextChange = useCallback((val) => {
    setMsgText(val);
    if (!currentUser || !selectedConvId) return;

    // Set typing true
    base44.auth.updateMe({ current_typing: selectedConvId }).catch(() => {});

    // Clear existing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Stop typing after 2s of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      base44.auth.updateMe({ current_typing: null }).catch(() => {});
    }, 2000);
  }, [currentUser, selectedConvId]);

  // Poll other user's typing status
  useEffect(() => {
    if (!selectedConvId || !currentUser) return;

    const conv = conversations.find(c => c.id === selectedConvId);
    if (!conv) return;

    const otherEmail = conv.participant_emails?.find(e => e !== currentUser.email);
    if (!otherEmail) return;

    const checkTyping = async () => {
      const users = await base44.entities.User.filter({ email: otherEmail });
      const other = users[0];
      setOtherTyping(other?.current_typing === selectedConvId);
    };

    checkTyping();
    typingCheckRef.current = setInterval(checkTyping, 2000);
    return () => clearInterval(typingCheckRef.current);
  }, [selectedConvId, currentUser, conversations]);

  // Clear typing on unmount / conv change
  useEffect(() => {
    return () => {
      base44.auth.updateMe({ current_typing: null }).catch(() => {});
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [selectedConvId]);

  // Handle URL param
  useEffect(() => {
    if (!INIT_RECIPIENT || !currentUser || conversations.length === 0) return;
    const existing = conversations.find(c => c.participant_emails?.includes(INIT_RECIPIENT));
    if (existing) setSelectedConvId(existing.id);
    else {
      const recipient = allUsers.find(u => u.email === INIT_RECIPIENT);
      if (recipient) startConversation(recipient);
    }
  }, [currentUser, conversations, allUsers]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!msgText.trim() && !pendingFile) return;
      const msgData = {
        conversation_id: selectedConvId,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        content: msgText.trim(),
        status: "sent",
        read_by: [currentUser.email],
        ...(pendingFile ? { file_url: pendingFile.url, file_name: pendingFile.name, file_type: pendingFile.type } : {}),
      };
      await base44.entities.Message.create(msgData);
      const conv = conversations.find(c => c.id === selectedConvId);
      const myIndex = conv?.participant_emails?.indexOf(currentUser.email);
      const unreadUpdate = myIndex === 0 ? { unread_count_b: (conv?.unread_count_b || 0) + 1 } : { unread_count_a: (conv?.unread_count_a || 0) + 1 };
      await base44.entities.Conversation.update(selectedConvId, { last_message: msgText.trim() || (pendingFile?.name || "Fichier"), last_message_at: new Date().toISOString(), last_message_by: currentUser.email, ...unreadUpdate });
      // Stop typing indicator
      base44.auth.updateMe({ current_typing: null }).catch(() => {});
    },
    onSuccess: () => {
      setMsgText("");
      setPendingFile(null);
      qc.invalidateQueries({ queryKey: ["messages", selectedConvId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: (msgId) => base44.entities.Message.delete(msgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages", selectedConvId] }),
  });

  const saveEdit = useMutation({
    mutationFn: () => base44.entities.Message.update(editingMsg.id, { content: editText.trim(), edited: true }),
    onSuccess: () => {
      setEditingMsg(null);
      setEditText("");
      qc.invalidateQueries({ queryKey: ["messages", selectedConvId] });
    },
  });

  function handleEdit(msg) {
    setEditingMsg(msg);
    setEditText(msg.content);
  }

  async function startConversation(recipient) {
    const existing = conversations.find(c => c.participant_emails?.includes(recipient.email));
    if (existing) { setSelectedConvId(existing.id); setShowNewConv(false); return; }
    const conv = await base44.entities.Conversation.create({
      participant_emails: [currentUser.email, recipient.email],
      participant_names: [currentUser.full_name, recipient.full_name],
      last_message: "",
      last_message_at: new Date().toISOString(),
      unread_count_a: 0,
      unread_count_b: 0,
    });
    qc.invalidateQueries({ queryKey: ["conversations"] });
    setSelectedConvId(conv.id);
    setShowNewConv(false);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPendingFile({ url: file_url, name: file.name, type: file.type });
    setUploadingFile(false);
  }

  const selectedConv = conversations.find(c => c.id === selectedConvId);
  const otherParticipant = selectedConv
    ? selectedConv.participant_names?.find((_, i) => selectedConv.participant_emails?.[i] !== currentUser?.email)
    : null;

  const filteredConvs = conversations.filter(c => {
    if (!search) return true;
    const otherName = c.participant_names?.find((_, i) => c.participant_emails?.[i] !== currentUser?.email) || "";
    return otherName.toLowerCase().includes(search.toLowerCase());
  });

  const filteredUsers = allUsers.filter(u =>
    u.email !== currentUser?.email &&
    (u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))
  );

  if (!currentUser) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-8 h-8 border-t-2 border-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden">
      {/* Sidebar */}
      <div className={`flex flex-col border-r border-white/10 bg-[#080c14]/80 backdrop-blur-sm ${selectedConvId ? "hidden md:flex w-80" : "flex w-full md:w-80"}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <h2 className="text-sm font-bold text-white">Messages</h2>
          <button onClick={() => setShowNewConv(!showNewConv)}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors">
            <MessageSquare className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        <AnimatePresence>
          {showNewConv && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="border-b border-white/10 overflow-hidden">
              <div className="p-3">
                <input autoFocus value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Chercher un membre..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-600" />
                <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5">
                  {filteredUsers.slice(0, 10).map(u => (
                    <button key={u.id} onClick={() => startConversation(u)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/10 text-left transition-colors">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {u.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-white truncate">{u.full_name}</p>
                        <p className="text-[10px] text-zinc-600 truncate">{u.email}</p>
                      </div>
                    </button>
                  ))}
                  {filteredUsers.length === 0 && <p className="text-xs text-zinc-600 text-center py-3">Aucun membre trouvé</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-3 py-2 border-b border-white/5">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
            <Search className="w-3.5 h-3.5 text-zinc-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
              className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-600" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
              <MessageSquare className="w-8 h-8 text-zinc-700" />
              <p className="text-xs text-zinc-600">Aucune conversation.<br />Commencez à échanger !</p>
            </div>
          ) : (
            filteredConvs.map(conv => (
              <ConversationItem key={conv.id} conv={conv} currentUserEmail={currentUser.email}
                isActive={conv.id === selectedConvId} onClick={() => setSelectedConvId(conv.id)} />
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col ${!selectedConvId ? "hidden md:flex" : "flex"}`}>
        {!selectedConvId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-600">Sélectionnez une conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-[#080c14]/60 backdrop-blur-sm">
              <button className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors" onClick={() => setSelectedConvId(null)}>
                <ArrowLeft className="w-4 h-4 text-zinc-400" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">
                {otherParticipant?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{otherParticipant || "Conversation"}</p>
                <p className="text-[10px] text-zinc-600">{selectedConv?.participant_emails?.find(e => e !== currentUser.email)}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
              {messages.map((msg, i) => {
                const isMine = msg.sender_email === currentUser.email;
                const showDate = i === 0 || new Date(msg.created_date).toDateString() !== new Date(messages[i - 1]?.created_date).toDateString();
                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex items-center gap-3 py-3">
                        <div className="flex-1 h-px bg-white/5" />
                        <span className="text-[10px] text-zinc-600">
                          {isToday(new Date(msg.created_date)) ? "Aujourd'hui"
                            : isYesterday(new Date(msg.created_date)) ? "Hier"
                            : format(new Date(msg.created_date), "d MMMM yyyy", { locale: fr })}
                        </span>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>
                    )}
                    <MessageBubble
                      msg={msg}
                      isMine={isMine}
                      onEdit={handleEdit}
                      onDelete={(id) => deleteMessage.mutate(id)}
                    />
                  </React.Fragment>
                );
              })}
              {/* Typing indicator */}
              {otherTyping && <TypingIndicator name={otherParticipant || "..."} />}
              <div ref={bottomRef} />
            </div>

            {/* File preview */}
            {pendingFile && (
              <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border-t border-white/10">
                {pendingFile.type?.startsWith("image/") ? <Image className="w-4 h-4 text-blue-400" /> : <File className="w-4 h-4 text-blue-400" />}
                <span className="text-xs text-zinc-400 truncate flex-1">{pendingFile.name}</span>
                <button onClick={() => setPendingFile(null)}><X className="w-3.5 h-3.5 text-zinc-600 hover:text-red-400 transition-colors" /></button>
              </div>
            )}

            {/* Edit mode banner */}
            {editingMsg && (
              <div className="flex items-center gap-3 px-4 py-2 bg-amber-900/20 border-t border-amber-500/20">
                <Pencil className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="text-xs text-amber-400 flex-1 truncate">Modification du message</span>
                <button onClick={() => { setEditingMsg(null); setEditText(""); }}>
                  <X className="w-3.5 h-3.5 text-amber-400 hover:text-red-400 transition-colors" />
                </button>
              </div>
            )}

            {/* Input */}
            <div className="flex items-end gap-2 px-4 py-3 border-t border-white/10 bg-[#080c14]/60 backdrop-blur-sm">
              {!editingMsg && (
                <>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                    className="p-2 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/10 transition-all flex-shrink-0">
                    {uploadingFile
                      ? <div className="w-4 h-4 border-t border-blue-400 rounded-full animate-spin" />
                      : <Paperclip className="w-4 h-4" />}
                  </button>
                </>
              )}
              <input
                value={editingMsg ? editText : msgText}
                onChange={e => editingMsg ? setEditText(e.target.value) : handleMsgTextChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (editingMsg) { if (editText.trim()) saveEdit.mutate(); }
                    else { if (msgText.trim() || pendingFile) sendMessage.mutate(); }
                  }
                  if (e.key === "Escape" && editingMsg) { setEditingMsg(null); setEditText(""); }
                }}
                placeholder={editingMsg ? "Modifier le message..." : "Écrire un message..."}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 transition-colors"
              />
              <button
                onClick={() => {
                  if (editingMsg) { if (editText.trim()) saveEdit.mutate(); }
                  else { if (msgText.trim() || pendingFile) sendMessage.mutate(); }
                }}
                disabled={editingMsg ? !editText.trim() : (!msgText.trim() && !pendingFile)}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-all flex-shrink-0">
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}