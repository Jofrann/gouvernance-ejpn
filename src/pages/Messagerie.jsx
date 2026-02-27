import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Send, Paperclip, X, MessageSquare, ArrowLeft, File, Image, Check, CheckCheck, Edit2, Trash2 } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const urlParams = new URLSearchParams(window.location.search);
const INIT_RECIPIENT = urlParams.get("to");

function formatMsgTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Hier";
  return format(d, "d MMM", { locale: fr });
}

function extractLinks(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

function MessageBubble({ msg, isMine, currentUserEmail, onEdit, onDelete }) {
  const hasFile = !!msg.file_url;
  const isImage = msg.file_type?.startsWith("image/");
  const links = msg.content ? extractLinks(msg.content) : [];

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2 group`}>
      <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-1`}>
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
            {msg.content}
            {msg.edited_at && <p className="text-xs opacity-70 mt-1">(modifié)</p>}
          </div>
        )}
        {links.length > 0 && (
          <div className="space-y-1.5">
            {links.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer" className={`block text-xs px-3 py-2 rounded-lg border ${isMine ? "bg-blue-500/30 border-blue-400/30 text-blue-100" : "bg-white/5 border-white/10 text-zinc-300"} hover:opacity-80 truncate`}>
                🔗 {new URL(url).hostname}
              </a>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-zinc-600">{formatMsgTime(msg.created_date)}</span>
          {isMine && (
            msg.status === "read"
              ? <CheckCheck className="w-3 h-3 text-blue-400" />
              : <Check className="w-3 h-3 text-zinc-600" />
          )}
          {isMine && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(msg)} className="text-zinc-600 hover:text-zinc-300"><Edit2 className="w-3 h-3" /></button>
              <button onClick={() => onDelete(msg.id)} className="text-zinc-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
            </div>
          )}
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
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left ${
        isActive ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
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
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // All users for new conv
  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users-msg"],
    queryFn: async () => {
      const res = await base44.functions.invoke("listUsers", {});
      return res.data?.users || [];
    },
    enabled: !!currentUser,
  });

  // Conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", currentUser?.email],
    queryFn: () => base44.entities.Conversation.filter(
      { participant_emails: currentUser.email },
      "-last_message_at",
      50
    ),
    enabled: !!currentUser,
    refetchInterval: 10000,
  });

  // Real-time convs
  useEffect(() => {
    if (!currentUser) return;
    const unsub = base44.entities.Conversation.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    });
    return unsub;
  }, [currentUser]);

  // Messages for selected conv
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", selectedConvId],
    queryFn: () => base44.entities.Message.filter({ conversation_id: selectedConvId }, "created_date", 200),
    enabled: !!selectedConvId,
    refetchInterval: 5000,
  });

  // Real-time messages
  useEffect(() => {
    if (!selectedConvId) return;
    const unsub = base44.entities.Message.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["messages", selectedConvId] });
    });
    return unsub;
  }, [selectedConvId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!selectedConvId || !currentUser || messages.length === 0) return;
    const conv = conversations.find(c => c.id === selectedConvId);
    if (!conv) return;

    // Mark unread messages from other as read
    const unreadMsgs = messages.filter(m =>
      m.sender_email !== currentUser.email &&
      !m.read_by?.includes(currentUser.email)
    );
    if (unreadMsgs.length === 0) return;

    unreadMsgs.forEach(m => {
      base44.entities.Message.update(m.id, {
        read_by: [...(m.read_by || []), currentUser.email],
        status: "read",
      });
    });

    // Reset unread count
    const myIndex = conv.participant_emails?.indexOf(currentUser.email);
    const update = myIndex === 0
      ? { unread_count_a: 0 }
      : { unread_count_b: 0 };
    base44.entities.Conversation.update(selectedConvId, update);
    qc.invalidateQueries({ queryKey: ["conversations"] });
  }, [selectedConvId, messages, currentUser]);

  // Handle init recipient from URL
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
      const unreadUpdate = myIndex === 0
        ? { unread_count_b: (conv?.unread_count_b || 0) + 1 }
        : { unread_count_a: (conv?.unread_count_a || 0) + 1 };
      await base44.entities.Conversation.update(selectedConvId, {
        last_message: msgText.trim() || (pendingFile?.name || "Fichier"),
        last_message_at: new Date().toISOString(),
        last_message_by: currentUser.email,
        ...unreadUpdate,
      });
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

  const updateMessage = useMutation({
    mutationFn: ({ msgId, content }) => base44.entities.Message.update(msgId, { content, edited_at: new Date().toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", selectedConvId] });
      setEditingMsgId(null);
      setEditingText("");
    },
  });

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

  const handleTyping = (text) => {
    setMsgText(text);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTypingUsers(prev => {
        const next = { ...prev };
        delete next[currentUser.email];
        return next;
      });
    }, 3000);
    if (!typingUsers[currentUser.email]) {
      setTypingUsers(prev => ({ ...prev, [currentUser.email]: true }));
    }
  };

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
    (u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()))
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
      <div className={`flex flex-col border-r border-white/10 bg-[#080c14]/80 backdrop-blur-sm
        ${selectedConvId ? "hidden md:flex w-80" : "flex w-full md:w-80"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <h2 className="text-sm font-bold text-white">Messages</h2>
          <button
            onClick={() => setShowNewConv(!showNewConv)}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        {/* New conv user picker */}
        <AnimatePresence>
          {showNewConv && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-white/10 overflow-hidden"
            >
              <div className="p-3">
                <input
                  autoFocus
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Chercher un membre..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-600"
                />
                <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5">
                  {filteredUsers.slice(0, 10).map(u => (
                    <button
                      key={u.id}
                      onClick={() => startConversation(u)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/10 text-left transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {u.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-white truncate">{u.full_name}</p>
                        <p className="text-[10px] text-zinc-600 truncate">{u.email}</p>
                      </div>
                    </button>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-xs text-zinc-600 text-center py-3">Aucun membre trouvé</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="px-3 py-2 border-b border-white/5">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
            <Search className="w-3.5 h-3.5 text-zinc-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
              <MessageSquare className="w-8 h-8 text-zinc-700" />
              <p className="text-xs text-zinc-600">Aucune conversation.<br />Commencez à échanger !</p>
            </div>
          ) : (
            filteredConvs.map(conv => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                currentUserEmail={currentUser.email}
                isActive={conv.id === selectedConvId}
                onClick={() => setSelectedConvId(conv.id)}
              />
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
              <button
                className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                onClick={() => setSelectedConvId(null)}
              >
                <ArrowLeft className="w-4 h-4 text-zinc-400" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">
                {otherParticipant?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{otherParticipant || "Conversation"}</p>
                <p className="text-[10px] text-zinc-600">
                  {selectedConv?.participant_emails?.find(e => e !== currentUser.email)}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
              {messages.map((msg, i) => {
                const isMine = msg.sender_email === currentUser.email;
                const isEditing = editingMsgId === msg.id;
                const showDate = i === 0 || (
                  new Date(msg.created_date).toDateString() !== new Date(messages[i - 1]?.created_date).toDateString()
                );
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
                    {isEditing ? (
                      <div className="flex justify-end mb-2">
                        <div className="flex gap-2 max-w-[75%]">
                          <input type="text" value={editingText} onChange={e => setEditingText(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                            placeholder="Modifier le message..." />
                          <button onClick={() => { if (editingText.trim()) updateMessage.mutate({ msgId: msg.id, content: editingText.trim() }); }}
                            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm text-white">✓</button>
                          <button onClick={() => setEditingMsgId(null)} className="px-3 py-2 rounded-xl bg-white/10 text-sm text-zinc-300">✕</button>
                        </div>
                      </div>
                    ) : (
                      <MessageBubble msg={msg} isMine={isMine} currentUserEmail={currentUser.email}
                        onEdit={(m) => { setEditingMsgId(m.id); setEditingText(m.content); }}
                        onDelete={(id) => deleteMessage.mutate(id)} />
                    )}
                  </React.Fragment>
                );
              })}
              {Object.keys(typingUsers).map(email => email !== currentUser.email && (
                <div key={email} className="text-xs text-zinc-600 italic py-1 px-4">💬 En train d'écrire...</div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* File preview */}
            {pendingFile && (
              <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border-t border-white/10">
                {pendingFile.type?.startsWith("image/")
                  ? <Image className="w-4 h-4 text-blue-400" />
                  : <File className="w-4 h-4 text-blue-400" />
                }
                <span className="text-xs text-zinc-400 truncate flex-1">{pendingFile.name}</span>
                <button onClick={() => setPendingFile(null)}>
                  <X className="w-3.5 h-3.5 text-zinc-600 hover:text-red-400 transition-colors" />
                </button>
              </div>
            )}

            {/* Input */}
            <div className="flex items-end gap-2 px-4 py-3 border-t border-white/10 bg-[#080c14]/60 backdrop-blur-sm">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="p-2 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/10 transition-all flex-shrink-0"
              >
                {uploadingFile
                  ? <div className="w-4 h-4 border-t border-blue-400 rounded-full animate-spin" />
                  : <Paperclip className="w-4 h-4" />
                }
              </button>
              <input
                value={msgText}
                onChange={e => handleTyping(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (msgText.trim() || pendingFile) sendMessage.mutate();
                  }
                }}
                placeholder="Écrire un message..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 transition-colors"
              />
              <button
                onClick={() => { if (msgText.trim() || pendingFile) sendMessage.mutate(); }}
                disabled={!msgText.trim() && !pendingFile}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-all flex-shrink-0"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}