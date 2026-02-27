import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Library, Search, ExternalLink, FileImage, Video, Tag, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_ICONS = { flyer: FileImage, video: Video, photo: FileImage, logo: Tag, charte: Tag, autre: FileImage };
const TYPE_COLORS = { flyer: "bg-pink-50 text-pink-700 border-pink-200", video: "bg-blue-50 text-blue-700 border-blue-200", photo: "bg-violet-50 text-violet-700 border-violet-200", logo: "bg-orange-50 text-orange-700 border-orange-200", charte: "bg-teal-50 text-teal-700 border-teal-200", autre: "bg-zinc-50 text-zinc-600 border-zinc-200" };
const STATUT_COLORS = { brouillon: "bg-zinc-100 text-zinc-600", en_revision: "bg-amber-100 text-amber-700", valide: "bg-emerald-100 text-emerald-700", rejete: "bg-red-100 text-red-700" };

export default function CommunicationBibliothequePage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatut, setFilterStatut] = useState("valide");
  const [filterCampagne, setFilterCampagne] = useState("all");

  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.CommunicationAsset.list("-created_date", 500),
  });

  const campaigns = useMemo(() => ["all", ...new Set(assets.map((a) => a.campagne_tag).filter(Boolean))], [assets]);

  const filtered = useMemo(() => assets.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = !search || a.titre?.toLowerCase().includes(q) || a.campagne_tag?.toLowerCase().includes(q);
    const matchType = filterType === "all" || a.type_asset === filterType;
    const matchStatut = filterStatut === "all" || a.statut === filterStatut;
    const matchCampagne = filterCampagne === "all" || a.campagne_tag === filterCampagne;
    return matchSearch && matchType && matchStatut && matchCampagne;
  }), [assets, search, filterType, filterStatut, filterCampagne]);

  const stats = useMemo(() => ({
    total: assets.length,
    valides: assets.filter((a) => a.statut === "valide").length,
    types: [...new Set(assets.map((a) => a.type_asset))].length,
    campagnes: new Set(assets.map((a) => a.campagne_tag).filter(Boolean)).size,
  }), [assets]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Bibliothèque d'Assets</h1>
        <p className="text-sm text-zinc-500 mt-0.5">DAM · Logos · Chartes · Rushs · Flyers · Vidéos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[["Total assets", stats.total], ["Validés", stats.valides], ["Types", stats.types], ["Campagnes", stats.campagnes]].map(([l, v]) => (
          <div key={l} className="p-3 rounded-xl border border-zinc-200 bg-white text-center">
            <p className="text-2xl font-bold text-zinc-900">{v}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input className="pl-8 bg-white border-zinc-200 h-8 text-sm w-48" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="bg-white border-zinc-200 h-8 text-xs w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="valide">Validés</SelectItem>
            <SelectItem value="brouillon">Brouillons</SelectItem>
            <SelectItem value="en_revision">En révision</SelectItem>
            <SelectItem value="rejete">Rejetés</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="bg-white border-zinc-200 h-8 text-xs w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {["flyer", "video", "photo", "logo", "charte", "autre"].map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCampagne} onValueChange={setFilterCampagne}>
          <SelectTrigger className="bg-white border-zinc-200 h-8 text-xs w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {campaigns.map((c) => <SelectItem key={c} value={c}>{c === "all" ? "Toutes campagnes" : c}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-zinc-400 flex items-center">{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center"><Library className="w-10 h-10 mx-auto mb-2 text-zinc-200" /><p className="text-sm text-zinc-400">Aucun asset trouvé</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((a) => {
            const Icon = TYPE_ICONS[a.type_asset] || FileImage;
            return (
              <Card key={a.id} className="border-zinc-200 bg-white hover:shadow-md transition-all group">
                <CardContent className="p-4 space-y-3">
                  {/* Preview */}
                  <div className="aspect-video rounded-lg bg-zinc-100 flex items-center justify-center overflow-hidden relative">
                    {a.file_url && (a.type_asset === "photo" || a.type_asset === "flyer" || a.type_asset === "logo") ? (
                      <img src={a.file_url} alt={a.titre} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                    ) : (
                      <Icon className="w-10 h-10 text-zinc-300" />
                    )}
                    {a.file_url && (
                      <button onClick={() => window.open(a.file_url, "_blank")} className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ExternalLink className="w-5 h-5 text-white" />
                      </button>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 truncate">{a.titre}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge variant="outline" className={cn("text-[10px] border", TYPE_COLORS[a.type_asset])}>{a.type_asset}</Badge>
                      <Badge className={cn("text-[10px]", STATUT_COLORS[a.statut])}>{a.statut}</Badge>
                      <Badge variant="outline" className="text-[10px] text-zinc-400">V{a.version || 1}</Badge>
                    </div>
                    {a.campagne_tag && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Tag className="w-3 h-3 text-zinc-400" />
                        <span className="text-[10px] text-zinc-400 truncate">{a.campagne_tag}</span>
                      </div>
                    )}
                  </div>
                  {a.file_url && (
                    <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1" onClick={() => window.open(a.file_url, "_blank")}>
                      <ExternalLink className="w-3 h-3" /> Ouvrir
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}