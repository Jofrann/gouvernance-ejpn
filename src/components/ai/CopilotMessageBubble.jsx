import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Copy, Check, ChevronRight, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function ToolCall({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || "Outil";
  const status = toolCall?.status || "pending";

  const statusConfig = {
    pending:     { icon: Clock,        color: "text-zinc-500",   text: "En attente" },
    running:     { icon: Loader2,      color: "text-blue-400",   text: "Exécution…", spin: true },
    in_progress: { icon: Loader2,      color: "text-blue-400",   text: "Exécution…", spin: true },
    completed:   { icon: CheckCircle2, color: "text-emerald-400",text: "Terminé" },
    success:     { icon: CheckCircle2, color: "text-emerald-400",text: "Terminé" },
    failed:      { icon: AlertCircle,  color: "text-red-400",    text: "Erreur" },
    error:       { icon: AlertCircle,  color: "text-red-400",    text: "Erreur" },
  }[status] || { icon: Clock, color: "text-zinc-500", text: "" };

  const Icon = statusConfig.icon;
  const friendlyName = name.replace(/_/g, " ").replace(/([A-Z])/g, " $1").toLowerCase();
  const parsedResults = (() => {
    if (!toolCall?.results) return null;
    try { return typeof toolCall.results === "string" ? JSON.parse(toolCall.results) : toolCall.results; }
    catch { return toolCall.results; }
  })();

  return (
    <div className="mt-1.5 text-xs">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all w-full text-left"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <Icon className={cn("w-3 h-3 flex-shrink-0", statusConfig.color, statusConfig.spin && "animate-spin")} />
        <span className="text-zinc-400 flex-1 truncate">{friendlyName}</span>
        {statusConfig.text && <span className={cn("text-[10px]", statusConfig.color)}>{statusConfig.text}</span>}
        {(toolCall.arguments_string || parsedResults) && !statusConfig.spin && (
          <ChevronRight className={cn("w-3 h-3 text-zinc-600 transition-transform flex-shrink-0", expanded && "rotate-90")} />
        )}
      </button>
      {expanded && !statusConfig.spin && (
        <div className="mt-1 ml-3 pl-3 border-l border-white/10 space-y-1.5">
          {toolCall.arguments_string && (
            <pre className="text-[10px] text-zinc-500 whitespace-pre-wrap break-all leading-relaxed">
              {(() => { try { return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2); } catch { return toolCall.arguments_string; } })()}
            </pre>
          )}
          {parsedResults && (
            <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap break-all leading-relaxed max-h-32 overflow-auto">
              {typeof parsedResults === "object" ? JSON.stringify(parsedResults, null, 2) : String(parsedResults)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function CopilotMessageBubble({ message }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex gap-2.5", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(139,92,246,0.2))", border: "1px solid rgba(99,155,255,0.2)" }}>
          <Sparkles className="w-3 h-3 text-blue-400" />
        </div>
      )}

      <div className={cn("max-w-[88%]", isUser && "flex flex-col items-end")}>
        {message.content && (
          <div
            className={cn("rounded-2xl px-3.5 py-2.5 group relative", isUser ? "rounded-br-sm" : "rounded-bl-sm")}
            style={isUser ? {
              background: "linear-gradient(135deg, rgba(59,130,246,0.85), rgba(99,102,241,0.8))",
              border: "1px solid rgba(99,155,255,0.3)",
            } : {
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {isUser ? (
              <p className="text-xs text-white leading-relaxed">{message.content}</p>
            ) : (
              <>
                <ReactMarkdown
                  className="text-xs text-zinc-200 leading-relaxed prose prose-invert prose-xs max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                  components={{
                    p: ({ children }) => <p className="my-1">{children}</p>,
                    ul: ({ children }) => <ul className="my-1 ml-3 list-disc space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="my-1 ml-3 list-decimal space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li className="text-zinc-300">{children}</li>,
                    strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                    code: ({ inline, children }) => inline
                      ? <code className="px-1 py-0.5 rounded bg-white/10 text-blue-300 text-[10px]">{children}</code>
                      : <pre className="my-2 p-2 rounded-lg bg-black/30 text-[10px] text-zinc-300 overflow-x-auto"><code>{children}</code></pre>,
                    h1: ({ children }) => <h1 className="text-sm font-bold text-white my-1">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xs font-bold text-white my-1">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xs font-semibold text-zinc-200 my-1">{children}</h3>,
                    a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{children}</a>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-zinc-500" />}
                </button>
              </>
            )}
          </div>
        )}

        {message.tool_calls?.length > 0 && (
          <div className="mt-1 w-full space-y-1">
            {message.tool_calls.map((tc, i) => <ToolCall key={i} toolCall={tc} />)}
          </div>
        )}
      </div>
    </div>
  );
}