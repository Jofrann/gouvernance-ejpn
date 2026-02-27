import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Upload, CheckCircle2, XCircle, Clock, FileText, RotateCcw, History, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const CURRENT_MONTH = format(new Date(), "yyyy-MM");

const STATUT_CONFIG = {
  soumis:     { label: "Soumis",      cls: "text-blue-400 bg-blue-500/10 border-blue-500/20",    icon: Clock },
  en_attente: { label: "En attente",  cls: "text-zinc-400 bg-zinc-800 border-zinc-700",           icon: Clock },
  valide:     { label: "Validé ✓",    cls: "text-emerald-400 bg-emerald-900/30 border-emerald-500/20", icon: CheckCircle2 },
  rejete:     { label: "Rejeté",      cls: "text-red-400 bg-red-900/30 border-red-500/20",        icon: XCircle },
};

function LivrableDetail({ livrable, isResponsable, onCorrect, onResubmit, resubmitting }) {
  const [note, setNote] = useState(livrable.note?.toString() || "");
  const [commentaire, setCommentaire] = useState(livrable.commentaire_responsable || "");

  return (
    <>
      <SheetHeader className="pb-4 border-b border-white/10">
        <SheetTitle className="text-white">{livrable.titre_livrable}</SheetTitle>
        <p className="text-xs text-zinc-500">{livrable.mois_cycle} · V{livrable.version || 1} · {livrable.pilote_nom || livrable.pilote_email}</p>
      </SheetHeader>
      <div className="py-5 space-y-4">
        <button onClick={() => window.open(livrable.file_url, "_blank")}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-300 hover:bg-white/10 transition-colors">
          <FileText className="w-4 h-4" /> Ouvrir V{livrable.version || 1}
        </button>

        {(livrable.historique_versions || []).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-600 uppercase mb-2 flex items-center gap-1.5"><History className="w-3 h-3" /> Historique</p>
            {livrable.historique_versions.map(v => (
              <div key={v.version} className="flex items-center gap-2 p-2.5 rounded-xl border border-white/5 bg-white/3 mb-1.5 text-xs">
                <span className="text-zinc-600">V{v.version}</span>
                <span className={cn("px-1.5 py-0.5 rounded-md border text-[10px]", STATUT_CONFIG[v.statut]?.cls || "bg-zinc-800 text-zinc-500")}>{v.statut}</span>
                {v.date && <span className="text-zinc-700">{v.date}</span>}
                {v.file_url && <button className="text-blue-400 hover:text-blue-300 ml-auto" onClick={() => window.open(v.file_url, "_blank")}><ExternalLink className="w-3 h-3" /></button>}
              </div>
            ))}
          </div>
        )}

        {livrable.commentaire_responsable && (
          <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-900/20">
            <p className="text-xs font-semibold text-amber-400 mb-1">Commentaire du Responsable</p>
            <p className="text-xs text-amber-300/80">{livrable.commentaire_responsable}</p>
          </div>
        )}

        {!isResponsable && livrable.statut === "rejete" && (
          <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-red-500/30 hover:border-red-500/50 bg-red-900/10 cursor-pointer transition-all">
            <RotateCcw className="w-5 h-5 text-red-400" />
            <p className="text-sm font-medium text-red-400">{resubmitting ? "Upload..." : `Soumettre V${(livrable.version || 1) + 1}`}</p>
            <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={e => onResubmit(e, livrable)} />
          </label>
        )}

        {isResponsable && livrable.statut === "soumis" && (
          <div className="space-y-3 pt-2 border-t border-white/5">
            <p className="text-xs font-semibold text-zinc-500 uppercase">Correction</p>
            <input type="number" min="0" max="20" placeholder="Note /20" value={note} onChange={e => setNote(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 transition-colors" />
            <textarea placeholder="Commentaire pour le pilote..." value={commentaire} onChange={e => setCommentaire(e.target.value)} rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 resize-none transition-colors" />
            <div className="flex gap-2">
              <button onClick={() => onCorrect(livrable, "valide", note, commentaire)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white transition-all">
                <CheckCircle2 className="w-4 h-4" /> Valider
              </button>
              <button onClick={() => onCorrect(livrable, "rejete", note, commentaire)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 text-sm font-semibold text-red-400 transition-all">
                <XCircle className="w-4 h-4" /> Rejeter
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function FormationLaboPage() {
  useTrackActivity("FormationLabo");
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [titreInput, setTitreInput] = useState("");
  const [selectedLivrable, setSelectedLivrable] = useState(null);
  const [resubmitting, setResubmitting] = useState(false);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isResponsable = user?.role === "admin" || user?.role === "responsable_formation";

  const { data: myLivrables = [] } = useQuery({
    queryKey: ["livrables", user?.email],
    queryFn: () => user ? base44.entities.FormationLivrable.filter({ pilote_email: user.email }) : Promise.resolve([]),
    enabled: !!user && !isResponsable,
  });
  const { data: allLivrables = [] } = useQuery({
    queryKey: ["all-livrables"],
    queryFn: () => base44.entities.FormationLivrable.list("-created_date", 200),
    enabled: isResponsable,
  });

  const livrables = isResponsable ? allLivrables : myLivrables;
  const current = livrables.filter(l => l.mois_cycle === CURRENT_MONTH);
  const past = livrables.filter(l => l.mois_cycle !== CURRENT_MONTH);
  const hasSubmitted = !isResponsable && current.length > 0;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !titreInput.trim()) { toast.error("Titre requis"); return; }
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.FormationLivrable.create({ pilote_email: user.email, pilote_nom: user.full_name, mois_cycle: CURRENT_MONTH, file_url, titre_livrable: titreInput, statut: "soumis", date_soumission: format(new Date(), "yyyy-MM-dd"), version: 1 });
    qc.invalidateQueries();
    toast.success("Livrable soumis !");
    setTitreInput("");
    setUploading(false);
  };

  const handleResubmit = async (e, livrable) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResubmitting(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const newVersion = (livrable.version || 1) + 1;
    const hist = [...(livrable.historique_versions || []), { version: livrable.version || 1, file_url: livrable.file_url, statut: livrable.statut, date: livrable.date_soumission }];
    await base44.entities.FormationLivrable.update(livrable.id, { file_url, statut: "soumis", version: newVersion, historique_versions: hist, date_soumission: format(new Date(), "yyyy-MM-dd"), commentaire_responsable: "" });
    qc.invalidateQueries();
    toast.success(`V${newVersion} soumise !`);
    setResubmitting(false);
    setSelectedLivrable(null);
  };

  const handleCorrect = async (livrable, statut, note, commentaire) => {
    await base44.entities.FormationLivrable.update(livrable.id, { statut, note: parseFloat(note) || undefined, commentaire_responsable: commentaire, date_correction: format(new Date(), "yyyy-MM-dd") });
    qc.invalidateQueries({ queryKey: ["all-livrables"] });
    toast.success(`Livrable ${statut === "valide" ? "validé" : "rejeté"}`);
    setSelectedLivrable(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-bold text-white">Laboratoire</h1>
          <p className="text-xs text-zinc-600">Portfolio du Conquérant · Livrables mensuels</p>
        </div>
        {isResponsable && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">{livrables.filter(l => l.statut === "soumis").length} à corriger</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Upload zone */}
        {!isResponsable && !hasSubmitted && (
          <div className="ai-card rounded-xl border-2 border-dashed border-blue-500/20 p-6 space-y-4">
            <p className="text-sm font-semibold text-white">Soumettre le livrable — {format(new Date(), "MMMM yyyy", { locale: fr })}</p>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 transition-colors"
              placeholder="Titre du livrable (ex: Plan d'action FI Septembre)"
              value={titreInput} onChange={e => setTitreInput(e.target.value)}
            />
            <label className={cn("flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer",
              titreInput.trim() ? "border-blue-500/40 hover:border-blue-500/70 hover:bg-blue-500/5" : "border-white/10 opacity-50 pointer-events-none")}>
              <Upload className="w-5 h-5 text-zinc-500" />
              <p className="text-sm text-zinc-400">{uploading ? "Upload en cours..." : "Sélectionner un fichier"}</p>
              <p className="text-xs text-zinc-600">PDF, Word, PowerPoint</p>
              <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={handleUpload} disabled={uploading || !titreInput.trim()} />
            </label>
          </div>
        )}

        {/* Current month */}
        {current.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
              {format(new Date(), "MMMM yyyy", { locale: fr })} — En cours
            </h2>
            <div className="space-y-2">
              {current.map(l => {
                const cfg = STATUT_CONFIG[l.statut] || STATUT_CONFIG.soumis;
                const Icon = cfg.icon;
                return (
                  <div key={l.id} onClick={() => setSelectedLivrable(l)}
                    className={cn("ai-card flex items-center justify-between gap-3 p-4 rounded-xl border cursor-pointer hover:border-white/20 transition-all",
                      l.statut === "rejete" ? "border-red-500/20 bg-red-900/10" : l.statut === "valide" ? "border-emerald-500/20 bg-emerald-900/10" : "border-white/8")}>
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-white">{l.titre_livrable}</p>
                        <p className="text-xs text-zinc-600">{isResponsable ? `${l.pilote_nom || l.pilote_email} · ` : ""}V{l.version || 1} · {l.date_soumission}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {l.note != null && <span className="text-xs font-bold text-white border border-white/10 rounded-md px-2 py-0.5">{l.note}/20</span>}
                      <span className={cn("text-[10px] border px-2 py-0.5 rounded-md flex items-center gap-1", cfg.cls)}>
                        <Icon className="w-3 h-3" />{cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Portfolio */}
        {past.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-3">Portfolio · Historique</h2>
            <div className="space-y-2">
              {past.map(l => {
                const cfg = STATUT_CONFIG[l.statut] || STATUT_CONFIG.soumis;
                return (
                  <div key={l.id} onClick={() => setSelectedLivrable(l)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/2 hover:bg-white/4 cursor-pointer transition-colors">
                    <FileText className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-400 truncate">{l.titre_livrable}</p>
                      <p className="text-[10px] text-zinc-600">{l.mois_cycle}{isResponsable ? ` · ${l.pilote_nom || l.pilote_email}` : ""}</p>
                    </div>
                    <span className={cn("text-[10px] border px-2 py-0.5 rounded-md flex-shrink-0", cfg.cls)}>{cfg.label}</span>
                    {l.note != null && <span className="text-xs font-bold text-zinc-400">{l.note}/20</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Sheet open={!!selectedLivrable} onOpenChange={() => setSelectedLivrable(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-[#0d1018] border-l border-white/10 overflow-y-auto p-5">
          {selectedLivrable && <LivrableDetail livrable={selectedLivrable} isResponsable={isResponsable} onCorrect={handleCorrect} onResubmit={handleResubmit} resubmitting={resubmitting} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}