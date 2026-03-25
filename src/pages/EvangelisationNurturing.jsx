import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2, Users } from "lucide-react";
import AmeCard from "@/components/evangelisation/AmeCard";
import AmeSlideOver from "@/components/evangelisation/AmeSlideOver";

const COLONNES = [
  { key: "Nouveau (Glacé)",          label: "Nouveau",               emoji: "🧊", color: "border-blue-500/20 bg-blue-500/5" },
  { key: "Premier Contact Digital",  label: "Contact Digital",       emoji: "📱", color: "border-cyan-500/20 bg-cyan-500/5" },
  { key: "Création de Lien",         label: "Création de Lien",      emoji: "☕", color: "border-violet-500/20 bg-violet-500/5" },
  { key: "Confirmé Dimanche",        label: "Confirmé Dimanche",     emoji: "⛪", color: "border-amber-500/20 bg-amber-500/5" },
  { key: "Transféré FI",             label: "Transféré FI",          emoji: "🟢", color: "border-emerald-500/20 bg-emerald-500/5" },
];

export default function EvangelisationNurturingPage() {
  const queryClient = useQueryClient();
  const [selectedAme, setSelectedAme] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const { data: ames = [], isLoading } = useQuery({
    queryKey: ["evang-ames"],
    queryFn: () => base44.entities.AmeVivier.list("-created_date", 300),
  });

  const handleDragStart = (ame) => setDraggingId(ame.id);
  const handleDragEnd = () => { setDraggingId(null); setDragOverCol(null); };
  const handleDragOver = (e, col) => { e.preventDefault(); setDragOverCol(col); };

  const handleDrop = async (e, newStatut) => {
    e.preventDefault();
    if (!draggingId) return;
    const ame = ames.find(a => a.id === draggingId);
    if (!ame || ame.statut_confiance === newStatut) { setDraggingId(null); setDragOverCol(null); return; }

    await base44.entities.AmeVivier.update(draggingId, { statut_confiance: newStatut });
    queryClient.invalidateQueries({ queryKey: ["evang-ames"] });
    setDraggingId(null);
    setDragOverCol(null);
  };

  const byColonne = COLONNES.reduce((acc, col) => {
    acc[col.key] = ames.filter(a => a.statut_confiance === col.key);
    return acc;
  }, {});

  const total = ames.length;

  return (
    <div className="px-4 md:px-6 py-8 space-y-6 h-full">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-[0.25em] mb-1">Évangélisation · Pilier 2</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Vivier & Suivi Digital</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {total} contact{total !== 1 ? "s" : ""} dans le tunnel · Glisser-déposer pour avancer
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
        </div>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] py-20 text-center">
          <Users className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
          <p className="text-sm font-medium text-zinc-500">Le Vivier est vide</p>
          <p className="text-xs text-zinc-700 mt-1">Les contacts apparaissent ici après le scellement d'un CR.</p>
        </div>
      ) : (
        /* Kanban Board */
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
          {COLONNES.map(col => {
            const cartes = byColonne[col.key] || [];
            const isOver = dragOverCol === col.key;
            return (
              <div
                key={col.key}
                className={cn(
                  "flex-shrink-0 w-72 rounded-2xl border p-3 flex flex-col gap-2 transition-all",
                  col.color,
                  isOver && "ring-2 ring-white/20 scale-[1.01]"
                )}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-1 pb-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{col.emoji}</span>
                    <span className="text-xs font-bold text-zinc-300">{col.label}</span>
                  </div>
                  <span className="text-xs text-zinc-600 font-medium bg-white/[0.05] px-2 py-0.5 rounded-full">
                    {cartes.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                  <AnimatePresence>
                    {cartes.map(ame => (
                      <AmeCard
                        key={ame.id}
                        ame={ame}
                        isDragging={draggingId === ame.id}
                        onDragStart={() => handleDragStart(ame)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedAme(ame)}
                      />
                    ))}
                  </AnimatePresence>
                  {cartes.length === 0 && (
                    <div className={cn("flex-1 rounded-xl border border-dashed border-white/[0.06] flex items-center justify-center min-h-[80px]",
                      isOver && "border-white/20 bg-white/[0.03]")}>
                      <p className="text-xs text-zinc-700">Déposer ici</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-Over */}
      <AnimatePresence>
        {selectedAme && (
          <AmeSlideOver
            ame={selectedAme}
            onClose={() => setSelectedAme(null)}
            onUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ["evang-ames"] });
              setSelectedAme(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}