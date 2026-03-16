import React from "react";
import { cn } from "@/lib/utils";
import { Check, X, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SCORE_LABELS = {
  note_temps: "⏰ Temps",
  note_finances: "💰 Finances",
  note_emotions: "💭 Émotions",
  note_spirituel: "🙏 Spirituel",
};

function getScoreColor(v) {
  if (v === null || v === undefined) return "text-zinc-600";
  if (v >= 8) return "text-emerald-400";
  if (v >= 5) return "text-amber-400";
  return "text-red-400";
}

function getScoreBg(v) {
  if (v === null || v === undefined) return "bg-white/[0.03] border-white/[0.06]";
  if (v >= 8) return "bg-emerald-500/10 border-emerald-500/20 text-emerald-300";
  if (v >= 5) return "bg-amber-500/10 border-amber-500/20 text-amber-300";
  return "bg-red-500/10 border-red-500/20 text-red-300";
}

function ScoreCell({ value, onChange, field }) {
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
              "w-full h-8 text-center rounded-lg border text-xs font-bold outline-none transition-all",
              "placeholder:text-zinc-700 focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/40",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              getScoreBg(value)
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-zinc-900 border-white/10 text-xs">
          {SCORE_LABELS[field]} (0–10)
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function PresenceToggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        "w-full h-8 flex items-center justify-center rounded-lg border text-xs transition-all",
        value
          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
          : "bg-white/[0.03] border-white/[0.06] text-zinc-600 hover:border-white/10 hover:text-zinc-400"
      )}
    >
      {value ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function CliniqueGrid({ membres, saisies, onUpdateSaisie, savingMap = {} }) {
  const getMoyenne = (saisie) => {
    const notes = [saisie?.note_temps, saisie?.note_finances, saisie?.note_emotions, saisie?.note_spirituel]
      .filter(n => n !== null && n !== undefined);
    if (notes.length === 0) return null;
    return (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1);
  };

  if (membres.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
        <p className="text-sm">Aucun membre dans cette FI</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.09]"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
        backdropFilter: "blur(40px)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.28)"
      }}>
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-white/[0.07]">
            <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.15em] w-44 sticky left-0 z-10"
              style={{ background: "rgba(6,8,16,0.6)", backdropFilter: "blur(12px)" }}>
              Membre
            </th>
            <th className="px-2 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider text-center w-16">
              Présence
            </th>
            {["note_temps", "note_finances", "note_emotions", "note_spirituel"].map(field => (
              <th key={field} className="px-2 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider text-center w-20">
                <div className="flex flex-col items-center gap-0.5">
                  <span>{field === "note_temps" ? "⏰" : field === "note_finances" ? "💰" : field === "note_emotions" ? "💭" : "🙏"}</span>
                  <span>{field === "note_temps" ? "Temps" : field === "note_finances" ? "Finances" : field === "note_emotions" ? "Émotions" : "Spirituel"}</span>
                </div>
              </th>
            ))}
            <th className="px-3 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider text-center w-16">
              Moy.
            </th>
          </tr>
        </thead>
        <tbody>
          {membres.map((membre, i) => {
            const saisie = saisies[membre.id] || {};
            const moyenne = getMoyenne(saisie);
            const isSaving = savingMap[membre.id];
            return (
              <tr key={membre.id}
                className={cn("border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]",
                  i === membres.length - 1 && "border-b-0")}>
                <td className="px-4 py-2.5 sticky left-0 z-10"
                  style={{ background: "rgba(6,8,16,0.85)", backdropFilter: "blur(12px)" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {membre.nom_complet?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-200 truncate leading-tight">{membre.nom_complet}</p>
                      <p className="text-[10px] text-zinc-600 capitalize">{membre.statut_pipeline}</p>
                    </div>
                    {isSaving && <Loader2 className="w-3 h-3 text-blue-400 animate-spin flex-shrink-0" />}
                  </div>
                </td>
                <td className="px-2 py-2.5">
                  <PresenceToggle value={saisie.presence} onChange={(v) => onUpdateSaisie(membre.id, "presence", v)} />
                </td>
                {["note_temps", "note_finances", "note_emotions", "note_spirituel"].map(field => (
                  <td key={field} className="px-2 py-2.5">
                    <ScoreCell
                      value={saisie[field]}
                      field={field}
                      onChange={(v) => onUpdateSaisie(membre.id, field, v)}
                    />
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center">
                  {moyenne !== null ? (
                    <span className={cn("text-sm font-black", getScoreColor(parseFloat(moyenne)))}>
                      {moyenne}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-700">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}