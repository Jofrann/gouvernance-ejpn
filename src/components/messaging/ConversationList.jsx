import React from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function ConversationList({ conversations, selectedConversation, onSelectConversation, currentUserEmail }) {
  return (
    <div className="flex flex-col h-full border-r border-white/10">
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm">
            Aucune conversation
          </div>
        ) : (
          conversations.map((conv) => {
            const otherParticipant = conv.participant1_email === currentUserEmail 
              ? { email: conv.participant2_email, nom: conv.participant2_nom }
              : { email: conv.participant1_email, nom: conv.participant1_nom };

            const unreadCount = conv.participant1_email === currentUserEmail 
              ? conv.unread_count_p1 
              : conv.unread_count_p2;

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={cn(
                  "w-full p-4 border-b border-white/5 text-left hover:bg-white/5 transition-all",
                  selectedConversation?.id === conv.id && "bg-white/10"
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-white truncate">{otherParticipant.nom}</h3>
                  {unreadCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-400 truncate">{conv.last_message_content}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {formatDistanceToNow(new Date(conv.last_message_date), { locale: fr, addSuffix: true })}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}