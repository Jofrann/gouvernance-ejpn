import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Users, Search, Plus, Pencil, Trash2, Star, Eye, Kanban, CalendarDays, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { format, startOfWeek, setDay, addWeeks, subWeeks, isAfter, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import FISlideOver from "@/components/fi/FISlideOver";
import FIHeaderInfo from "@/components/fi/FIHeaderInfo";
import AjouterAmeModal from "@/components/fi/AjouterAmeModal";
import CliniqueGrid from "@/components/fi/CliniqueGrid";
import { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const PIPELINE_COLORS = {
  passif: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  regulier: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  disciple: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  serviteur: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  reproducteur: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

function getThursday(date) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return setDay(start, 4, { weekStartsOn: 1 });
}

const GlassCard = ({ children, className = "" }) => (
  <div className={cn("rounded-2xl border border-white/[0.09] p-4", className)}
    style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.018) 100%)",
      backdropFilter: "blur(40px) saturate(1.7) brightness(1.05)",
      WebkitBackdropFilter: "blur(40px) saturate(1.7) brightness(1.05)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.12), 0 8px 32px rgba(0,0,0,0.32)"
    }}>
    {children}
  </div>
);

/* ═══ ONGLET MEMBRES & CRM ═══ */
function TabMembres({ fi, user }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [selectedMembre, setSelectedMembre] = useState(null);
  const [editMembre, setEditMembre] = useState(null);
  const [showAjouter, setShowAjouter] = useState(false);
  const [deleteMembre, setDeleteMembre] = useState(null);

  const canWrite = ["admin", "responsable_fi", "pilote_fi", "copilote_fi"].includes(user?.role);

  const { data: membres = [] } = useQuery({
    queryKey: ["membres", fi?.id],
    queryFn: () => fi ? base44.entities.Membre.filter({ famille_impact_id: fi.id }) : Promise.resolve([]),
    enabled: !!fi?.id,
  });

  const { data: saisies = [] } = useQuery({
    queryKey: ["saisies-crm", fi?.id],
    queryFn: () => fi ? base44.entities.CliniqueSaisie.filter({ famille_impact_id: fi.id }) : Promise.resolve([]),
    enabled: !!fi?.id,
  });

  useEffect(() => {
    const unsub = base44.entities.Membre.subscribe(() => queryClient.invalidateQueries({ queryKey: ["membres", fi?.id] }));
    return unsub;
  }, [fi?.id, queryClient]);

  const togglePotentiel = useMutation({
    mutationFn: ({ id, val }) => base44.entities.Membre.update(id, { potentiel_formation: val }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["membres", fi?.id] }),
  });

  const updateStatut = useMutation({
    mutationFn: ({ id, statut }) => base44.entities.Membre.update(id, { statut_pipeline: statut }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["membres", fi?.id] }),
  });

  const supprimerMembre = useMutation({
    mutationFn: (id) => base44.entities.Membre.update(id, { famille_impact_id: null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["membres", fi?.id] }); setDeleteMembre(null); },
  });

  const getAvg = (membreId) => {
    const s = saisies.filter(s => s.membre_id === membreId).sort((a, b) => new Date(b.semaine) - new Date(a.semaine))[0];
    if (!s) return null;
    const notes = [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter(n => n != null);
    return notes.length > 0 ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : null;
  };

  const filtered = membres.filter(m => {
    const matchSearch = m.nom_complet?.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === "tous" || m.statut_pipeline === filterStatut;
    return matchSearch && matchStatut;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un membre..."
              className="pl-9 h-9 rounded-xl bg-white/[0.04] border-white/[0.08] text-white placeholder:text-[#475569] focus:border-blue-500/40 focus:ring-[3px] focus:ring-blue-500/10 transition-all" />
          </div>
          {canWrite && (
            <button onClick={() => setShowAjouter(true)} className="btn-glow-blue flex items-center gap-2 px-4 py-2 h-9">
              <Plus className="w-4 h-4" /> Ajouter une Âme
            </button>
          )}
        </div>
        {/* Quick filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {["tous", "passif", "regulier", "disciple", "serviteur", "reproducteur"].map(s => (
            <button key={s} onClick={() => setFilterStatut(s)}
              className={cn("px-3 py-1 rounded-full text-xs font-medium transition-all capitalize border",
                filterStatut === s
                  ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                  : "bg-white/[0.03] text-zinc-500 border-white/[0.06] hover:text-zinc-300 hover:border-white/10")}>
              {s === "tous" ? "Tous" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-2xl border border-white/[0.09] overflow-hidden" style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
        backdropFilter: "blur(40px)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.28)"
      }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
            <p className="text-sm text-zinc-600">Aucun membre trouvé</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Membre", "Statut Pipeline", "Santé", "Potentiel", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.15em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const alerte = detectChuteLivre(m.id, saisies);
                const avg = getAvg(m.id);
                return (
                  <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className={cn("table-row-glass group", alerte ? "bg-red-500/[0.03]" : "")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {m.nom_complet?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{m.nom_complet}</p>
                          {alerte && <p className="text-[10px] text-red-400">⚠ Chute Libre</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canWrite ? (
                        <Select value={m.statut_pipeline} onValueChange={v => updateStatut.mutate({ id: m.id, statut: v })}>
                          <SelectTrigger className={cn("h-6 w-32 text-[10px] border", PIPELINE_COLORS[m.statut_pipeline])}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["passif", "regulier", "disciple", "serviteur", "reproducteur"].map(s => (
                              <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={cn("text-[10px] border", PIPELINE_COLORS[m.statut_pipeline])}>{m.statut_pipeline}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {avg ? (
                        <span className={cn("text-sm font-black", parseFloat(avg) >= 7 ? "text-emerald-400" : parseFloat(avg) >= 5 ? "text-amber-400" : "text-red-400")}>{avg}/10</span>
                      ) : <span className="text-xs text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => canWrite && togglePotentiel.mutate({ id: m.id, val: !m.potentiel_formation })}
                        className={cn("flex items-center gap-1.5 text-xs transition-all", m.potentiel_formation ? "text-violet-400" : "text-zinc-600 hover:text-zinc-400")}>
                        <Star className={cn("w-3.5 h-3.5", m.potentiel_formation && "fill-violet-400")} />
                        {m.potentiel_formation ? "Identifié" : "—"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button title="Voir le dossier"
                          className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                          onClick={() => setSelectedMembre(m)}>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {canWrite && (<>
                          <button title="Modifier"
                            className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                            onClick={() => setEditMembre(m)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button title="Désaffecter"
                            className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            onClick={() => setDeleteMembre(m)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>)}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <FISlideOver membre={selectedMembre} saisies={saisies} famillId={fi?.id} user={user} onClose={() => setSelectedMembre(null)} />

      <AjouterAmeModal open={showAjouter} onClose={() => setShowAjouter(false)} familleImpactId={fi?.id} familleNom={fi?.name} />

      <AlertDialog open={!!deleteMembre} onOpenChange={() => setDeleteMembre(null)}>
        <AlertDialogContent className="bg-[#0a0d14] border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Désaffecter ce membre ?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              <strong className="text-white">{deleteMembre?.nom_complet}</strong> retournera dans le Vivier. Son historique est conservé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-zinc-300">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => supprimerMembre.mutate(deleteMembre.id)} className="bg-red-600 hover:bg-red-500 text-white">Désaffecter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ═══ ONGLET CLINIQUE ═══ */
function TabClinique({ fi }) {
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(getThursday(new Date()));
  const [localSaisies, setLocalSaisies] = useState({});
  const [saving, setSaving] = useState({});

  const semaineStr = format(currentWeek, "yyyy-MM-dd");
  const isCurrentWeekPast = isAfter(new Date(), currentWeek);
  const weekLabel = format(currentWeek, "EEEE d MMMM yyyy", { locale: fr });

  const { data: membres = [] } = useQuery({
    queryKey: ["membres", fi?.id],
    queryFn: () => fi ? base44.entities.Membre.filter({ famille_impact_id: fi.id }) : Promise.resolve([]),
    enabled: !!fi?.id,
  });

  const { data: saisies = [] } = useQuery({
    queryKey: ["saisies-clinique", fi?.id, semaineStr],
    queryFn: () => fi ? base44.entities.CliniqueSaisie.filter({ famille_impact_id: fi.id, semaine: semaineStr }) : Promise.resolve([]),
    enabled: !!fi?.id,
  });

  useEffect(() => {
    const map = {};
    saisies.forEach(s => { map[s.membre_id] = s; });
    setLocalSaisies(map);
  }, [saisies]);

  const handleChange = useCallback(async (membreId, field, value) => {
    const isRetard = isAfter(new Date(), endOfDay(currentWeek));
    setLocalSaisies(prev => ({ ...prev, [membreId]: { ...prev[membreId], [field]: value } }));
    setSaving(prev => ({ ...prev, [membreId]: true }));

    const existing = saisies.find(s => s.membre_id === membreId);
    const current = localSaisies[membreId] || {};
    const data = { membre_id: membreId, famille_impact_id: fi.id, semaine: semaineStr, flag_retard: isRetard, ...current, [field]: value };

    if (existing) {
      await base44.entities.CliniqueSaisie.update(existing.id, data);
    } else {
      await base44.entities.CliniqueSaisie.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ["saisies-clinique", fi?.id, semaineStr] });
    setSaving(prev => ({ ...prev, [membreId]: false }));
  }, [saisies, localSaisies, fi, semaineStr, currentWeek, queryClient]);

  const completionCount = membres.filter(m => {
    const s = localSaisies[m.id];
    return s && s.presence !== undefined && s.note_temps != null;
  }).length;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.09] p-1" style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)",
          backdropFilter: "blur(24px)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)"
        }}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-3">
            <CalendarDays className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-300 capitalize whitespace-nowrap">{weekLabel}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            disabled={isAfter(addWeeks(currentWeek, 1), new Date())}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Badge className="bg-white/5 text-zinc-400 border border-white/10 gap-1">
          {completionCount}/{membres.length} complétés
        </Badge>
        {isCurrentWeekPast && (
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 gap-1">
            <AlertTriangle className="w-3 h-3" /> Semaine passée — saisie en retard
          </Badge>
        )}
      </div>

      <CliniqueGrid
        membres={membres}
        saisies={localSaisies}
        onUpdateSaisie={handleChange}
        locked={false}
        savingMap={saving}
      />
    </div>
  );
}

/* ═══ ONGLET WORKSPACE & AGENDA ═══ */
function TabWorkspace({ fi }) {
  const queryClient = useQueryClient();
  const [newTache, setNewTache] = useState("");
  const [addingCol, setAddingCol] = useState(null);

  const { data: taches = [] } = useQuery({
    queryKey: ["taches", fi?.id],
    queryFn: () => fi ? base44.entities.TacheWorkspace.filter({ famille_impact_id: fi.id }) : Promise.resolve([]),
    enabled: !!fi?.id,
  });

  const createTache = useMutation({
    mutationFn: (statut) => base44.entities.TacheWorkspace.create({ famille_impact_id: fi.id, titre: newTache, statut }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["taches", fi?.id] }); setNewTache(""); setAddingCol(null); },
  });

  const moveTache = useMutation({
    mutationFn: ({ id, statut }) => base44.entities.TacheWorkspace.update(id, { statut }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["taches", fi?.id] }),
  });

  const deleteTache = useMutation({
    mutationFn: (id) => base44.entities.TacheWorkspace.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["taches", fi?.id] }),
  });

  const COLS = [
    { key: "a_faire", label: "À faire", color: "text-zinc-400", border: "border-zinc-500/30" },
    { key: "en_cours", label: "En cours", color: "text-blue-400", border: "border-blue-500/30" },
    { key: "termine", label: "Terminé", color: "text-emerald-400", border: "border-emerald-500/30" },
  ];

  const NEXT = { a_faire: "en_cours", en_cours: "termine", termine: null };
  const PREV = { a_faire: null, en_cours: "a_faire", termine: "en_cours" };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLS.map(col => (
        <div key={col.key} className="space-y-2">
          <div className={cn("flex items-center justify-between px-1 pb-2 border-b", col.border)}>
            <p className={cn("text-xs font-bold uppercase tracking-widest", col.color)}>{col.label}</p>
            <Badge className="bg-white/5 border-white/10 text-zinc-500 text-[10px]">{taches.filter(t => t.statut === col.key).length}</Badge>
          </div>

          {taches.filter(t => t.statut === col.key).map(t => (
            <div key={t.id} className="p-3 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
              <p className="text-sm text-zinc-300 mb-2">{t.titre}</p>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                {PREV[t.statut] && (
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-zinc-500 hover:text-white"
                    onClick={() => moveTache.mutate({ id: t.id, statut: PREV[t.statut] })}>← Reculer</Button>
                )}
                {NEXT[t.statut] && (
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-zinc-500 hover:text-white"
                    onClick={() => moveTache.mutate({ id: t.id, statut: NEXT[t.statut] })}>Avancer →</Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500/40 hover:text-red-400 ml-auto"
                  onClick={() => deleteTache.mutate(t.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}

          {addingCol === col.key ? (
            <div className="space-y-2">
              <Input value={newTache} onChange={e => setNewTache(e.target.value)} placeholder="Titre de la tâche..."
                className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
                onKeyDown={e => e.key === "Enter" && newTache && createTache.mutate(col.key)}
                autoFocus />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-7 bg-blue-600/80 hover:bg-blue-600 text-white text-xs"
                  onClick={() => newTache && createTache.mutate(col.key)}>Ajouter</Button>
                <Button size="sm" variant="ghost" className="h-7 text-zinc-500 hover:text-white text-xs"
                  onClick={() => { setAddingCol(null); setNewTache(""); }}>Annuler</Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingCol(col.key)}
              className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-white/[0.07] text-zinc-600 hover:text-zinc-400 hover:border-white/[0.12] transition-all text-xs">
              <Plus className="w-3.5 h-3.5" /> Nouvelle tâche
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══ PAGE PRINCIPALE ═══ */
export default function FIHubPage() {
  useTrackActivity("FIHub");
  const [tab, setTab] = useState("membres");
  const [selectedFI, setSelectedFI] = useState(null);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: familles = [] } = useQuery({
    queryKey: ["familles-hub"],
    queryFn: () => base44.entities.FamilleImpact.list(),
  });

  useEffect(() => {
    if (familles.length > 0 && !selectedFI) {
      // Pilote: default to their FI
      const myFI = familles.find(f => f.pilote_email === user?.email || f.co_pilote_email === user?.email);
      setSelectedFI(myFI?.id || familles[0].id);
    }
  }, [familles, user, selectedFI]);

  const fi = familles.find(f => f.id === selectedFI);

  // Filter FIs by role
  const availableFIs = (user?.role === "admin" || user?.role === "responsable_fi")
    ? familles
    : familles.filter(f => f.pilote_email === user?.email || f.co_pilote_email === user?.email);

  const TABS = [
    { key: "membres", label: "Membres & CRM", icon: Users },
    { key: "clinique", label: "Clinique du Jeudi", icon: CalendarDays },
    { key: "workspace", label: "Workspace", icon: Kanban },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="page-label text-emerald-400/80">Familles d'Impact</p>
          <h1 className="text-2xl font-light text-white tracking-tight">Hub <span className="font-black">FI</span></h1>
          <p className="text-sm text-zinc-500 mt-0.5 font-light leading-relaxed">Bureau de commandement de votre maison</p>
        </div>

        {/* FI Selector + Info */}
        {fi && (
          <div className="flex flex-col items-end gap-2">
            {availableFIs.length > 1 && (
              <Select value={selectedFI || ""} onValueChange={setSelectedFI}>
                <SelectTrigger className="w-56 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Choisir une FI" />
                </SelectTrigger>
                <SelectContent>
                  {availableFIs.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <FIHeaderInfo fi={fi} />
          </div>
        )}
      </div>

      {/* Sub-Nav (neon tab bar) */}
      <div className="relative flex gap-0 border-b border-white/[0.07]">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all",
                active ? "text-white" : "text-zinc-500 hover:text-zinc-300")}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(" ")[0]}</span>
              {active && (
                <motion.div layoutId="fi-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {!fi ? (
        <div className="py-20 text-center text-sm text-zinc-600">Aucune Famille d'Impact disponible</div>
      ) : (
        <>
          {tab === "membres" && <TabMembres fi={fi} user={user} />}
          {tab === "clinique" && <TabClinique fi={fi} />}
          {tab === "workspace" && <TabWorkspace fi={fi} />}
        </>
      )}
    </div>
  );
}