import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Zap, Plus, Trash2, AlertTriangle, X, Pin } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function MemoFlashBoard({ pole, user }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  const { data: memos = [] } = useQuery({
    queryKey: ["memos-flash", pole],
    queryFn: async () => {
      const all = await base44.entities.MemoFlash.list("-created_date", 20);
      return all.filter(m => m.pole === pole || m.pole === "tous");
    },
    refetchInterval: 15000,
  });

  // Real-time
  useEffect(() => {
    const unsub = base44.entities.MemoFlash.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["memos-flash", pole] });
    });
    return unsub;
  }, [pole]);

  const createMemo = useMutation({
    mutationFn: (data) => base44.entities.MemoFlash.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memos-flash", pole] });
      setContent("");
      setIsUrgent(false);
      setShowForm(false);
    },
  });

  const deleteMemo = useMutation({
    mutationFn: (id) => base44.entities.MemoFlash.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memos-flash", pole] }),
  });

  const handleSubmit = () => {
    if (!content.trim()) return;
    createMemo.mutate({
      content: content.trim(),
      pole,
      is_urgent: isUrgent,
      auteur_nom: user?.full_name || "",
      auteur_email: user?.email || "",
    });
  };

  if (memos.length === 0 && !showForm) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/10 text-zinc-600 hover:text-zinc-400 hover:border-white/20 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Épingler un mémo flash...
        </button>
      </div>
    );
  }

  return (
    <div className="mb-8 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pin className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Mémos Flash</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
        >
          <Plus className="w-3 h-3" />
          Nouveau
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="ai-card p-4 space-y-3">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Rédigez votre mémo flash... (alerte, note de synthèse, info urgente)"
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none resize-none h-20"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setIsUrgent(!isUrgent)}
                className={`w-8 h-4 rounded-full transition-colors ${isUrgent ? "bg-red-500" : "bg-white/10"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${isUrgent ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <span className="text-xs text-zinc-500">Urgent</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-zinc-500 hover:text-white transition-colors">Annuler</button>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || createMemo.isPending}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium disabled:opacity-50 transition-all"
              >
                Épingler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Memos list */}
      {memos.map(memo => (
        <div
          key={memo.id}
          className={`ai-card p-4 flex gap-3 items-start ${memo.is_urgent ? "border-red-500/30 bg-red-500/5" : ""}`}
        >
          {memo.is_urgent && <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white leading-relaxed">{memo.content}</p>
            <p className="text-[10px] text-zinc-600 mt-1.5">
              {memo.auteur_nom} · {memo.created_date ? format(new Date(memo.created_date), "d MMM, HH:mm", { locale: fr }) : "—"}
            </p>
          </div>
          {(user?.email === memo.auteur_email || user?.role === "admin") && (
            <button
              onClick={() => deleteMemo.mutate(memo.id)}
              className="p-1 text-zinc-700 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}