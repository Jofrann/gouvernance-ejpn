import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Search, Plus, Pencil, Trash2 } from "lucide-react";
import AssiduitéMatrix from "@/components/fi/AssiduitéMatrix";
import ChuteLivreAlert, { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";
import { cn } from "@/lib/utils";
import AIFIAssignment from "@/components/ai/AIFIAssignment";
import InteractionsPastorales from "@/components/fi/InteractionsPastorales";
import { motion } from "framer-motion";

const STATUT_OPTIONS = ["passif", "regulier", "disciple", "reproducteur"];
const GENRE_OPTIONS = ["homme", "femme"];

const EMPTY_FORM = {
  nom_complet: "",
  telephone: "",
  email: "",
  ville: "",
  age: "",
  genre: "",
  statut_pipeline: "passif",
  potentiel_formation: false,
  notes: "",
};

const STATUT_COLORS = {
  passif:       "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  regulier:     "bg-blue-500/20 text-blue-400 border-blue-500/30",
  disciple:     "bg-violet-500/20 text-violet-400 border-violet-500/30",
  reproducteur: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const CAN_MANAGE_ROLES = ["admin", "responsable_fi", "pilote_fi", "copilote_fi"];

export default function FIDossiersPage() {
  const queryClient = useQueryClient();
  const [selectedFI, setSelectedFI] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedMembre, setSelectedMembre] = useState(null);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMembre, setEditingMembre] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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

  const { data: allMembres = [] } = useQuery({
    queryKey: ["all-membres"],
    queryFn: () => base44.entities.Membre.list("-created_date", 500),
  });

  const { data: allSaisies = [] } = useQuery({
    queryKey: ["all-saisies-fi", selectedFI],
    queryFn: () => selectedFI ? base44.entities.CliniqueSaisie.filter({ famille_impact_id: selectedFI }) : Promise.resolve([]),
    enabled: !!selectedFI,
  });

  // Real-time subscriptions: refresh dossiers and saisies when any change happens
  useEffect(() => {
    const unsubMembres = base44.entities.Membre.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["membres", selectedFI] });
      queryClient.invalidateQueries({ queryKey: ["all-membres"] });
    });
    const unsubSaisies = base44.entities.CliniqueSaisie.subscribe((event) => {
      if (!selectedFI || event.data?.famille_impact_id === selectedFI) {
        queryClient.invalidateQueries({ queryKey: ["all-saisies-fi", selectedFI] });
      }
    });
    const unsubInteractions = base44.entities.InteractionPastorale.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["interactions"] });
    });
    return () => { unsubMembres(); unsubSaisies(); unsubInteractions(); };
  }, [selectedFI, queryClient]);

  const userRole = user?.role || "";
  const canManage = CAN_MANAGE_ROLES.includes(userRole);

  const openCreate = () => {
    setEditingMembre(null);
    setFormData({ ...EMPTY_FORM, famille_impact_id: selectedFI });
    setShowForm(true);
  };

  const openEdit = (membre, e) => {
    e?.stopPropagation();
    setEditingMembre(membre);
    setFormData({
      nom_complet: membre.nom_complet || "",
      telephone: membre.telephone || "",
      email: membre.email || "",
      ville: membre.ville || "",
      age: membre.age || "",
      genre: membre.genre || "",
      statut_pipeline: membre.statut_pipeline || "passif",
      potentiel_formation: membre.potentiel_formation || false,
      notes: membre.notes || "",
      famille_impact_id: membre.famille_impact_id,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...formData,
      age: formData.age ? Number(formData.age) : null,
      famille_impact_id: formData.famille_impact_id || selectedFI,
    };
    if (editingMembre) {
      await base44.entities.Membre.update(editingMembre.id, payload);
    } else {
      await base44.entities.Membre.create(payload);
    }
    queryClient.invalidateQueries({ queryKey: ["membres", selectedFI] });
    queryClient.invalidateQueries({ queryKey: ["all-membres"] });
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.Membre.delete(deleteTarget.id);
    queryClient.invalidateQueries({ queryKey: ["membres", selectedFI] });
    queryClient.invalidateQueries({ queryKey: ["all-membres"] });
    setDeleteTarget(null);
    if (selectedMembre?.id === deleteTarget.id) setSelectedMembre(null);
  };

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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Familles d'Impact</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Dossiers Âmes</h1>
        <p className="text-sm text-zinc-500 mt-0.5">CRM individuel · Matrice d'assiduité · Alertes pastorales</p>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center justify-between">
        <Select value={selectedFI || ""} onValueChange={setSelectedFI}>
          <SelectTrigger className="w-64 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Sélectionner une FI" />
          </SelectTrigger>
          <SelectContent>
            {familles.map((fi) => <SelectItem key={fi.id} value={fi.id}>{fi.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Rechercher un membre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
          />
        </div>
        {canManage && selectedFI && (
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 flex-shrink-0">
            <Plus className="w-4 h-4" /> Nouveau membre
          </Button>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((membre, i) => {
          const alerte = detectChuteLivre(membre.id, allSaisies);
          const avg = getLastAvg(membre.id);
          return (
            <motion.div key={membre.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div
                className={cn(
                  "rounded-2xl border cursor-pointer transition-all duration-200 p-4 space-y-3",
                  alerte ? "border-red-500/30" : "border-white/[0.07] hover:border-white/[0.14]"
                )}
                style={{ background: alerte ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.025)", backdropFilter: "blur(24px) saturate(1.4)" }}
                onClick={() => setSelectedMembre(membre)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {membre.nom_complet?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{membre.nom_complet}</p>
                      <p className="text-xs text-zinc-500">{membre.ville} · {membre.age} ans</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={cn("text-[10px] px-1.5 border", STATUT_COLORS[membre.statut_pipeline])}>
                      {membre.statut_pipeline}
                    </Badge>
                    {alerte && <ChuteLivreAlert />}
                    {canManage && (
                      <div className="flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => openEdit(membre, e)} className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-blue-400 transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(membre); }} className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Assiduité · 13 semaines</p>
                  <AssiduitéMatrix membreId={membre.id} saisies={allSaisies} nbWeeks={13} />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
                  <span className="text-[10px] text-zinc-500">Dernière santé</span>
                  {avg ? (
                    <span className={cn("text-sm font-black", parseFloat(avg) >= 7 ? "text-emerald-400" : parseFloat(avg) >= 5 ? "text-amber-400" : "text-red-400")}>
                      {avg}/10
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-sm text-zinc-600">
            <Users className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
            Aucun membre trouvé
          </div>
        )}
      </div>

      {/* Form Dialog: Create / Edit */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg border-white/10 text-white" style={{ background: "rgba(8,11,22,0.97)", backdropFilter: "blur(40px)" }}>
          <DialogHeader>
            <DialogTitle className="text-white">{editingMembre ? "Modifier le membre" : "Nouveau membre"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[
              { key: "nom_complet", label: "Nom complet", full: true },
              { key: "telephone", label: "Téléphone" },
              { key: "email", label: "Email" },
              { key: "ville", label: "Ville" },
              { key: "age", label: "Âge", type: "number" },
            ].map(({ key, label, full, type }) => (
              <div key={key} className={full ? "col-span-2" : ""}>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</label>
                <Input
                  type={type || "text"}
                  value={formData[key]}
                  onChange={(e) => setFormData(p => ({ ...p, [key]: e.target.value }))}
                  className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>
            ))}
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Genre</label>
              <Select value={formData.genre} onValueChange={(v) => setFormData(p => ({ ...p, genre: v }))}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white"><SelectValue placeholder="Genre" /></SelectTrigger>
                <SelectContent>{GENRE_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Statut pipeline</label>
              <Select value={formData.statut_pipeline} onValueChange={(v) => setFormData(p => ({ ...p, statut_pipeline: v }))}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUT_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="potentiel" checked={formData.potentiel_formation} onChange={(e) => setFormData(p => ({ ...p, potentiel_formation: e.target.checked }))} className="w-4 h-4" />
              <label htmlFor="potentiel" className="text-sm text-zinc-300">Potentiel formation (40%)</label>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setShowForm(false)} className="text-zinc-400">Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !formData.nom_complet} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? "Enregistrement..." : editingMembre ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm border-white/10 text-white" style={{ background: "rgba(8,11,22,0.97)", backdropFilter: "blur(40px)" }}>
          <DialogHeader>
            <DialogTitle className="text-white">Supprimer le membre ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400 mt-2">Cette action est irréversible. <span className="text-white font-semibold">{deleteTarget?.nom_complet}</span> sera supprimé définitivement.</p>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="text-zinc-400">Annuler</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slide-over Dossier */}
      <Sheet open={!!selectedMembre} onOpenChange={() => setSelectedMembre(null)}>
        <SheetContent
          className="w-full sm:max-w-lg overflow-y-auto border-l border-white/[0.07]"
          style={{ background: "rgba(8,11,18,0.95)", backdropFilter: "blur(40px)" }}
        >
          {selectedMembre && (
            <>
              <SheetHeader className="pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                    {selectedMembre.nom_complet?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <SheetTitle className="text-lg font-bold text-white">{selectedMembre.nom_complet}</SheetTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={cn("text-[10px] border", STATUT_COLORS[selectedMembre.statut_pipeline])}>
                        {selectedMembre.statut_pipeline}
                      </Badge>
                      {detectChuteLivre(selectedMembre.id, allSaisies) && <ChuteLivreAlert />}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="py-5 space-y-5">
                {user?.role === "responsable_fi" && (
                  <AIFIAssignment membre={selectedMembre} familles={familles} membres={allMembres} />
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: "Ville", value: selectedMembre.ville || "—" },
                    { label: "Âge", value: selectedMembre.age ? `${selectedMembre.age} ans` : "—" },
                    { label: "Tél", value: selectedMembre.telephone || "—" },
                    { label: "Formation", value: selectedMembre.potentiel_formation ? "✦ Identifié" : "Non sélectionné", highlight: selectedMembre.potentiel_formation },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="p-3 rounded-xl border border-white/[0.07] bg-white/[0.03]">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
                      <p className={cn("font-medium mt-0.5 text-xs", highlight ? "text-violet-400" : "text-zinc-300")}>{value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-semibold text-zinc-300 mb-2">Matrice d'assiduité · 13 semaines</p>
                  <AssiduitéMatrix membreId={selectedMembre.id} saisies={allSaisies} nbWeeks={13} />
                  <div className="flex flex-wrap gap-3 mt-2">
                    {[["bg-emerald-500", "Présent (8-10)"], ["bg-amber-400", "Présent (5-7)"], ["bg-red-500", "Présent (<5)"], ["bg-red-200", "Absent"], ["bg-white/10", "Non saisi"]].map(([c, l]) => (
                      <div key={l} className="flex items-center gap-1">
                        <div className={`w-2.5 h-2.5 rounded-sm ${c}`} />
                        <span className="text-[10px] text-zinc-500">{l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Journal Pastoral */}
                <div className="rounded-xl border border-white/[0.07] p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <InteractionsPastorales
                    membre={selectedMembre}
                    famillId={selectedFI}
                    user={user}
                    canWrite={["admin", "responsable_fi", "pilote_fi", "copilote_fi"].includes(user?.role)}
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-zinc-300 mb-2">Historique des saisies cliniques</p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {allSaisies
                      .filter((s) => s.membre_id === selectedMembre.id)
                      .sort((a, b) => new Date(b.semaine) - new Date(a.semaine))
                      .slice(0, 10)
                      .map((s) => {
                        const notes = [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter((n) => n !== null && n !== undefined);
                        const avg = notes.length > 0 ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : null;
                        return (
                          <div key={s.id} className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-sm">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", s.presence ? "bg-emerald-400" : "bg-red-400")} />
                              <span className="text-xs text-zinc-500">{s.semaine}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                              <span>⏰{s.note_temps ?? "—"}</span>
                              <span>💰{s.note_finances ?? "—"}</span>
                              <span>💭{s.note_emotions ?? "—"}</span>
                              <span>🙏{s.note_spirituel ?? "—"}</span>
                              {avg && <span className={cn("font-bold", parseFloat(avg) >= 7 ? "text-emerald-400" : parseFloat(avg) >= 5 ? "text-amber-400" : "text-red-400")}>{avg}</span>}
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