import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Upload, CheckCircle2, XCircle, Clock, AlertTriangle, History, FileText, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

const CURRENT_MONTH = format(new Date(), "yyyy-MM");
const STATUT_CONFIG = {
  soumis: { label: "Soumis", class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
  en_attente: { label: "En attente", class: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20", icon: Clock },
  valide: { label: "Validé ✓", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  rejete: { label: "Rejeté", class: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
};

export default function FormationLaboPage() {
  const queryClient = useQueryClient();
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
  const currentMonth = livrables.filter((l) => l.mois_cycle === CURRENT_MONTH);
  const past = livrables.filter((l) => l.mois_cycle !== CURRENT_MONTH);
  const hasSubmittedThisMonth = !isResponsable && currentMonth.length > 0;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !titreInput.trim()) { toast.error("Donnez un titre à votre livrable"); return; }
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.FormationLivrable.create({
      pilote_email: user.email, pilote_nom: user.full_name, mois_cycle: CURRENT_MONTH, file_url,
      titre_livrable: titreInput, statut: "soumis", date_soumission: format(new Date(), "yyyy-MM-dd"), version: 1,
    });
    queryClient.invalidateQueries({ queryKey: ["livrables", user?.email] });
    queryClient.invalidateQueries({ queryKey: ["all-livrables"] });
    toast.success("Livrable soumis !");
    setTitreInput(""); setUploading(false);
  };

  const handleResubmit = async (e, livrable) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResubmitting(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const newVersion = (livrable.version || 1) + 1;
    const hist = [...(livrable.historique_versions || []), { version: livrable.version || 1, file_url: livrable.file_url, statut: livrable.statut, date: livrable.date_soumission }];
    await base44.entities.FormationLivrable.update(livrable.id, { file_url, statut: "soumis", version: newVersion, historique_versions: hist, date_soumission: format(new Date(), "yyyy-MM-dd"), commentaire_responsable: "" });
    queryClient.invalidateQueries();
    toast.success(`V${newVersion} soumise !`);
    setResubmitting(false);
    setSelectedLivrable(null);
  };

  const handleCorrect = async (livrable, statut, note, commentaire) => {
    await base44.entities.FormationLivrable.update(livrable.id, { statut, note: parseFloat(note) || undefined, commentaire_responsable: commentaire, date_correction: format(new Date(), "yyyy-MM-dd") });
    queryClient.invalidateQueries({ queryKey: ["all-livrables"] });
    toast.success(`Livrable ${statut === "valide" ? "validé" : "rejeté"}`);
    setSelectedLivrable(null);
  };

  return (
    <div className="px-6 py-10 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-bold text-violet-400/80 uppercase tracking-[0.25em] mb-1">Formation</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Laboratoire</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Portfolio du Conquérant · Livrables mensuels</p>
      </motion.div>

      {/* Upload zone */}
      {!isResponsable && !hasSubmittedThisMonth && (
        <div className="rounded-2xl border-2 border-dashed border-white/[0.1] bg-white/[0.02] p-6 space-y-3">
          <p className="text-sm font-semibold text-zinc-300">Soumettre le livrable de {format(new Date(), "MMMM yyyy", { locale: fr })}</p>
          <input className="input-glass" placeholder="Titre du livrable (ex: Plan d'action FI Septembre)" value={titreInput} onChange={(e) => setTitreInput(e.target.value)} />
          <label className={cn("flex items-center justify-center gap-2 p-3 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition text-sm", !titreInput.trim() && "opacity-40 pointer-events-none")}>
            <Upload className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-400">{uploading ? "Upload en cours..." : "Sélectionner un fichier"}</span>
            <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      )}

      {/* This month */}
      {currentMonth.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
            {format(new Date(), "MMMM yyyy", { locale: fr })} — En cours
          </h2>
          <div className="space-y-2">
            {currentMonth.map((l) => {
              const cfg = STATUT_CONFIG[l.statut] || STATUT_CONFIG.soumis;
              const Icon = cfg.icon;
              return (
                <div key={l.id}
                  className={cn("rounded-xl border cursor-pointer hover:border-white/[0.14] transition-all p-4 flex items-center justify-between gap-3",
                    l.statut === "rejete" ? "border-red-500/20 bg-red-500/5" : l.statut === "valide" ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/[0.07] bg-white/[0.025]")}
                  onClick={() => setSelectedLivrable(l)}>
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-zinc-500" />
                    <div>
                      <p className="text-sm font-medium text-white">{l.titre_livrable}</p>
                      <p className="text-xs text-zinc-500">{isResponsable ? `${l.pilote_nom || l.pilote_email} · ` : ""}V{l.version || 1} · soumis le {l.date_soumission}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.note !== undefined && l.note !== null && <Badge variant="outline" className="text-xs font-bold border-white/10 text-zinc-400">{l.note}/20</Badge>}
                    <Badge className={cn("text-[10px] gap-1 border", cfg.class)}><Icon className="w-3 h-3" />{cfg.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Portfolio - past months */}
      {past.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Portfolio · Historique</h2>
          <div className="space-y-2">
            {past.map((l) => {
              const cfg = STATUT_CONFIG[l.statut] || STATUT_CONFIG.soumis;
              return (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.02] transition-all cursor-pointer" onClick={() => setSelectedLivrable(l)}>
                  <FileText className="w-4 h-4 text-zinc-700" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 font-medium truncate">{l.titre_livrable}</p>
                    <p className="text-[10px] text-zinc-600">{l.mois_cycle} {isResponsable ? `· ${l.pilote_nom || l.pilote_email}` : ""}</p>
                  </div>
                  <Badge className={cn("text-[10px] border", cfg.class)}>{cfg.label}</Badge>
                  {l.note !== undefined && l.note !== null && <span className="text-xs font-bold text-zinc-500">{l.note}/20</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Sheet open={!!selectedLivrable} onOpenChange={() => setSelectedLivrable(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-[#0d1018] border-white/10 text-white">
          {selectedLivrable && <LivrableDetail livrable={selectedLivrable} isResponsable={isResponsable} onCorrect={handleCorrect} onResubmit={handleResubmit} resubmitting={resubmitting} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LivrableDetail({ livrable, isResponsable, onCorrect, onResubmit, resubmitting }) {
  const [note, setNote] = useState(livrable.note?.toString() || "");
  const [commentaire, setCommentaire] = useState(livrable.commentaire_responsable || "");

  return (
    <>
      <SheetHeader className="pb-4 border-b border-white/10">
        <SheetTitle className="text-white">{livrable.titre_livrable}</SheetTitle>
        <p className="text-xs text-zinc-500">{livrable.mois_cycle} · V{livrable.version || 1} · {livrable.pilote_nom || livrable.pilote_email}</p>
      </SheetHeader>
      <div className="py-5 space-y-5">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 transition-all text-sm"
          onClick={() => window.open(livrable.file_url, "_blank")}>
          <FileText className="w-4 h-4" /> Ouvrir le fichier V{livrable.version || 1}
        </button>

        {(livrable.historique_versions || []).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Historique versions</p>
            {livrable.historique_versions.map((v) => (
              <div key={v.version} className="flex items-center gap-2 p-2 rounded border border-white/[0.07] bg-white/[0.02] mb-1 text-xs">
                <span className="text-zinc-500">V{v.version}</span>
                <span className={cn("px-1.5 py-0.5 rounded text-[10px]", STATUT_CONFIG[v.statut]?.class || "bg-zinc-500/10 text-zinc-500")}>{v.statut}</span>
                {v.date && <span className="text-zinc-600">{v.date}</span>}
                {v.file_url && <button className="text-blue-400 ml-auto" onClick={() => window.open(v.file_url, "_blank")}>voir</button>}
              </div>
            ))}
          </div>
        )}

        {livrable.commentaire_responsable && (
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <p className="text-xs font-semibold text-amber-400 mb-1">Commentaire du Responsable</p>
            <p className="text-xs text-amber-200/70">{livrable.commentaire_responsable}</p>
          </div>
        )}

        {!isResponsable && livrable.statut === "rejete" && (
          <label className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-red-500/30 bg-red-500/5 cursor-pointer hover:bg-red-500/10 transition text-sm text-red-400">
            <RotateCcw className="w-4 h-4" />
            {resubmitting ? "Upload..." : "Soumettre une nouvelle version"}
            <input type="file" className="hidden" onChange={(e) => onResubmit(e, livrable)} />
          </label>
        )}

        {isResponsable && livrable.statut === "soumis" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Corriger ce livrable</p>
            <input placeholder="Note /20" type="number" min="0" max="20" value={note} onChange={(e) => setNote(e.target.value)} className="input-glass" />
            <textarea placeholder="Commentaire pour le pilote..." value={commentaire} onChange={(e) => setCommentaire(e.target.value)} className="input-glass h-20 resize-none" />
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition-all text-sm" onClick={() => onCorrect(livrable, "valide", note, commentaire)}>
                <CheckCircle2 className="w-4 h-4" /> Valider
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm" onClick={() => onCorrect(livrable, "rejete", note, commentaire)}>
                <XCircle className="w-4 h-4" /> Rejeter
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}