import React from "react";
import { cn } from "@/lib/utils";
import { Check, X, Lock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function ScoreCell({ value, onChange, locked, label }) {
  const getColor = (v) => {
    if (v === null || v === undefined) return "bg-white/5 text-zinc-600 border-white/10";
    if (v >= 8) return "bg-emerald-900/40 text-emerald-400 border-emerald-500/30";
    if (v >= 5) return "bg-amber-900/40 text-amber-400 border-amber-500/30";
    return "bg-red-900/40 text-red-400 border-red-500/30";
  };

  if (locked) {
    return (
      <div className={cn("w-full h-9 flex items-center justify-center rounded-md border text-sm font-semibold", getColor(value))}>
        {value ?? "—"}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <input
            type="number"
            min="0"
            max="10"
            value={value ?? ""}
            onChange={(e) => {
              const v = e.target.value === "" ? null : Math.min(10, Math.max(0, parseInt(e.target.value)));
              onChange(v);
            }}
            placeholder="—"
            className={cn(
              "w-full h-9 text-center rounded-md border text-sm font-semibold outline-none transition-all",
              "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400",
              getColor(value)
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{label} (0-10)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function PresenceToggle({ value, onChange, locked }) {
  if (locked) {
    return (
      <div className={cn("w-full h-9 flex items-center justify-center rounded-md border text-sm",
        value ? "bg-emerald-900/40 border-emerald-500/30" : "bg-red-900/40 border-red-500/30")}>
        {value ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-red-400" />}
      </div>
    );
  }

  return (
    <button onClick={() => onChange(!value)}
      className={cn("w-full h-9 flex items-center justify-center rounded-md border text-sm transition-all hover:opacity-80",
        value ? "bg-emerald-900/40 border-emerald-500/30" : "bg-white/5 border-white/10")}>
      {value ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-zinc-600" />}
    </button>
  );
}

export default function CliniqueGrid({ membres, saisies, onUpdateSaisie, locked }) {
  const getMoyenne = (saisie) => {
    const notes = [saisie?.note_temps, saisie?.note_finances, saisie?.note_emotions, saisie?.note_spirituel].filter(n => n !== null && n !== undefined);
    if (notes.length === 0) return null;
    return (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-40 sticky left-0 bg-[#0e1420] z-10">
              Membre
            </th>
            <th className="px-3 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center w-20">Présence</th>
            <th className="px-3 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center w-20">
              <div className="flex flex-col items-center"><span>⏰</span><span>Temps</span></div>
            </th>
            <th className="px-3 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center w-20">
              <div className="flex flex-col items-center"><span>💰</span><span>Finances</span></div>
            </th>
            <th className="px-3 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center w-20">
              <div className="flex flex-col items-center"><span>💭</span><span>Émotions</span></div>
            </th>
            <th className="px-3 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center w-20">
              <div className="flex flex-col items-center"><span>🙏</span><span>Spirituel</span></div>
            </th>
            <th className="px-3 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center w-20">Moy.</th>
            <th className="px-3 py-3 text-center w-10">
              {locked && <Lock className="w-3.5 h-3.5 mx-auto text-zinc-600" />}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {membres.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-12 text-sm text-zinc-600">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-zinc-700" />
                Aucun membre dans cette Famille d'Impact
              </td>
            </tr>
          ) : (
            membres.map((membre) => {
              const saisie = saisies[membre.id] || {};
              const moyenne = getMoyenne(saisie);
              return (
                <tr key={membre.id} className="group hover:bg-white/3 transition-colors">
                  <td className="px-4 py-2.5 sticky left-0 bg-[#0e1420] group-hover:bg-[#111827] z-10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0">
                        {membre.nom_complet?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{membre.nom_complet}</p>
                        <span className="text-[10px] text-zinc-600">{membre.statut_pipeline}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><PresenceToggle value={saisie.presence} onChange={(v) => onUpdateSaisie(membre.id, "presence", v)} locked={locked} /></td>
                  <td className="px-3 py-2.5"><ScoreCell value={saisie.note_temps} onChange={(v) => onUpdateSaisie(membre.id, "note_temps", v)} locked={locked} label="Gestion du temps" /></td>
                  <td className="px-3 py-2.5"><ScoreCell value={saisie.note_finances} onChange={(v) => onUpdateSaisie(membre.id, "note_finances", v)} locked={locked} label="Finances" /></td>
                  <td className="px-3 py-2.5"><ScoreCell value={saisie.note_emotions} onChange={(v) => onUpdateSaisie(membre.id, "note_emotions", v)} locked={locked} label="Émotions" /></td>
                  <td className="px-3 py-2.5"><ScoreCell value={saisie.note_spirituel} onChange={(v) => onUpdateSaisie(membre.id, "note_spirituel", v)} locked={locked} label="Spirituel" /></td>
                  <td className="px-3 py-2.5 text-center">
                    {moyenne !== null ? (
                      <span className={cn("text-sm font-bold", parseFloat(moyenne) >= 8 ? "text-emerald-400" : parseFloat(moyenne) >= 5 ? "text-amber-400" : "text-red-400")}>{moyenne}</span>
                    ) : <span className="text-xs text-zinc-700">—</span>}
                  </td>
                  <td className="px-3 py-2.5" />
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}