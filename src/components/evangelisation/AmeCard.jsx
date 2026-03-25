import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Phone, Instagram, UserCheck } from "lucide-react";

export default function AmeCard({ ame, isDragging, onDragStart, onDragEnd, onClick }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "rounded-xl border border-white/[0.08] bg-[#0d1018] p-3 cursor-grab active:cursor-grabbing hover:border-white/[0.18] transition-all select-none",
        isDragging && "opacity-50 ring-1 ring-white/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{ame.nom_prenom}</p>
          {ame.age && <p className="text-[10px] text-zinc-600 mt-0.5">{ame.age} ans</p>}
        </div>
        {ame.invite_fij && (
          <span className="flex-shrink-0 text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">
            Invité
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mt-2">
        {ame.telephone && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-600">
            <Phone className="w-3 h-3" /> {ame.telephone}
          </span>
        )}
        {ame.instagram && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-600">
            <Instagram className="w-3 h-3" /> @{ame.instagram.replace("@", "")}
          </span>
        )}
      </div>
    </motion.div>
  );
}