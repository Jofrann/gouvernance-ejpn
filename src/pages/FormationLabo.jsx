import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Upload, CheckCircle2, XCircle, Clock, AlertTriangle, History, FileText, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CURRENT_MONTH = format(new Date(), "yyyy-MM");
const STATUT_CONFIG = {
  soumis: { label: "Soumis", class: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  en_attente: { label: "En attente", class: "bg-zinc-50 text-zinc-600 border-zinc-200", icon: Clock },
  valide: { label: "Validé ✓", class: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  rejete: { label: "Rejeté", class: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
};

export default function FormationLaboPage() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [titreInput, setTitreInput] = useState("");
  const [selectedLivrable, setSelectedLivrable] = useState(null);
  const [resubmitting, setResubmitting] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

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
      pilote_email: user.email,
      pilote_nom: user.full_name,
      mois_cycle: CURRENT_MONTH,
      file_url,
      titre_livrable: titreInput,
      statut: "soumis",
      date_soumission: format(new Date(), "yyyy-MM-dd"),
      version: 1,
    });
    queryClient.invalidateQueries({ queryKey: ["livrables", user?.email] });
    queryClient.invalidateQueries({ queryKey: ["all-livrables"] });
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
    await base44.entities.FormationLivrable.update(livrable.id, {
      file_url,
      statut: "soumis",
      version: newVersion,
      historique_versions: hist,
      date_soumission: format(new Date(), "yyyy-MM-dd"),
      commentaire_responsable: "",
    });
    queryClient.invalidateQueries();
    toast.success(`V${newVersion} soumise !`);
    setResubmitting(false);
    setSelectedLivrable(null);
  };

  const handleCorrect = async (livrable, statut, note, commentaire) => {
    await base44.entities.FormationLivrable.update(livrable.id, {
      statut,
      note: parseFloat(note) || undefined,
      commentaire_responsable: commentaire,
      date_correction: format(new Date(), "yyyy-MM-dd"),
    });
    queryClient.invalidateQueries({ queryKey: ["all-livrables"] });
    toast.success(`Livrable ${statut === "valide" ? "validé" : "rejeté"}`);
    setSelectedLivrable(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Laboratoire</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Portfolio du Conquérant · Livrables mensuels</p>
      </div>

      {/* Upload zone (pilotes only) */}
      {!isResponsable && !hasSubmittedThisMonth && (
        <Card className="border-2 border-dashed border-zinc-300 bg-zinc-50/50">
          <CardContent className="p-6 space-y-3">
            <p className="text-sm font-semibold text-zinc-700">Soumettre le livrable de {format(new Date(), "MMMM yyyy", { locale: fr })}</p>
            <Input
              placeholder="Titre du livrable (ex: Plan d'action FI Septembre)"
              value={titreInput}
              onChange={(e) => setTitreInput(e.target.value)}
              className="bg-white border-zinc-200"
            />
            <label className={cn("flex items-center justify-center gap-2 p-3 rounded-lg border border-zinc-300 bg-white cursor-pointer hover:bg-zinc-50 transition text-sm", !titreInput.trim() && "opacity-50 pointer-events-none")}>
              <Upload className="w-4 h-4 text-zinc-500" />
              <span className="text-zinc-600">{uploading ? "Upload en cours..." : "Sélectionner un fichier"}</span>
              <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={handleUpload} disabled={uploading} />
            </label>
          </CardContent>
        </Card>
      )}

      {/* This month */}
      {currentMonth.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-3">
            {format(new Date(), "MMMM yyyy", { locale: fr })} — En cours
          </h2>
          <div className="space-y-2">
            {currentMonth.map((l) => {
              const cfg = STATUT_CONFIG[l.statut] || STATUT_CONFIG.soumis;
              const Icon = cfg.icon;
              return (
                <Card key={l.id} className={cn("border cursor-pointer hover:shadow-sm transition-all", l.statut === "rejete" ? "border-red-200 bg-red-50/20" : l.statut === "valide" ? "border-emerald-200 bg-emerald-50/20" : "border-zinc-200 bg-white")}
                  onClick={() => setSelectedLivrable(l)}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-zinc-400" />
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{l.titre_livrable}</p>
                        <p className="text-xs text-zinc-400">{isResponsable ? `${l.pilote_nom || l.pilote_email} · ` : ""}V{l.version || 1} · soumis le {l.date_soumission}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {l.note !== undefined && l.note !== null && (
                        <Badge variant="outline" className="text-xs font-bold">{l.note}/20</Badge>
                      )}
                      <Badge className={cn("text-[10px] gap-1 border", cfg.class)}>
                        <Icon className="w-3 h-3" />{cfg.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Portfolio - past months */}
      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-3">Portfolio · Historique</h2>
          <div className="space-y-2">
            {past.map((l) => {
              const cfg = STATUT_CONFIG[l.statut] || STATUT_CONFIG.soumis;
              return (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-100 bg-zinc-50/50 cursor-pointer hover:bg-zinc-50" onClick={() => setSelectedLivrable(l)}>
                  <FileText className="w-4 h-4 text-zinc-300" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-700 font-medium truncate">{l.titre_livrable}</p>
                    <p className="text-[10px] text-zinc-400">{l.mois_cycle} {isResponsable ? `· ${l.pilote_nom || l.pilote_email}` : ""}</p>
                  </div>
                  <Badge className={cn("text-[10px] border", cfg.class)}>{cfg.label}</Badge>
                  {l.note !== undefined && l.note !== null && <span className="text-xs font-bold text-zinc-600">{l.note}/20</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Slide-over Livrable Detail */}
      <Sheet open={!!selectedLivrable} onOpenChange={() => setSelectedLivrable(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
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
      <SheetHeader className="pb-4 border-b border-zinc-200">
        <SheetTitle>{livrable.titre_livrable}</SheetTitle>
        <p className="text-xs text-zinc-400">{livrable.mois_cycle} · V{livrable.version || 1} · {livrable.pilote_nom || livrable.pilote_email}</p>
      </SheetHeader>
      <div className="py-5 space-y-5">
        <Button variant="outline" className="w-full gap-2" onClick={() => window.open(livrable.file_url, "_blank")}>
          <FileText className="w-4 h-4" /> Ouvrir le fichier V{livrable.version || 1}
        </Button>

        {/* Version history */}
        {(livrable.historique_versions || []).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Historique versions</p>
            {livrable.historique_versions.map((v) => (
              <div key={v.version} className="flex items-center gap-2 p-2 rounded border border-zinc-100 bg-zinc-50 mb-1 text-xs">
                <span className="text-zinc-400">V{v.version}</span>
                <span className={cn("px-1.5 py-0.5 rounded text-[10px]", STATUT_CONFIG[v.statut]?.class || "bg-zinc-100 text-zinc-500")}>{v.statut}</span>
                {v.date && <span className="text-zinc-400">{v.date}</span>}
                {v.file_url && <button className="text-blue-500 ml-auto" onClick={() => window.open(v.file_url, "_blank")}>voir</button>}
              </div>
            ))}
          </div>
        )}

        {/* Commentaire responsable */}
        {livrable.commentaire_responsable && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs font-semibold text-amber-700 mb-1">Commentaire du Responsable</p>
            <p className="text-xs text-amber-800">{livrable.commentaire_responsable}</p>
          </div>
        )}

        {/* Resubmit for pilote if rejected */}
        {!isResponsable && livrable.statut === "rejete" && (
          <label className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-red-300 bg-red-50 cursor-pointer hover:bg-red-100/50 transition text-sm text-red-700">
            <RotateCcw className="w-4 h-4" />
            {resubmitting ? "Upload..." : "Soumettre une nouvelle version"}
            <input type="file" className="hidden" onChange={(e) => onResubmit(e, livrable)} />
          </label>
        )}

        {/* Correction form for responsable */}
        {isResponsable && livrable.statut === "soumis" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Corriger ce livrable</p>
            <Input placeholder="Note /20" type="number" min="0" max="20" value={note} onChange={(e) => setNote(e.target.value)} className="bg-white border-zinc-200" />
            <Textarea placeholder="Commentaire pour le pilote..." value={commentaire} onChange={(e) => setCommentaire(e.target.value)} className="bg-white border-zinc-200 h-20" />
            <div className="flex gap-2">
              <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => onCorrect(livrable, "valide", note, commentaire)}>
                <CheckCircle2 className="w-4 h-4" /> Valider
              </Button>
              <Button variant="outline" className="flex-1 gap-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => onCorrect(livrable, "rejete", note, commentaire)}>
                <XCircle className="w-4 h-4" /> Rejeter
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}