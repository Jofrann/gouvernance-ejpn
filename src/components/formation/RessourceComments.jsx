import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, Reply, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function CommentBubble({ comment, replies, user, isResponsable, onReply }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    await base44.entities.FormationCommentaire.create({
      ressource_id: comment.ressource_id,
      auteur_email: user.email,
      auteur_nom: user.full_name,
      contenu: replyText.trim(),
      parent_id: comment.id,
      is_responsable: isResponsable,
    });
    setReplyText("");
    setShowReply(false);
    setSubmitting(false);
    onReply();
    toast.success("Réponse publiée");
  };

  return (
    <div className="space-y-2">
      {/* Main comment */}
      <div className={cn("rounded-xl p-3 space-y-1.5", comment.is_responsable
        ? "bg-blue-900/20 border border-blue-500/20"
        : "bg-white/4 border border-white/6")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
              comment.is_responsable ? "bg-blue-500/30 text-blue-300" : "bg-white/10 text-zinc-300")}>
              {(comment.auteur_nom || comment.auteur_email)?.[0]?.toUpperCase()}
            </div>
            <span className={cn("text-xs font-semibold", comment.is_responsable ? "text-blue-300" : "text-zinc-300")}>
              {comment.auteur_nom || comment.auteur_email}
              {comment.is_responsable && <span className="ml-1.5 text-[10px] text-blue-400/70 font-normal">· Responsable</span>}
            </span>
          </div>
          <span className="text-[10px] text-zinc-600">
            {format(new Date(comment.created_date), "d MMM", { locale: fr })}
          </span>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">{comment.contenu}</p>
        {isResponsable && (
          <button onClick={() => setShowReply(!showReply)}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-blue-400 transition-colors mt-1">
            <Reply className="w-3 h-3" /> Répondre
          </button>
        )}
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-4 space-y-2 border-l-2 border-white/5 pl-3">
          {replies.map(rep => (
            <div key={rep.id} className={cn("rounded-xl p-3 space-y-1", rep.is_responsable
              ? "bg-blue-900/20 border border-blue-500/20"
              : "bg-white/4 border border-white/6")}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                    rep.is_responsable ? "bg-blue-500/30 text-blue-300" : "bg-white/10 text-zinc-300")}>
                    {(rep.auteur_nom || rep.auteur_email)?.[0]?.toUpperCase()}
                  </div>
                  <span className={cn("text-xs font-semibold", rep.is_responsable ? "text-blue-300" : "text-zinc-300")}>
                    {rep.auteur_nom || rep.auteur_email}
                    {rep.is_responsable && <span className="ml-1.5 text-[10px] text-blue-400/70 font-normal">· Responsable</span>}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-600">{format(new Date(rep.created_date), "d MMM", { locale: fr })}</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{rep.contenu}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply input */}
      {showReply && (
        <div className="ml-4 flex gap-2">
          <input
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
            placeholder="Votre réponse..."
            className="flex-1 bg-blue-900/10 border border-blue-500/20 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-400/40 transition-colors"
          />
          <button onClick={handleReply} disabled={submitting || !replyText.trim()}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-colors flex-shrink-0">
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function RessourceComments({ ressourceId, user, isResponsable }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", ressourceId],
    queryFn: () => base44.entities.FormationCommentaire.filter({ ressource_id: ressourceId }),
    enabled: expanded,
  });

  // Count comments (top-level only) to show badge
  const { data: countData = [] } = useQuery({
    queryKey: ["comments-count", ressourceId],
    queryFn: () => base44.entities.FormationCommentaire.filter({ ressource_id: ressourceId }),
  });

  const topLevel = comments.filter(c => !c.parent_id);
  const replies = (parentId) => comments.filter(c => c.parent_id === parentId);

  const refresh = () => qc.invalidateQueries({ queryKey: ["comments", ressourceId] });

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    await base44.entities.FormationCommentaire.create({
      ressource_id: ressourceId,
      auteur_email: user.email,
      auteur_nom: user.full_name,
      contenu: newComment.trim(),
      is_responsable: isResponsable,
    });
    setNewComment("");
    setSubmitting(false);
    qc.invalidateQueries({ queryKey: ["comments", ressourceId] });
    qc.invalidateQueries({ queryKey: ["comments-count", ressourceId] });
    toast.success("Commentaire publié");
  };

  const total = countData.filter(c => !c.parent_id).length;

  return (
    <div className="border-t border-white/6 pt-3 mt-1 space-y-3">
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        <MessageCircle className="w-3.5 h-3.5" />
        <span>{total > 0 ? `${total} commentaire${total > 1 ? "s" : ""}` : "Commenter"}</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="space-y-3">
          {/* New comment input */}
          <div className="flex gap-2">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Laisser un commentaire..."
              className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/20 transition-colors"
            />
            <button onClick={handleSubmit} disabled={submitting || !newComment.trim()}
              className="p-2 rounded-xl bg-white/8 hover:bg-white/15 disabled:opacity-40 transition-colors flex-shrink-0">
              <Send className="w-3.5 h-3.5 text-zinc-300" />
            </button>
          </div>

          {/* Comments list */}
          {topLevel.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-2">Aucun commentaire — soyez le premier !</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {topLevel.map(c => (
                <CommentBubble
                  key={c.id}
                  comment={c}
                  replies={replies(c.id)}
                  user={user}
                  isResponsable={isResponsable}
                  onReply={refresh}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}