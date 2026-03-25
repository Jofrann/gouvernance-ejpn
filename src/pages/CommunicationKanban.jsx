import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Upload, History, CheckCircle2, XCircle, Clock, FileImage, Video, RotateCcw, ExternalLink, Tag } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

const COLUMNS = [
  { key: "brouillon", label: "Brouillon", border: "border-zinc-500/20", bg: "bg-zinc-500/5" },
  { key: "en_revision", label: "En révision", border: "border-amber-500/20", bg: "bg-amber-500/5" },
  { key: "valide", label: "Validé ✓", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
  { key: "rejete", label: "Rejeté", border: "border-red-500/20", bg: "bg-red-500/5" },
];

const TYPE_ICONS = { flyer: FileImage, video: Video, photo: FileImage, logo: Tag, charte: Tag, autre: FileImage };
const TYPE_COLORS = {
  flyer: "bg-pink-500/10 text-pink-400",
  video: "bg-blue-500/10 text-blue-400",
  photo: "bg-violet-500/10 text-violet-400",
  logo: "bg-orange-500/10 text-orange-400",
  charte: "bg-teal-500/10 text-teal-400",
  autre: "bg-zinc-500/10 text-zinc-400",
};

export default function CommunicationKanbanPage() {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ titre: "", type_asset: "flyer", campagne_tag: "" });
  const [commentaire, setCommentaire] = useState("");

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isResponsable = user?.role === "admin" || user?.role === "responsable_communication";

  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.CommunicationAsset.list("-created_date", 200),
  });

  useEffect(() => {
    const unsub = base44.entities.CommunicationAsset.subscribe(() =>
      queryClient.invalidateQueries({ queryKey: ["assets"] })
    );
    return unsub;
  }, [queryClient]);

  const handleCreate = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !form.titre) { toast.error("Titre requis"); return; }
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.CommunicationAsset.create({ ...form, file_url, statut: "brouillon", version: 1, historique_versions: [], createur_email: user?.email });
    queryClient.invalidateQueries({ queryKey: ["assets"] });
    toast.success("Asset créé !");
    setUploading(false); setShowNew(false);
    setForm({ titre: "", type_asset: "flyer", campagne_tag: "" });
  };

  const handleRevision = async (asset, statut) => {
    await base44.entities.CommunicationAsset.update(asset.id, { statut, commentaire_responsable: commentaire });
    queryClient.invalidateQueries({ queryKey: ["assets"] });
    toast.success(statut === "valide" ? "Asset validé !" : "Correction demandée");
    setSelectedAsset(null); setCommentaire("");
  };

  const handleResubmit = async (e, asset) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const newVersion = (asset.version || 1) + 1;
    const hist = [...(asset.historique_versions || []), { version: asset.version || 1, file_url: asset.file_url, statut: asset.statut, commentaire: asset.commentaire_responsable, date: format(new Date(), "yyyy-MM-dd") }];
    await base44.entities.CommunicationAsset.update(asset.id, { file_url, version: newVersion, statut: "en_revision", historique_versions: hist, commentaire_responsable: "" });
    queryClient.invalidateQueries({ queryKey: ["assets"] });
    toast.success(`V${newVersion} soumise pour révision`);
    setUploading(false); setSelectedAsset(null);
  };

  const campaigns = [...new Set(assets.map((a) => a.campagne_tag).filter(Boolean))];

  return (
    <div className="px-6 py-10 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-[0.25em] mb-1">Communication</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Kanban Studio</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Versioning · Validation · Bibliothèque d'assets</p>
        </div>
        <button className="btn-glow-blue flex items-center gap-2 px-4 py-2.5" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4" /> Nouvel Asset
        </button>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colAssets = assets.filter((a) => a.statut === col.key);
          return (
            <div key={col.key} className={cn("rounded-2xl border-2 p-3 min-h-64", col.border, col.bg)}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{col.label}</span>
                <Badge variant="outline" className="text-xs text-zinc-500 border-white/10">{colAssets.length}</Badge>
              </div>
              <div className="space-y-2">
                {colAssets.map((asset) => {
                  const Icon = TYPE_ICONS[asset.type_asset] || FileImage;
                  return (
                    <div key={asset.id}
                      className="rounded-xl border border-white/[0.07] bg-black/20 p-3 cursor-pointer hover:border-white/[0.14] transition-all"
                      onClick={() => { setSelectedAsset(asset); setCommentaire(asset.commentaire_responsable || ""); }}>
                      <div className="flex items-start justify-between gap-1.5 mb-2">
                        <p className="text-xs font-semibold text-zinc-200 leading-tight">{asset.titre}</p>
                        <div className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0", TYPE_COLORS[asset.type_asset])}>
                          <Icon className="w-3 h-3 inline" />
                        </div>
                      </div>
                      {asset.campagne_tag && <Badge variant="outline" className="text-[10px] px-1 gap-0.5 border-white/10 text-zinc-500"><Tag className="w-2.5 h-2.5" />{asset.campagne_tag}</Badge>}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-zinc-600">V{asset.version || 1}</span>
                        {(asset.historique_versions?.length > 0) && <History className="w-3 h-3 text-zinc-700" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Asset Sheet */}
      <Sheet open={showNew} onOpenChange={setShowNew}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-[#0d1018] border-white/10 text-white">
          <SheetHeader className="pb-4 border-b border-white/10"><SheetTitle className="text-white">Nouvel Asset</SheetTitle></SheetHeader>
          <div className="py-5 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 font-medium">Titre *</label>
              <input className="input-glass mt-1" placeholder="Ex: Flyer Sortie Mars 2026" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium">Type</label>
              <Select value={form.type_asset} onValueChange={(v) => setForm({ ...form, type_asset: v })}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["flyer", "video", "photo", "logo", "charte", "autre"].map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium">Tag Campagne</label>
              <input className="input-glass mt-1" placeholder="Ex: Campagne Vidéo Mars" value={form.campagne_tag} onChange={(e) => setForm({ ...form, campagne_tag: e.target.value })} list="campaigns-list" />
              <datalist id="campaigns-list">{campaigns.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <label className={cn("flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-white/10 cursor-pointer hover:bg-white/5 transition", !form.titre && "opacity-40 pointer-events-none")}>
              <Upload className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-400">{uploading ? "Upload..." : "Sélectionner le fichier"}</span>
              <input type="file" className="hidden" onChange={handleCreate} disabled={uploading || !form.titre} />
            </label>
          </div>
        </SheetContent>
      </Sheet>

      {/* Asset Detail Sheet */}
      <Sheet open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-[#0d1018] border-white/10 text-white">
          {selectedAsset && (
            <>
              <SheetHeader className="pb-4 border-b border-white/10">
                <SheetTitle className="text-white">{selectedAsset.titre}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={cn("text-[10px]", TYPE_COLORS[selectedAsset.type_asset])}>{selectedAsset.type_asset}</Badge>
                  <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-500">V{selectedAsset.version || 1}</Badge>
                  {selectedAsset.campagne_tag && <Badge variant="outline" className="text-[10px] gap-1 border-white/10 text-zinc-500"><Tag className="w-2.5 h-2.5" />{selectedAsset.campagne_tag}</Badge>}
                </div>
              </SheetHeader>
              <div className="py-5 space-y-4">
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 transition-all text-sm"
                  onClick={() => window.open(selectedAsset.file_url, "_blank")}>
                  <ExternalLink className="w-4 h-4" /> Voir V{selectedAsset.version || 1}
                </button>

                {(selectedAsset.historique_versions?.length > 0) && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Historique</p>
                    {selectedAsset.historique_versions.map((v) => (
                      <div key={v.version} className="flex items-center gap-2 p-2 rounded border border-white/[0.07] bg-white/[0.02] mb-1 text-xs">
                        <span className="text-zinc-500">V{v.version}</span>
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px]", v.statut === "valide" ? "bg-emerald-500/10 text-emerald-400" : v.statut === "rejete" ? "bg-red-500/10 text-red-400" : "bg-zinc-500/10 text-zinc-500")}>{v.statut}</span>
                        {v.commentaire && <span className="text-zinc-600 truncate">{v.commentaire}</span>}
                        {v.file_url && <button className="text-blue-400 ml-auto flex-shrink-0" onClick={() => window.open(v.file_url, "_blank")}>voir</button>}
                      </div>
                    ))}
                  </div>
                )}

                {selectedAsset.commentaire_responsable && (
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <p className="text-xs font-semibold text-amber-400 mb-1">Commentaire</p>
                    <p className="text-xs text-amber-200/70">{selectedAsset.commentaire_responsable}</p>
                  </div>
                )}

                {isResponsable && selectedAsset.statut === "en_revision" && (
                  <div className="space-y-3">
                    <input className="input-glass" placeholder="Commentaire de correction..." value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition-all text-sm" onClick={() => handleRevision(selectedAsset, "valide")}>
                        <CheckCircle2 className="w-4 h-4" /> Valider
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm" onClick={() => handleRevision(selectedAsset, "rejete")}>
                        <XCircle className="w-4 h-4" /> Rejeter
                      </button>
                    </div>
                  </div>
                )}

                {!isResponsable && selectedAsset.statut === "brouillon" && (
                  <button className="btn-glow-blue w-full py-2.5"
                    onClick={() => { base44.entities.CommunicationAsset.update(selectedAsset.id, { statut: "en_revision" }); queryClient.invalidateQueries({ queryKey: ["assets"] }); setSelectedAsset(null); toast.success("Soumis pour validation !"); }}>
                    Soumettre pour validation
                  </button>
                )}
                {!isResponsable && selectedAsset.statut === "rejete" && (
                  <label className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-red-500/30 bg-red-500/5 cursor-pointer hover:bg-red-500/10 text-sm text-red-400">
                    <RotateCcw className="w-4 h-4" />
                    {uploading ? "Upload..." : "Uploader la V2"}
                    <input type="file" className="hidden" onChange={(e) => handleResubmit(e, selectedAsset)} />
                  </label>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}