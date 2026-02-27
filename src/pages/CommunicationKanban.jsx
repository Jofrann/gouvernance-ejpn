import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Upload, History, CheckCircle2, XCircle, ExternalLink, Tag,
  FileImage, Video, FileText, Image, File, Filter, Search,
  RotateCcw, Send, Trash2, Eye, Download, MoreHorizontal, Clock, Layers
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const COLUMNS = [
  { key: "brouillon",  label: "Brouillon",    icon: FileText,      color: "border-zinc-700", headerColor: "bg-zinc-800/60",   dotColor: "bg-zinc-500" },
  { key: "en_revision",label: "En révision",  icon: Clock,         color: "border-amber-500/40", headerColor: "bg-amber-900/20", dotColor: "bg-amber-400" },
  { key: "valide",     label: "Validé",       icon: CheckCircle2,  color: "border-emerald-500/40", headerColor: "bg-emerald-900/20", dotColor: "bg-emerald-400" },
  { key: "rejete",     label: "Rejeté",       icon: XCircle,       color: "border-red-500/40", headerColor: "bg-red-900/20", dotColor: "bg-red-400" },
];

const TYPES = ["flyer", "video", "photo", "logo", "charte", "autre"];
const TYPE_CONFIG = {
  flyer:  { label: "Flyer",  icon: FileImage, color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
  video:  { label: "Vidéo",  icon: Video,     color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  photo:  { label: "Photo",  icon: Image,     color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  logo:   { label: "Logo",   icon: Layers,    color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  charte: { label: "Charte", icon: FileText,  color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
  autre:  { label: "Autre",  icon: File,      color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" },
};

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.autre;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium", cfg.color)}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

function AssetCard({ asset, index, onClick }) {
  const isImage = asset.file_url && (asset.type_asset === "photo" || asset.type_asset === "flyer" || asset.type_asset === "logo");

  return (
    <Draggable draggableId={asset.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(asset)}
          className={cn(
            "group rounded-xl border bg-[#0f1520]/80 backdrop-blur-sm cursor-pointer transition-all duration-200",
            "border-white/8 hover:border-white/20 hover:bg-white/5",
            snapshot.isDragging && "rotate-1 shadow-2xl shadow-black/60 border-blue-500/40 scale-105"
          )}
        >
          {/* Image preview */}
          {isImage && asset.file_url && (
            <div className="w-full h-28 rounded-t-xl overflow-hidden bg-black/40 relative">
              <img
                src={asset.file_url}
                alt={asset.titre}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute top-2 right-2">
                <TypeBadge type={asset.type_asset} />
              </div>
            </div>
          )}

          <div className="p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-semibold text-white leading-tight line-clamp-2">{asset.titre}</p>
              {!isImage && <TypeBadge type={asset.type_asset} />}
            </div>

            {asset.campagne_tag && (
              <div className="flex items-center gap-1 mb-2">
                <Tag className="w-2.5 h-2.5 text-zinc-600" />
                <span className="text-[10px] text-zinc-500">{asset.campagne_tag}</span>
              </div>
            )}

            {asset.commentaire_responsable && asset.statut === "rejete" && (
              <div className="mb-2 px-2 py-1.5 rounded-lg bg-red-900/20 border border-red-500/20">
                <p className="text-[10px] text-red-400 line-clamp-2">{asset.commentaire_responsable}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-600">
                V{asset.version || 1}
                {asset.historique_versions?.length > 0 && (
                  <span className="ml-1.5 text-zinc-700">· {asset.historique_versions.length} hist.</span>
                )}
              </span>
              <span className="text-[10px] text-zinc-700">
                {asset.created_date ? format(new Date(asset.created_date), "d MMM", { locale: fr }) : ""}
              </span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

function Column({ col, assets, onCardClick }) {
  return (
    <div className={cn("flex flex-col min-h-[400px] rounded-xl border", col.color, "bg-[#090d16]/60 backdrop-blur-sm")}>
      {/* Header */}
      <div className={cn("flex items-center justify-between px-4 py-3 rounded-t-xl border-b border-white/5", col.headerColor)}>
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", col.dotColor)} />
          <span className="text-xs font-bold text-white uppercase tracking-wider">{col.label}</span>
        </div>
        <span className="text-xs font-semibold text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">{assets.length}</span>
      </div>

      <Droppable droppableId={col.key}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 p-3 space-y-2 transition-colors",
              snapshot.isDraggingOver && "bg-white/3"
            )}
          >
            {assets.map((asset, i) => (
              <AssetCard key={asset.id} asset={asset} index={i} onClick={onCardClick} />
            ))}
            {provided.placeholder}
            {assets.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-20 border border-dashed border-white/5 rounded-xl">
                <p className="text-xs text-zinc-700">Aucun asset</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function CommunicationKanbanPage() {
  useTrackActivity("CommunicationKanban");
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ titre: "", type_asset: "flyer", campagne_tag: "" });
  const [commentaire, setCommentaire] = useState("");
  const [filterCampagne, setFilterCampagne] = useState("");
  const [filterType, setFilterType] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [activeAssets, setActiveAssets] = useState([]);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isResponsable = user?.role === "admin" || user?.role === "responsable_communication";

  const { data: assets = [] } = useQuery({
    queryKey: ["com-assets"],
    queryFn: () => base44.entities.CommunicationAsset.list("-created_date", 200),
    refetchInterval: 15000,
  });

  // Sync local state
  useEffect(() => { setActiveAssets(assets); }, [assets]);

  // Real-time
  useEffect(() => {
    const unsub = base44.entities.CommunicationAsset.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["com-assets"] });
    });
    return unsub;
  }, []);

  const updateAsset = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CommunicationAsset.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["com-assets"] }),
  });

  const deleteAsset = useMutation({
    mutationFn: (id) => base44.entities.CommunicationAsset.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["com-assets"] }); setSelectedAsset(null); toast.success("Asset supprimé"); },
  });

  const campaigns = [...new Set(assets.map(a => a.campagne_tag).filter(Boolean))];

  // Filtered + sorted assets
  const displayed = activeAssets.filter(a => {
    if (filterCampagne && a.campagne_tag !== filterCampagne) return false;
    if (filterType && a.type_asset !== filterType) return false;
    if (searchQ && !a.titre?.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  // Drag end
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStatut = destination.droppableId;
    // Optimistic update
    setActiveAssets(prev => prev.map(a => a.id === draggableId ? { ...a, statut: newStatut } : a));
    await updateAsset.mutateAsync({ id: draggableId, data: { statut: newStatut } });
    toast.success(`Déplacé vers "${COLUMNS.find(c => c.key === newStatut)?.label}"`);
  };

  // Create
  const handleCreate = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !form.titre) { toast.error("Titre requis"); return; }
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.CommunicationAsset.create({
      ...form, file_url, statut: "brouillon", version: 1,
      historique_versions: [], createur_email: user?.email,
    });
    qc.invalidateQueries({ queryKey: ["com-assets"] });
    toast.success("Asset créé !");
    setUploading(false);
    setShowNew(false);
    setForm({ titre: "", type_asset: "flyer", campagne_tag: "" });
  };

  // Validate / reject
  const handleRevision = async (asset, statut) => {
    await updateAsset.mutateAsync({ id: asset.id, data: { statut, commentaire_responsable: commentaire } });
    toast.success(statut === "valide" ? "✓ Asset validé !" : "Correction demandée");
    setSelectedAsset(null);
    setCommentaire("");
  };

  // Soumettre pour validation
  const handleSubmitForReview = async (asset) => {
    await updateAsset.mutateAsync({ id: asset.id, data: { statut: "en_revision" } });
    toast.success("Soumis pour validation !");
    setSelectedAsset(null);
  };

  // Resubmit new version
  const handleResubmit = async (e, asset) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const newVersion = (asset.version || 1) + 1;
    const hist = [...(asset.historique_versions || []), {
      version: asset.version || 1, file_url: asset.file_url,
      statut: asset.statut, commentaire: asset.commentaire_responsable,
      date: format(new Date(), "yyyy-MM-dd"),
    }];
    await updateAsset.mutateAsync({
      id: asset.id, data: { file_url, version: newVersion, statut: "en_revision", historique_versions: hist, commentaire_responsable: "" }
    });
    toast.success(`V${newVersion} soumise pour révision`);
    setUploading(false);
    setSelectedAsset(null);
  };

  const selectedFull = selectedAsset ? (activeAssets.find(a => a.id === selectedAsset.id) || selectedAsset) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-3 px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white">Studio Communication</h1>
          <p className="text-xs text-zinc-600">Versioning · Validation · Pipeline d'assets</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-zinc-600" />
            <input
              value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Rechercher..."
              className="bg-transparent text-xs text-white outline-none placeholder:text-zinc-600 w-28"
            />
          </div>

          {campaigns.length > 0 && (
            <select
              value={filterCampagne} onChange={e => setFilterCampagne(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none"
            >
              <option value="">Toutes campagnes</option>
              {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          <select
            value={filterType} onChange={e => setFilterType(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none"
          >
            <option value="">Tous types</option>
            {TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
          </select>
        </div>

        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          Nouvel Asset
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex-shrink-0 flex items-center gap-6 px-6 py-2 border-b border-white/5 text-xs text-zinc-600">
        {COLUMNS.map(col => {
          const count = displayed.filter(a => a.statut === col.key).length;
          return (
            <div key={col.key} className="flex items-center gap-1.5">
              <div className={cn("w-1.5 h-1.5 rounded-full", col.dotColor)} />
              <span>{col.label}: <strong className="text-zinc-400">{count}</strong></span>
            </div>
          );
        })}
        <span className="ml-auto">Total: <strong className="text-zinc-400">{displayed.length}</strong></span>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-4 gap-4 h-full min-w-[900px]">
            {COLUMNS.map(col => (
              <Column
                key={col.key}
                col={col}
                assets={displayed.filter(a => a.statut === col.key)}
                onCardClick={(asset) => { setSelectedAsset(asset); setCommentaire(asset.commentaire_responsable || ""); }}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* === New Asset Sheet === */}
      <Sheet open={showNew} onOpenChange={setShowNew}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-[#0d1018] border-l border-white/10 overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-white/10">
            <SheetTitle className="text-white">Nouvel Asset</SheetTitle>
          </SheetHeader>
          <div className="py-5 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1">Titre *</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 transition-colors"
                placeholder="Ex: Flyer Sortie Mars 2026"
                value={form.titre}
                onChange={e => setForm({ ...form, titre: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1">Type</label>
              <select
                value={form.type_asset}
                onChange={e => setForm({ ...form, type_asset: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
              >
                {TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1">Tag Campagne</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 transition-colors"
                placeholder="Ex: Campagne Mars 2026"
                value={form.campagne_tag}
                onChange={e => setForm({ ...form, campagne_tag: e.target.value })}
                list="campaigns-list"
              />
              <datalist id="campaigns-list">{campaigns.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <label className={cn(
              "flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer",
              form.titre ? "border-blue-500/40 hover:border-blue-500/70 hover:bg-blue-500/5" : "border-white/10 opacity-50 pointer-events-none"
            )}>
              <Upload className="w-6 h-6 text-zinc-500" />
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-300">{uploading ? "Upload en cours..." : "Sélectionner un fichier"}</p>
                <p className="text-xs text-zinc-600 mt-1">Images, vidéos, PDF, etc.</p>
              </div>
              <input type="file" className="hidden" onChange={handleCreate} disabled={uploading || !form.titre} />
            </label>
          </div>
        </SheetContent>
      </Sheet>

      {/* === Asset Detail Sheet === */}
      <Sheet open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-[#0d1018] border-l border-white/10 overflow-y-auto p-0">
          {selectedFull && (
            <>
              {/* Preview */}
              {(selectedFull.type_asset === "photo" || selectedFull.type_asset === "flyer" || selectedFull.type_asset === "logo") && selectedFull.file_url && (
                <div className="w-full h-48 bg-black/60 relative overflow-hidden">
                  <img src={selectedFull.file_url} alt={selectedFull.titre} className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1018] to-transparent" />
                </div>
              )}

              <div className="p-6 border-b border-white/10">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="text-lg font-bold text-white">{selectedFull.titre}</h2>
                  {isResponsable && (
                    <button
                      onClick={() => deleteAsset.mutate(selectedFull.id)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <TypeBadge type={selectedFull.type_asset} />
                  <span className="text-[10px] border border-white/10 rounded-md px-2 py-0.5 text-zinc-500">V{selectedFull.version || 1}</span>
                  {selectedFull.campagne_tag && (
                    <span className="text-[10px] border border-white/10 rounded-md px-2 py-0.5 text-zinc-500 flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5" />{selectedFull.campagne_tag}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* View & Download */}
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(selectedFull.file_url, "_blank")}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-white/10 text-xs text-zinc-300 hover:bg-white/10 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Ouvrir V{selectedFull.version || 1}
                  </button>
                  <a
                    href={selectedFull.file_url}
                    download
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-white/10 text-xs text-zinc-300 hover:bg-white/10 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Télécharger
                  </a>
                </div>

                {/* Commentaire rejet */}
                {selectedFull.commentaire_responsable && (
                  <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-500/20">
                    <p className="text-xs font-semibold text-amber-400 mb-1">Commentaire du responsable</p>
                    <p className="text-xs text-amber-300/80">{selectedFull.commentaire_responsable}</p>
                  </div>
                )}

                {/* Version history */}
                {selectedFull.historique_versions?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase mb-2 flex items-center gap-1.5">
                      <History className="w-3 h-3" /> Historique des versions
                    </p>
                    <div className="space-y-1.5">
                      {[...selectedFull.historique_versions].reverse().map((v) => (
                        <div key={v.version} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/5 bg-white/3 text-xs">
                          <span className="text-zinc-500 font-medium">V{v.version}</span>
                          <span className={cn("px-1.5 py-0.5 rounded-md text-[10px] font-medium",
                            v.statut === "valide" ? "bg-emerald-900/40 text-emerald-400 border border-emerald-500/20" :
                            v.statut === "rejete" ? "bg-red-900/40 text-red-400 border border-red-500/20" :
                            "bg-zinc-800 text-zinc-500"
                          )}>{v.statut}</span>
                          {v.commentaire && <span className="text-zinc-600 truncate flex-1">{v.commentaire}</span>}
                          <span className="text-zinc-700 text-[10px]">{v.date}</span>
                          {v.file_url && (
                            <button onClick={() => window.open(v.file_url, "_blank")} className="text-blue-500 hover:text-blue-400 flex-shrink-0">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* === RESPONSABLE ACTIONS === */}
                {isResponsable && selectedFull.statut === "en_revision" && (
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Décision</p>
                    <textarea
                      placeholder="Commentaire (optionnel)..."
                      value={commentaire}
                      onChange={e => setCommentaire(e.target.value)}
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white transition-all"
                        onClick={() => handleRevision(selectedFull, "valide")}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Valider
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 text-sm font-semibold text-red-400 transition-all"
                        onClick={() => handleRevision(selectedFull, "rejete")}
                      >
                        <XCircle className="w-4 h-4" /> Rejeter
                      </button>
                    </div>
                  </div>
                )}

                {/* Changer statut manuellement (responsable) */}
                {isResponsable && selectedFull.statut !== "en_revision" && (
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-xs text-zinc-600 mb-2">Changer le statut</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {COLUMNS.filter(c => c.key !== selectedFull.statut).map(c => (
                        <button
                          key={c.key}
                          onClick={async () => {
                            await updateAsset.mutateAsync({ id: selectedFull.id, data: { statut: c.key } });
                            toast.success(`Déplacé vers "${c.label}"`);
                            setSelectedAsset(null);
                          }}
                          className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/8 hover:bg-white/10 text-xs text-zinc-400 transition-all"
                        >
                          <div className={cn("w-1.5 h-1.5 rounded-full", c.dotColor)} />
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* === CREATOR ACTIONS === */}
                {!isResponsable && selectedFull.statut === "brouillon" && (
                  <button
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-all"
                    onClick={() => handleSubmitForReview(selectedFull)}
                  >
                    <Send className="w-4 h-4" /> Soumettre pour validation
                  </button>
                )}

                {!isResponsable && selectedFull.statut === "rejete" && (
                  <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-red-500/30 hover:border-red-500/50 bg-red-900/10 cursor-pointer transition-all">
                    <RotateCcw className="w-5 h-5 text-red-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-red-400">{uploading ? "Upload..." : `Soumettre V${(selectedFull.version || 1) + 1}`}</p>
                      <p className="text-xs text-red-500/60 mt-0.5">Répondre aux corrections</p>
                    </div>
                    <input type="file" className="hidden" onChange={e => handleResubmit(e, selectedFull)} />
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