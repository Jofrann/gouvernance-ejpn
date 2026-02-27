import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CheckCircle2, XCircle, FileText, ExternalLink, History } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import AILivrableGrader from "@/components/ai/AILivrableGrader";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const STATUT_CONFIG = {
  soumis:     { label: "À corriger", cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  valide:     { label: "Validé",     cls: "text-emerald-400 bg-emerald-900/30 border-emerald-500/20" },
  rejete:     { label: "Rejeté",     cls: "text-red-400 bg-red-900/30 border-red-500/20" },
  en_attente: { label: "En attente", cls: "text-zinc-400 bg-zinc-800 border-zinc-700" },
};

export default function FormationCorrectionPage() {
  useTrackActivity("FormationCorrection");
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterStatut, setFilterStatut] = useState("soumis");

  const { data: livrables = [] } = useQuery({
    queryKey: ["all-livrables-correction"],
    queryFn: () => base44.entities.FormationLivrable.list("-date_soumission", 200),
    refetchInterval: 30000,
  });
  const { data: ressources = [] } = useQuery({
    queryKey: ["formation-ressources"],
    queryFn: () => base44.entities.FormationRessource.list("-mois_cycle", 200),
  });

  const filtered = livrables.filter(l => filterStatut === "all" || l.statut === filterStatut);
  const counts = {
    soumis: livrables.filter(l => l.statut === "soumis").length,
    valide: livrables.filter(l => l.statut === "valide").length,
    rejete: livrables.filter(l => l.statut === "rejete").length,
  };

  const openLivrable = (l) => {
    setSelected(l);
    setNote(l.note?.toString() || "");
    setCommentaire(l.commentaire_responsable || "");
  };

  const handleSave = async (statut) => {
    setSaving(true);
    await base44.entities.FormationLivrable.update(selected.id, { statut, note: parseFloat(note) || undefined, commentaire_responsable: commentaire, date_correction: format(new Date(), "yyyy-MM-dd") });
    qc.invalidateQueries({ queryKey: ["all-livrables-correction"] });
    toast.success(statut === "valide" ? "Livrable validé !" : "Livrable rejeté");
    setSelected(null);
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-bold text-white">Correction des Livrables</h1>
          <p className="text-xs text-zinc-600">Kanban de correction · Notes & Feedback</p>
        </div>
        {counts.soumis > 0 && (
          <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
            {counts.soumis} à corriger
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 flex items-center gap-2 px-6 py-3 border-b border-white/5">
        {[["soumis", `À corriger (${counts.soumis})`], ["valide", `Validés (${counts.valide})`], ["rejete", `Rejetés (${counts.rejete})`], ["all", "Tous"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatut(v)}
            className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
              filterStatut === v ? "bg-white/10 text-white border-white/20" : "text-zinc-500 border-white/5 hover:bg-white/5 hover:text-zinc-300")}>
            {l}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {filtered.length === 0 && (
          <div className="ai-card rounded-xl border border-white/5 p-12 text-center">
            <p className="text-sm text-zinc-600">Aucun livrable{filterStatut !== "all" ? ` "${filterStatut}"` : ""}</p>
          </div>
        )}
        {filtered.map(l => {
          const cfg = STATUT_CONFIG[l.statut] || STATUT_CONFIG.soumis;
          return (
            <div key={l.id} onClick={() => openLivrable(l)}
              className={cn("ai-card flex items-center justify-between gap-3 p-4 rounded-xl border cursor-pointer hover:border-white/20 transition-all",
                l.statut === "soumis" ? "border-blue-500/20 bg-blue-900/10" : "border-white/8")}>
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">{l.titre_livrable}</p>
                  <p className="text-xs text-zinc-600">{l.pilote_nom || l.pilote_email} · {l.mois_cycle} · V{l.version || 1} · {l.date_soumission}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {l.note != null && <span className="text-xs font-bold text-white border border-white/10 rounded-md px-2 py-0.5">{l.note}/20</span>}
                <span className={cn("text-[10px] border px-2 py-0.5 rounded-md", cfg.cls)}>{cfg.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-[#0d1018] border-l border-white/10 overflow-y-auto p-5">
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b border-white/10">
                <SheetTitle className="text-white">{selected.titre_livrable}</SheetTitle>
                <p className="text-xs text-zinc-500">{selected.pilote_nom || selected.pilote_email} · {selected.mois_cycle} · V{selected.version || 1}</p>
              </SheetHeader>
              <div className="py-5 space-y-4">
                <button onClick={() => window.open(selected.file_url, "_blank")}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-300 hover:bg-white/10 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Ouvrir le livrable
                </button>

                {selected.historique_versions?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-600 uppercase mb-2 flex items-center gap-1.5"><History className="w-3 h-3" /> Versions précédentes</p>
                    {selected.historique_versions.map(v => (
                      <div key={v.version} className="flex items-center gap-2 p-2.5 rounded-xl border border-white/5 bg-white/3 mb-1.5 text-xs">
                        <span className="text-zinc-600">V{v.version}</span>
                        <span className={cn("px-1.5 py-0.5 rounded-md border text-[10px]", STATUT_CONFIG[v.statut]?.cls || "bg-zinc-800 text-zinc-500")}>{v.statut}</span>
                        {v.file_url && <button className="text-blue-400 hover:text-blue-300 ml-auto" onClick={() => window.open(v.file_url, "_blank")}><ExternalLink className="w-3 h-3" /></button>}
                      </div>
                    ))}
                  </div>
                )}

                {selected.statut === "soumis" && (
                  <div className="space-y-3">
                    <AILivrableGrader livrable={selected} ressources={ressources} onApplyGrade={(preNote, preComment) => { setNote(preNote.toString()); setCommentaire(preComment); }} />
                    <p className="text-xs font-semibold text-zinc-500 uppercase">Correction finale</p>
                    <input type="number" min="0" max="20" step="0.5" placeholder="Note /20"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 transition-colors"
                      value={note} onChange={e => setNote(e.target.value)} />
                    <textarea placeholder="Feedback détaillé : points forts, axes d'amélioration..." rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 resize-none transition-colors"
                      value={commentaire} onChange={e => setCommentaire(e.target.value)} />
                    <div className="flex gap-2">
                      <button disabled={saving} onClick={() => handleSave("valide")}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-sm font-semibold text-white transition-all">
                        <CheckCircle2 className="w-4 h-4" /> Valider
                      </button>
                      <button disabled={saving} onClick={() => handleSave("rejete")}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 text-sm font-semibold text-red-400 disabled:opacity-40 transition-all">
                        <XCircle className="w-4 h-4" /> Rejeter
                      </button>
                    </div>
                  </div>
                )}

                {selected.statut !== "soumis" && (
                  <div className={cn("p-4 rounded-xl border",
                    selected.statut === "valide" ? "bg-emerald-900/20 border-emerald-500/20" : "bg-red-900/20 border-red-500/20")}>
                    <p className={cn("text-xs font-semibold mb-1", selected.statut === "valide" ? "text-emerald-400" : "text-red-400")}>
                      {selected.statut === "valide" ? "✓ Validé" : "✗ Rejeté"}{selected.date_correction ? ` le ${selected.date_correction}` : ""}
                    </p>
                    {selected.note != null && <p className="text-sm font-bold text-white mb-1">Note : {selected.note}/20</p>}
                    {selected.commentaire_responsable && <p className="text-xs text-zinc-400">{selected.commentaire_responsable}</p>}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}