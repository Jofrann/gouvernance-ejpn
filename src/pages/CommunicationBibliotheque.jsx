import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Library, Search, ExternalLink, FileImage, Video, Tag, Download,
  Layers, FileText, File, Image, Eye, CheckCircle2, Clock, XCircle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const TYPE_CONFIG = {
  flyer:  { label: "Flyer",  icon: FileImage, color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
  video:  { label: "Vidéo",  icon: Video,     color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  photo:  { label: "Photo",  icon: Image,     color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  logo:   { label: "Logo",   icon: Layers,    color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  charte: { label: "Charte", icon: FileText,  color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
  autre:  { label: "Autre",  icon: File,      color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" },
};

const STATUT_CONFIG = {
  brouillon:  { label: "Brouillon",   color: "text-zinc-400 bg-zinc-700/40 border-zinc-600/30" },
  en_revision:{ label: "En révision", color: "text-amber-400 bg-amber-900/30 border-amber-600/30" },
  valide:     { label: "Validé",      color: "text-emerald-400 bg-emerald-900/30 border-emerald-600/30" },
  rejete:     { label: "Rejeté",      color: "text-red-400 bg-red-900/30 border-red-600/30" },
};

const TYPES = Object.keys(TYPE_CONFIG);

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.autre;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium", cfg.color)}>
      <Icon className="w-2.5 h-2.5" />{cfg.label}
    </span>
  );
}

function StatutBadge({ statut }) {
  const cfg = STATUT_CONFIG[statut] || STATUT_CONFIG.brouillon;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-medium", cfg.color)}>
      {cfg.label}
    </span>
  );
}

function AssetCard({ a }) {
  const showPreview = (a.type_asset === "photo" || a.type_asset === "flyer" || a.type_asset === "logo") && a.file_url;
  const TypeIcon = (TYPE_CONFIG[a.type_asset] || TYPE_CONFIG.autre).icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group ai-card rounded-xl overflow-hidden card-hover"
    >
      {/* Preview / Placeholder */}
      <div className="relative aspect-video bg-black/40 overflow-hidden">
        {showPreview ? (
          <img
            src={a.file_url}
            alt={a.titre}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon className="w-10 h-10 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Hover actions */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {a.file_url && (
            <>
              <button
                onClick={() => window.open(a.file_url, "_blank")}
                className="p-2 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white transition-all"
              >
                <Eye className="w-4 h-4" />
              </button>
              <a
                href={a.file_url}
                download
                className="p-2 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white transition-all"
              >
                <Download className="w-4 h-4" />
              </a>
            </>
          )}
        </div>

        {/* Version badge */}
        <div className="absolute bottom-2 left-2">
          <span className="text-[10px] text-white/70 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
            V{a.version || 1}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <StatutBadge statut={a.statut} />
        </div>
      </div>

      <div className="p-3">
        <p className="text-sm font-semibold text-white truncate mb-1.5">{a.titre}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <TypeBadge type={a.type_asset} />
          {a.campagne_tag && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-600 border border-white/5 rounded-md px-1.5 py-0.5">
              <Tag className="w-2 h-2" />{a.campagne_tag}
            </span>
          )}
        </div>
        <p className="text-[10px] text-zinc-700 mt-2">
          {a.created_date ? format(new Date(a.created_date), "d MMM yyyy", { locale: fr }) : ""}
        </p>
      </div>
    </motion.div>
  );
}

export default function CommunicationBibliothequePage() {
  useTrackActivity("CommunicationBibliotheque");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");
  const [filterCampagne, setFilterCampagne] = useState("all");

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["com-assets-bib"],
    queryFn: () => base44.entities.CommunicationAsset.list("-created_date", 500),
    refetchInterval: 30000,
  });

  const campaigns = useMemo(() => [...new Set(assets.map(a => a.campagne_tag).filter(Boolean))], [assets]);

  const filtered = useMemo(() => assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !search || a.titre?.toLowerCase().includes(q) || a.campagne_tag?.toLowerCase().includes(q);
    const matchType = filterType === "all" || a.type_asset === filterType;
    const matchStatut = filterStatut === "all" || a.statut === filterStatut;
    const matchCampagne = filterCampagne === "all" || a.campagne_tag === filterCampagne;
    return matchSearch && matchType && matchStatut && matchCampagne;
  }), [assets, search, filterType, filterStatut, filterCampagne]);

  const stats = useMemo(() => ({
    total: assets.length,
    valides: assets.filter(a => a.statut === "valide").length,
    campagnes: new Set(assets.map(a => a.campagne_tag).filter(Boolean)).size,
    contacts: assets.reduce((s, a) => s + (a.contacts_generes || 0), 0),
  }), [assets]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-3 px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white">Bibliothèque d'Assets</h1>
          <p className="text-xs text-zinc-600">DAM · Logos · Chartes · Flyers · Vidéos</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 grid grid-cols-4 divide-x divide-white/5 border-b border-white/8 bg-[#060810]/60">
        {[
          { label: "Total assets", value: stats.total, color: "text-white" },
          { label: "Validés", value: stats.valides, color: "text-emerald-400" },
          { label: "Campagnes", value: stats.campagnes, color: "text-blue-400" },
          { label: "Contacts générés", value: stats.contacts, color: "text-violet-400" },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center justify-center py-3 px-4">
            <span className={cn("text-xl font-bold", s.color)}>{s.value}</span>
            <span className="text-[10px] text-zinc-600 mt-0.5">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-2 px-6 py-3 border-b border-white/5 bg-[#060810]/40">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un asset..."
            className="bg-transparent text-xs text-white outline-none placeholder:text-zinc-600 w-full"
          />
        </div>

        {[
          { value: filterStatut, onChange: setFilterStatut, options: [["all", "Tous statuts"], ["valide", "Validés"], ["brouillon", "Brouillons"], ["en_revision", "En révision"], ["rejete", "Rejetés"]] },
          { value: filterType, onChange: setFilterType, options: [["all", "Tous types"], ...TYPES.map(t => [t, TYPE_CONFIG[t].label])] },
          { value: filterCampagne, onChange: setFilterCampagne, options: [["all", "Toutes campagnes"], ...campaigns.map(c => [c, c])] },
        ].map((sel, i) => (
          <select key={i} value={sel.value} onChange={e => sel.onChange(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none"
          >
            {sel.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}

        <span className="text-xs text-zinc-600 ml-auto">{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-t-2 border-blue-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Library className="w-10 h-10 text-zinc-700" />
            <p className="text-sm text-zinc-600">Aucun asset trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filtered.map(a => <AssetCard key={a.id} a={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}