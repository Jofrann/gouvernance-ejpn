import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function MessageInput({ onSendMessage, isLoading }) {
  const [content, setContent] = useState("");
  const [fileUrls, setFileUrls] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleSend = async () => {
    if (!content.trim()) return;
    await onSendMessage(content, fileUrls);
    setContent("");
    setFileUrls([]);
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const res = await base44.integrations.Core.UploadFile({ file });
        setFileUrls(prev => [...prev, res.file_url]);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSend();
    }
  };

  return (
    <div className="border-t border-white/10 p-4 space-y-3">
      {fileUrls.length > 0 && (
        <div className="space-y-1 bg-white/5 rounded-lg p-2">
          {fileUrls.map((url, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs text-zinc-400">
              <span>📎 Fichier {idx + 1}</span>
              <button
                onClick={() => setFileUrls(fileUrls.filter((_, i) => i !== idx))}
                className="text-red-400 hover:text-red-300"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez un message... (Ctrl+Entrée pour envoyer)"
          className="resize-none h-20 bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
        />
        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
            {isUploading ? (
              <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5 text-zinc-400" />
            )}
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
          <Button
            onClick={handleSend}
            disabled={!content.trim() || isLoading || isUploading}
            className="bg-blue-600 hover:bg-blue-700 h-auto flex-1"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}