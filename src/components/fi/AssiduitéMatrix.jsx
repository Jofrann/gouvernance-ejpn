import React, { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, subWeeks, startOfWeek, setDay, eachWeekOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function AssiduitéMatrix({ membreId, saisies, nbWeeks = 13 }) {
  const weeks = useMemo(() => {
    const end = new Date();
    const start = subWeeks(end, nbWeeks - 1);
    return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map((weekStart) => {
      const thursday = setDay(weekStart, 4, { weekStartsOn: 1 });
      const key = format(thursday, "yyyy-MM-dd");
      const saisie = saisies.find((s) => s.membre_id === membreId && s.semaine === key);
      const avg = saisie
        ? (() => {
            const notes = [saisie.note_temps, saisie.note_finances, saisie.note_emotions, saisie.note_spirituel].filter((n) => n !== null && n !== undefined);
            return notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : null;
          })()
        : null;
      return { key, thursday, present: saisie?.presence, avg, saisie };
    });
  }, [membreId, saisies, nbWeeks]);

  const getColor = (week) => {
    if (!week.saisie) return "bg-zinc-100";
    if (!week.present) return "bg-red-200";
    if (week.avg === null) return "bg-emerald-200";
    if (week.avg >= 8) return "bg-emerald-500";
    if (week.avg >= 5) return "bg-amber-400";
    return "bg-red-500";
  };

  return (
    <TooltipProvider>
      <div className="flex gap-1 flex-wrap">
        {weeks.map((week) => (
          <Tooltip key={week.key}>
            <TooltipTrigger asChild>
              <div className={cn("w-4 h-4 rounded-sm cursor-pointer hover:opacity-80 transition-opacity", getColor(week))} />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium capitalize">{format(week.thursday, "d MMM yyyy", { locale: fr })}</p>
              {!week.saisie && <p className="text-zinc-400">Non saisi</p>}
              {week.saisie && !week.present && <p className="text-red-400">Absent</p>}
              {week.saisie && week.present && <p className="text-emerald-600">Présent · {week.avg !== null ? `Moy. ${week.avg.toFixed(1)}/10` : "—"}</p>}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}