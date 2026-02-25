import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Users, Search, Heart, TrendingDown, TrendingUp, Minus } from "lucide-react";
import AssiduitéMatrix from "@/components/fi/AssiduitéMatrix";
import ChuteLivreAlert, { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";
import { cn } from "@/lib/utils";

const STATUT_COLORS = {
  passif: "bg-zinc-100 text-zinc-600",
  regulier: "bg-blue-100 text-blue-700",
  disciple: "bg-violet-100 text-violet-700",
  reproducteur: "bg-amber-100 text-amber-700",
};

export default function FIDossiersPage() {
  const [selectedFI, setSelectedFI] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedMembre, setSelectedMembre] = useState(null);

  const { data: familles = [] } = useQuery({
    queryKey: ["familles"],
    queryFn: () => base44.entities.FamilleImpact.list(),
    onSuccess: (data) => { if (data.length > 0 && !selectedFI) setSelectedFI(data[0].id); }
  });

  const { data: membres = [] } = useQuery({
    queryKey: ["membres", selectedFI],
    queryFn: () => selectedFI ? base44.entities.Membre.filter({ famille_impact_id: selectedFI }) : Promise.resolve([]),
    enabled: !!selectedFI,
  });

  const { data: allSaisies = [] } = useQuery({
    queryKey: ["all-saisies-fi", selectedFI],
    queryFn: () => selectedFI ? base44.entities.CliniqueSaisie.filter({ famille_impact_id: selectedFI }) : Promise.resolve([]),
    enabled: !!selectedFI,
  });

  const filtered = membres.filter((m) =>
    m.nom_complet?.toLowerCase().includes(search.toLowerCase())
  );

  const getLastAvg = (membreId) => {
    const s = allSaisies.filter((s) => s.membre_id === membreId && s.presence).sort((a, b) => new Date(b.semaine) - new Date(a.semaine))[0];
    if (!s) return null;
    const notes = [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter((n) => n !== null && n !== undefined);
    return notes.length > 0 ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : null;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Dossiers Âmes</h1>
          <p className="text-sm text-zinc-500 mt-0.5">CRM individuel · Matrice d'assiduité · Alertes pastorales</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Select value={selectedFI || ""} onValueChange={setSelectedFI}>
          <SelectTrigger className="w-64 bg-white border-zinc-200">
            <SelectValue placeholder="Sélectionner une FI" />
          </SelectTrigger>
          <SelectContent>
            {familles.map((fi) => (
              <SelectItem key={fi.id} value={fi.id}>{fi.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Rechercher un membre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-zinc-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((membre) => {
          const alerte = detectChuteLivre(membre.id, allSaisies);
          const avg = getLastAvg(membre.id);
          return (
            <Card
              key={membre.id}
              className={cn("border cursor-pointer hover:shadow-md transition-all", alerte ? "border-red-200 bg-red-50/30" : "border-zinc-200 bg-white")}
              onClick={() => setSelectedMembre(membre)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-600 flex-shrink-0">
                      {membre.nom_complet?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{membre.nom_complet}</p>
                      <p className="text-xs text-zinc-400">{membre.ville} · {membre.age} ans</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={cn("text-[10px] px-1.5", STATUT_COLORS[membre.statut_pipeline])}>
                      {membre.statut_pipeline}
                    </Badge>
                    {alerte && <ChuteLivreAlert />}
                  </div>
                </div>

                {/* Assiduité Matrix */}
                <div>
                  <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Assiduité · 13 semaines</p>
                  <AssiduitéMatrix membreId={membre.id} saisies={allSaisies} nbWeeks={13} />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                  <span className="text-[10px] text-zinc-400">Dernière santé</span>
                  {avg ? (
                    <span className={cn("text-sm font-bold", parseFloat(avg) >= 7 ? "text-emerald-600" : parseFloat(avg) >= 5 ? "text-amber-600" : "text-red-600")}>
                      {avg}/10
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-300">—</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-sm text-zinc-400">
            <Users className="w-8 h-8 mx-auto mb-2 text-zinc-200" />
            Aucun membre trouvé
          </div>
        )}
      </div>

      {/* Slide-over Dossier */}
      <Sheet open={!!selectedMembre} onOpenChange={() => setSelectedMembre(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedMembre && (
            <>
              <SheetHeader className="pb-4 border-b border-zinc-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-white text-lg font-bold">
                    {selectedMembre.nom_complet?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <SheetTitle className="text-lg font-bold">{selectedMembre.nom_complet}</SheetTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={cn("text-[10px]", STATUT_COLORS[selectedMembre.statut_pipeline])}>
                        {selectedMembre.statut_pipeline}
                      </Badge>
                      {detectChuteLivre(selectedMembre.id, allSaisies) && <ChuteLivreAlert />}
                    </div>
                  </div>
                </div>
              </SheetHeader>
              <div className="py-5 space-y-5">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Ville</p>
                    <p className="font-medium mt-0.5">{selectedMembre.ville || "—"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Âge</p>
                    <p className="font-medium mt-0.5">{selectedMembre.age || "—"} ans</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Tél</p>
                    <p className="font-medium mt-0.5 text-xs">{selectedMembre.telephone || "—"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Formation</p>
                    <p className={cn("font-medium mt-0.5 text-xs", selectedMembre.potentiel_formation ? "text-violet-600" : "text-zinc-400")}>
                      {selectedMembre.potentiel_formation ? "✦ Identifié" : "Non sélectionné"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-zinc-700 mb-2">Matrice d'assiduité · 13 semaines</p>
                  <AssiduitéMatrix membreId={selectedMembre.id} saisies={allSaisies} nbWeeks={13} />
                  <div className="flex gap-4 mt-2">
                    {[["bg-emerald-500", "Présent (8-10)"], ["bg-amber-400", "Présent (5-7)"], ["bg-red-500", "Présent (<5)"], ["bg-red-200", "Absent"], ["bg-zinc-100", "Non saisi"]].map(([c, l]) => (
                      <div key={l} className="flex items-center gap-1">
                        <div className={`w-2.5 h-2.5 rounded-sm ${c}`} />
                        <span className="text-[10px] text-zinc-400">{l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-zinc-700 mb-2">Historique des saisies</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allSaisies
                      .filter((s) => s.membre_id === selectedMembre.id)
                      .sort((a, b) => new Date(b.semaine) - new Date(a.semaine))
                      .slice(0, 10)
                      .map((s) => {
                        const notes = [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter((n) => n !== null && n !== undefined);
                        const avg = notes.length > 0 ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : null;
                        return (
                          <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 bg-zinc-50/50 text-sm">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", s.presence ? "bg-emerald-500" : "bg-red-400")} />
                              <span className="text-xs text-zinc-600">{s.semaine}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                              <span>⏰{s.note_temps ?? "—"}</span>
                              <span>💰{s.note_finances ?? "—"}</span>
                              <span>💭{s.note_emotions ?? "—"}</span>
                              <span>🙏{s.note_spirituel ?? "—"}</span>
                              {avg && <span className={cn("font-bold", parseFloat(avg) >= 7 ? "text-emerald-600" : parseFloat(avg) >= 5 ? "text-amber-600" : "text-red-600")}>{avg}</span>}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}