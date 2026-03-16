import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export default function FIHeaderInfo({ fi }) {
  const { data: membres = [] } = useQuery({
    queryKey: ["membres-count", fi?.id],
    queryFn: () => base44.entities.Membre.filter({ famille_impact_id: fi.id }),
    enabled: !!fi?.id,
  });

  const progress = fi.objectif_membres ? Math.min((membres.length / fi.objectif_membres) * 100, 100) : null;

  return (
    <div className="text-right space-y-1.5">
      <div className="flex items-center justify-end gap-2">
        {fi.campus && <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{fi.campus}</span>}
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full border",
          fi.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
            fi.status === "en_pause" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
              "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
        )}>
          {fi.status === "active" ? "Active" : fi.status === "en_pause" ? "En pause" : "Fermée"}
        </span>
      </div>
      {fi.pilote_nom && <p className="text-xs text-zinc-400">👤 {fi.pilote_nom}</p>}
      {fi.co_pilote_nom && <p className="text-[10px] text-zinc-500">Co-pilote : {fi.co_pilote_nom}</p>}
      {progress !== null && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-[10px] text-zinc-500">{membres.length}/{fi.objectif_membres} membres</span>
          <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700",
                progress >= 100 ? "bg-emerald-500" : progress >= 60 ? "bg-blue-500" : "bg-amber-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={cn("text-[10px] font-bold",
            progress >= 100 ? "text-emerald-400" : progress >= 60 ? "text-blue-400" : "text-amber-400"
          )}>{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  );
}