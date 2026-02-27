import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCheck, Check, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MessageBubble({ message, isOwn, recipient }) {
  const displayStatus = isOwn ? (
    message.status === "read" ? (
      <CheckCheck className="w-4 h-4 text-blue-400" />
    ) : message.status === "delivered" ? (
      <CheckCheck className="w-4 h-4 text-zinc-500" />
    ) : (
      <Check className="w-4 h-4 text-zinc-500" />
    )
  ) : null;

  return (
    <div className={cn("flex gap-3 mb-3", isOwn ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-xs", isOwn && "flex flex-col items-end")}>
        <div className={cn(
          "rounded-2xl px-4 py-2.5 break-words",
          isOwn ? "bg-blue-600 text-white rounded-br-none" : "bg-white/10 text-zinc-200 rounded-bl-none"
        )}>
          <p className="text-sm leading-relaxed">{message.content}</p>
          {message.file_urls && message.file_urls.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.file_urls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs underline opacity-80 hover:opacity-100"
                >
                  📎 Fichier
                </a>
              ))}
            </div>
          )}
        </div>
        <div className={cn(
          "flex items-center gap-1.5 mt-1 text-xs text-zinc-500",
          isOwn && "flex-row-reverse"
        )}>
          <span>{format(new Date(message.created_date), "HH:mm", { locale: fr })}</span>
          {displayStatus}
        </div>
      </div>
    </div>
  );
}