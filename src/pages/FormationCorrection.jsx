import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CheckCircle2, XCircle, Clock, FileText, ExternalLink, History } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import AILivrableGrader from "@/components/ai/AILivrableGrader";

const STATUT_CONFIG = {
  soumis: { label: "À corriger", class: "bg-blue-50 text-blue-700 border-blue-200" },
  valide: { label: "Validé", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejete: { label: "Rejeté", class: "bg-red-50 text-red-700 border-red-200" },
  en_attente: { label: "En attente", class: "bg-zinc-50 text-zinc-500 border-zinc-200" },
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

  const openLivrable = (l) => {
    setSelected(l);
    setNote(l.note?.toString() || "");
    setCommentaire(l.commentaire_responsable || "");
  };

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

  const counts = { soumis: livrables.filter((l) => l.statut === "soumis").length, valide: livrables.filter((l) => l.statut === "valide").length, rejete: livrables.filter((l) => l.statut === "rejete").length };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Correction des Livrables</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Kanban de correction · Notes & Feedback</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[["soumis", `À corriger (${counts.soumis})`], ["valide", `Validés (${counts.valide})`], ["rejete", `Rejetés (${counts.rejete})`], ["all", "Tous"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatut(v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", filterStatut === v ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50")}>
            {l}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && <Card className="border-zinc-200 bg-white"><CardContent className="py-12 text-center text-sm text-zinc-400">Aucun livrable {filterStatut !== "all" ? `"${filterStatut}"` : ""}</CardContent></Card>}
        {filtered.map((l) => {
          const cfg = STATUT_CONFIG[l.statut] || STATUT_CONFIG.soumis;
          return (
            <Card key={l.id} className={cn("border cursor-pointer hover:shadow-sm transition-all", l.statut === "soumis" ? "border-blue-200 bg-blue-50/10" : "border-zinc-200 bg-white")} onClick={() => openLivrable(l)}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{l.titre_livrable}</p>
                    <p className="text-xs text-zinc-400">{l.pilote_nom || l.pilote_email} · {l.mois_cycle} · V{l.version || 1} · soumis {l.date_soumission}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {l.note != null && <Badge variant="outline" className="text-xs font-bold">{l.note}/20</Badge>}
                  <Badge className={cn("text-[10px] border", cfg.class)}>{cfg.label}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b">
                <SheetTitle>{selected.titre_livrable}</SheetTitle>
                <p className="text-xs text-zinc-400">{selected.pilote_nom || selected.pilote_email} · {selected.mois_cycle} · V{selected.version || 1}</p>
              </SheetHeader>
              <div className="py-5 space-y-5">
                <Button variant="outline" className="w-full gap-2" onClick={() => window.open(selected.file_url, "_blank")}>
                  <ExternalLink className="w-4 h-4" /> Ouvrir le livrable
                </Button>

                {(selected.historique_versions?.length > 0) && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Versions précédentes</p>
                    {selected.historique_versions.map((v) => (
                      <div key={v.version} className="flex items-center gap-2 p-2 rounded border border-zinc-100 bg-zinc-50 mb-1 text-xs">
                        <span className="text-zinc-400">V{v.version}</span>
                        <span className={cn("px-1.5 py-0.5 rounded", STATUT_CONFIG[v.statut]?.class || "bg-zinc-100 text-zinc-500")}>{v.statut}</span>
                        {v.file_url && <button className="text-blue-500 ml-auto" onClick={() => window.open(v.file_url, "_blank")}>voir</button>}
                      </div>
                    ))}
                  </div>
                )}

                {selected.statut === "soumis" && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Correction</p>
                    <div>
                      <label className="text-xs text-zinc-500">Note sur 20</label>
                      <Input type="number" min="0" max="20" step="0.5" className="mt-1 bg-white border-zinc-200" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: 15.5" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500">Commentaire pour le pilote</label>
                      <Textarea className="mt-1 bg-white border-zinc-200 h-24" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Feedback détaillé : points forts, axes d'amélioration..." />
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2" disabled={saving} onClick={() => handleSave("valide")}>
                        <CheckCircle2 className="w-4 h-4" /> Valider
                      </Button>
                      <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 gap-2" disabled={saving} onClick={() => handleSave("rejete")}>
                        <XCircle className="w-4 h-4" /> Rejeter
                      </Button>
                    </div>
                  </div>
                )}

                {selected.statut !== "soumis" && (
                  <div className={cn("p-3 rounded-lg border", selected.statut === "valide" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200")}>
                    <p className={cn("text-xs font-semibold mb-1", selected.statut === "valide" ? "text-emerald-700" : "text-red-700")}>
                      {selected.statut === "valide" ? "✓ Validé" : "✗ Rejeté"} {selected.date_correction ? `le ${selected.date_correction}` : ""}
                    </p>
                    {selected.note != null && <p className="text-sm font-bold text-zinc-900 mb-1">Note : {selected.note}/20</p>}
                    {selected.commentaire_responsable && <p className="text-xs text-zinc-700">{selected.commentaire_responsable}</p>}
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