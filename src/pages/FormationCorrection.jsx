import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CheckCircle2, XCircle, Clock, FileText, ExternalLink, History } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import AILivrableGrader from "@/components/ai/AILivrableGrader";
import { motion } from "framer-motion";

const STATUT_CONFIG = {
  soumis: { label: "À corriger", class: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  valide: { label: "Validé", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  rejete: { label: "Rejeté", class: "bg-red-500/10 text-red-400 border-red-500/20" },
  en_attente: { label: "En attente", class: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" },
};

export default function FormationCorrectionPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterStatut, setFilterStatut] = useState("soumis");

  const { data: livrables = [] } = useQuery({
    queryKey: ["all-livrables-correction"],
    queryFn: () => base44.entities.FormationLivrable.list("-date_soumission", 200),
  });

  const { data: ressources = [] } = useQuery({
    queryKey: ["formation-ressources"],
    queryFn: () => base44.entities.FormationRessource.list("-mois_cycle", 200),
  });

  const filtered = livrables.filter((l) => filterStatut === "all" ? true : l.statut === filterStatut);

  const openLivrable = (l) => { setSelected(l); setNote(l.note?.toString() || ""); setCommentaire(l.commentaire_responsable || ""); };

  const handleSave = async (statut) => {
    setSaving(true);
    await base44.entities.FormationLivrable.update(selected.id, {
      statut,
      note: parseFloat(note) || undefined,
      commentaire_responsable: commentaire,
      date_correction: format(new Date(), "yyyy-MM-dd"),
    });
    queryClient.invalidateQueries({ queryKey: ["all-livrables-correction"] });
    toast.success(statut === "valide" ? "Livrable validé !" : "Livrable rejeté");
    setSelected(null);
    setSaving(false);
  };

  const counts = {
    soumis: livrables.filter((l) => l.statut === "soumis").length,
    valide: livrables.filter((l) => l.statut === "valide").length,
    rejete: livrables.filter((l) => l.statut === "rejete").length,
  };

  return (
    <div className="px-6 py-10 max-w-5xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-bold text-violet-400/80 uppercase tracking-[0.25em] mb-1">Formation</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Correction des Livrables</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Kanban de correction · Notes & Feedback</p>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[["soumis", `À corriger (${counts.soumis})`], ["valide", `Validés (${counts.valide})`], ["rejete", `Rejetés (${counts.rejete})`], ["all", "Tous"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatut(v)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              filterStatut === v ? "bg-white/10 text-white border-white/20" : "bg-white/[0.03] text-zinc-500 border-white/[0.07] hover:bg-white/[0.06]")}>
            {l}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] py-12 text-center text-sm text-zinc-600">
            Aucun livrable {filterStatut !== "all" ? `"${filterStatut}"` : ""}
          </div>
        )}
        {filtered.map((l) => {
          const cfg = STATUT_CONFIG[l.statut] || STATUT_CONFIG.soumis;
          return (
            <div key={l.id}
              className={cn("rounded-xl border cursor-pointer hover:border-white/[0.14] transition-all p-4 flex items-center justify-between gap-3",
                l.statut === "soumis" ? "border-blue-500/20 bg-blue-500/5" : "border-white/[0.07] bg-white/[0.025]")}
              onClick={() => openLivrable(l)}>
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">{l.titre_livrable}</p>
                  <p className="text-xs text-zinc-500">{l.pilote_nom || l.pilote_email} · {l.mois_cycle} · V{l.version || 1} · soumis {l.date_soumission}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {l.note != null && <Badge variant="outline" className="text-xs font-bold border-white/20 text-zinc-400">{l.note}/20</Badge>}
                <Badge className={cn("text-[10px] border", cfg.class)}>{cfg.label}</Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-[#0d1018] border-white/10 text-white">
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b border-white/10">
                <SheetTitle className="text-white">{selected.titre_livrable}</SheetTitle>
                <p className="text-xs text-zinc-500">{selected.pilote_nom || selected.pilote_email} · {selected.mois_cycle} · V{selected.version || 1}</p>
              </SheetHeader>
              <div className="py-5 space-y-5">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 transition-all text-sm"
                  onClick={() => window.open(selected.file_url, "_blank")}>
                  <ExternalLink className="w-4 h-4" /> Ouvrir le livrable
                </button>

                {(selected.historique_versions?.length > 0) && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Versions précédentes</p>
                    {selected.historique_versions.map((v) => (
                      <div key={v.version} className="flex items-center gap-2 p-2 rounded border border-white/[0.07] bg-white/[0.02] mb-1 text-xs">
                        <span className="text-zinc-500">V{v.version}</span>
                        <Badge className={cn("text-[10px] border", STATUT_CONFIG[v.statut]?.class || "bg-zinc-500/10 text-zinc-500 border-zinc-500/20")}>{v.statut}</Badge>
                        {v.file_url && <button className="text-blue-400 ml-auto" onClick={() => window.open(v.file_url, "_blank")}>voir</button>}
                      </div>
                    ))}
                  </div>
                )}

                {selected.statut === "soumis" && (
                  <div className="space-y-3">
                    <AILivrableGrader
                      livrable={selected}
                      ressources={ressources}
                      onApplyGrade={(preNote, preComment) => { setNote(preNote.toString()); setCommentaire(preComment); }}
                    />
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Correction finale</p>
                    <div>
                      <label className="text-xs text-zinc-500">Note sur 20</label>
                      <input type="number" min="0" max="20" step="0.5" className="input-glass mt-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: 15.5" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500">Commentaire pour le pilote</label>
                      <textarea className="input-glass mt-1 h-24 resize-none" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Feedback détaillé : points forts, axes d'amélioration..." />
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition-all text-sm" disabled={saving} onClick={() => handleSave("valide")}>
                        <CheckCircle2 className="w-4 h-4" /> Valider
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm" disabled={saving} onClick={() => handleSave("rejete")}>
                        <XCircle className="w-4 h-4" /> Rejeter
                      </button>
                    </div>
                  </div>
                )}

                {selected.statut !== "soumis" && (
                  <div className={cn("p-3 rounded-lg border", selected.statut === "valide" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20")}>
                    <p className={cn("text-xs font-semibold mb-1", selected.statut === "valide" ? "text-emerald-400" : "text-red-400")}>
                      {selected.statut === "valide" ? "✓ Validé" : "✗ Rejeté"} {selected.date_correction ? `le ${selected.date_correction}` : ""}
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