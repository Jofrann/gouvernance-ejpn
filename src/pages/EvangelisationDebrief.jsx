import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Calendar, Users, FileText, AlertTriangle, CheckCircle2, Pencil, Trash2, CalendarClock, X, Save } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import CRSortieForm from "@/components/evangelisation/CRSortieForm";
import ContactsModal from "@/components/evangelisation/ContactsModal";

const TYPE_LABELS = { rue: "🚶 Rue", campus: "🎓 Campus", zoom: "💻 Zoom", porte_a_porte: "🚪 Porte-à-porte", evenement: "🎉 Événement" };
const TYPE_COLORS = {
  rue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  campus: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  zoom: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  porte_a_porte: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  evenement: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

const EMPTY_NEW = { titre: "", type_action: "rue", date_action: "", heure_debut: "", notes_debrief: "" };

export default function EvangelisationDebriefPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [showContacts, setShowContacts] = useState(null); // action for contacts modal
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_NEW);
  const [tab, setTab] = useState("cr"); // cr | contacts | edit
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: actions = [] } = useQuery({
    queryKey: ["actions-debrief"],
    queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 100),
  });

  const { data: crs = [] } = useQuery({
    queryKey: ["cr-sorties"],
    queryFn: () => base44.entities.CRSortie.list("-created_date", 200),
  });

  useEffect(() => {
    const unsub = base44.entities.ActionEvangelisation.subscribe(() => queryClient.invalidateQueries({ queryKey: ["actions-debrief"] }));
    const unsub2 = base44.entities.CRSortie.subscribe(() => queryClient.invalidateQueries({ queryKey: ["cr-sorties"] }));
    return () => { unsub(); unsub2(); };
  }, [queryClient]);

  const getCRForAction = (actionId) => crs.find(c => c.action_id === actionId);

  const handleCreateAction = async () => {
    if (!newForm.titre.trim() || !newForm.date_action) { toast.error("Titre et date requis"); return; }
    await base44.entities.ActionEvangelisation.create({ ...newForm, statut: "planifie" });
    queryClient.invalidateQueries({ queryKey: ["actions-debrief"] });
    toast.success("Sortie créée !");
    setNewForm(EMPTY_NEW);
    setShowNewForm(false);
  };

  const handleDeleteAction = async (id) => {
    await base44.entities.ActionEvangelisation.delete(id);
    queryClient.invalidateQueries({ queryKey: ["actions-debrief"] });
    toast.success("Sortie supprimée");
    setSelectedAction(null);
    setConfirmDelete(false);
  };

  const handleUpdateAction = async () => {
    if (!editForm.titre.trim() || !editForm.date_action) { toast.error("Titre et date requis"); return; }
    setSaving(true);
    await base44.entities.ActionEvangelisation.update(selectedAction.id, editForm);
    queryClient.invalidateQueries({ queryKey: ["actions-debrief"] });
    setSelectedAction({ ...selectedAction, ...editForm });
    toast.success("Sortie mise à jour !");
    setTab("cr");
    setSaving(false);
  };

  const openEdit = (action) => {
    setEditForm({
      titre: action.titre,
      type_action: action.type_action,
      date_action: action.date_action,
      heure_debut: action.heure_debut || "",
      heure_fin: action.heure_fin || "",
      notes_debrief: action.notes_debrief || "",
    });
    setTab("edit");
  };

  const pending = actions.filter(a => !getCRForAction(a.id) || getCRForAction(a.id)?.statut === "brouillon");
  const completed = actions.filter(a => ["soumis", "valide"].includes(getCRForAction(a.id)?.statut));

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-[0.25em] mb-1">Évangélisation</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Sorties & CR</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Comptes-rendus · Contacts · Suivi terrain</p>
        </div>
        <button className="btn-glow-blue px-4 py-2.5 flex items-center gap-2 text-sm flex-shrink-0" onClick={() => setShowNewForm(!showNewForm)}>
          <Plus className="w-4 h-4" /> Nouvelle sortie
        </button>
      </div>

      {/* New action form */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-white/10 p-5 space-y-4" style={{ background: "rgba(255,255,255,0.025)" }}>
              <p className="text-sm font-semibold text-white">📍 Nouvelle sortie</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-zinc-500">Titre *</label>
                  <input className="input-glass mt-1 text-white" placeholder="Ex: Sortie rue Nation" value={newForm.titre} onChange={(e) => setNewForm({ ...newForm, titre: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Type</label>
                  <select className="input-glass mt-1 text-white" style={{ colorScheme: "dark" }} value={newForm.type_action} onChange={(e) => setNewForm({ ...newForm, type_action: e.target.value })}>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k} style={{ background: "#1a1d2a" }}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Date *</label>
                  <input type="date" className="input-glass mt-1 text-white" style={{ colorScheme: "dark" }} value={newForm.date_action} onChange={(e) => setNewForm({ ...newForm, date_action: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost-glass flex-1 py-2 text-xs" onClick={() => setShowNewForm(false)}>Annuler</button>
                <button className="btn-glow-blue flex-1 py-2 text-xs flex items-center justify-center gap-2" onClick={handleCreateAction}>
                  <CheckCircle2 className="w-4 h-4" /> Créer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending CRs */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-400">CR en attente ({pending.length})</h2>
          </div>
          <div className="space-y-2">
            {pending.map((action) => {
              const cr = getCRForAction(action.id);
              return (
                <motion.div key={action.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">{action.titre}</p>
                      <p className="text-xs text-zinc-500">{format(new Date(action.date_action), "d MMM yyyy", { locale: fr })} · {TYPE_LABELS[action.type_action]}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-all"
                      onClick={() => setShowContacts(action)}
                    >
                      <Users className="w-3.5 h-3.5" /> Contacts
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-xs text-amber-300 hover:bg-amber-500/30 flex items-center gap-1.5 transition-all"
                      onClick={() => { setSelectedAction(action); setTab("cr"); }}
                    >
                      <FileText className="w-3.5 h-3.5" /> {cr ? "Continuer CR" : "Faire le CR"}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed */}
      <div>
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Sorties avec CR ({completed.length})</h2>
        {completed.length === 0 ? (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] py-12 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
            <p className="text-sm text-zinc-600">Aucun CR soumis pour l'instant</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completed.map((action) => {
              const cr = getCRForAction(action.id);
              return (
                <div key={action.id}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14] p-4 transition-all cursor-pointer"
                  onClick={() => { setSelectedAction(action); setTab("cr"); }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Badge className={cn("text-[10px] border flex-shrink-0", TYPE_COLORS[action.type_action])}>{TYPE_LABELS[action.type_action]}</Badge>
                      <div>
                        <p className="text-sm font-semibold text-white">{action.titre}</p>
                        <p className="text-xs text-zinc-500">{format(new Date(action.date_action), "d MMMM yyyy", { locale: fr })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        className="p-1.5 text-zinc-600 hover:text-white transition-colors"
                        onClick={(e) => { e.stopPropagation(); setShowContacts(action); }}
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        cr?.statut === "valide" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {cr?.statut === "valide" ? "✓ Validé" : "⏳ Soumis"}
                      </span>
                    </div>
                  </div>
                  {cr && (
                    <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-white/[0.05]">
                      <span className="text-xs text-zinc-500">👥 <strong className="text-zinc-300">{cr.personnes_sorties}</strong> sorties</span>
                      <span className="text-xs text-zinc-500">🗣️ <strong className="text-zinc-300">{cr.personnes_abordees}</strong> abordées</span>
                      <span className="text-xs text-zinc-500">📲 <strong className="text-zinc-300">{cr.prises_de_contact}</strong> contacts</span>
                      <span className="text-xs text-zinc-500">🤝 <strong className="text-zinc-300">{cr.invitations_fij_ejp}</strong> invitations</span>
                      <span className="text-xs text-zinc-500">😇 <strong className="text-zinc-300">{cr.prieres_salut}</strong> saluts</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedAction} onOpenChange={() => { setSelectedAction(null); setConfirmDelete(false); setTab("cr"); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto border-white/10 text-white" style={{ background: "#0d1018" }}>
          {selectedAction && (
            <>
              <SheetHeader className="pb-4 border-b border-white/10">
                <SheetTitle className="text-white">{selectedAction.titre}</SheetTitle>
                <p className="text-xs text-zinc-500">
                  {format(new Date(selectedAction.date_action), "EEEE d MMMM yyyy", { locale: fr })} · {TYPE_LABELS[selectedAction.type_action]}
                </p>
              </SheetHeader>

              {/* Actions rapides */}
              <div className="flex gap-2 mt-4 mb-1">
                <button
                  onClick={() => openEdit(selectedAction)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)" }}
                >
                  <Pencil className="w-3.5 h-3.5" /> Modifier
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(248,113,113,0.9)" }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              </div>

              {/* Confirm delete */}
              <AnimatePresence>
                {confirmDelete && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-2"
                  >
                    <div className="rounded-xl p-3 mt-1" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                      <p className="text-xs text-red-300 font-semibold mb-2">⚠️ Confirmer la suppression de "{selectedAction.titre}" ?</p>
                      <div className="flex gap-2">
                        <button
                          className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.6)" }}
                          onClick={() => setConfirmDelete(false)}
                        >Annuler</button>
                        <button
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171" }}
                          onClick={() => handleDeleteAction(selectedAction.id)}
                        >Oui, supprimer</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mt-3 mb-5">
                {[{ key: "cr", label: "📋 Compte-rendu" }, { key: "contacts", label: "👥 Contacts" }, { key: "edit", label: "✏️ Modifier" }].map(t => (
                  <button key={t.key} onClick={() => { setTab(t.key); if (t.key === "edit") openEdit(selectedAction); }}
                    className={cn("flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                      tab === t.key ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}>
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "cr" && (
                <CRSortieForm
                  action={selectedAction}
                  existingCR={getCRForAction(selectedAction.id)}
                  user={user}
                  onSaved={() => {
                    queryClient.invalidateQueries({ queryKey: ["actions-debrief"] });
                    queryClient.invalidateQueries({ queryKey: ["cr-sorties"] });
                  }}
                />
              )}

              {tab === "contacts" && (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500">Gérez les contacts pris lors de cette sortie directement ici.</p>
                  <button
                    className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.85))", border: "1px solid rgba(99,155,255,0.35)", color: "#fff", boxShadow: "0 0 20px rgba(59,130,246,0.2)" }}
                    onClick={() => { setSelectedAction(null); setShowContacts(selectedAction); }}
                  >
                    <Users className="w-4 h-4" /> Ouvrir la liste des contacts
                  </button>
                </div>
              )}

              {tab === "edit" && editForm && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Titre *</label>
                    <input className="input-glass text-sm text-white" placeholder="Ex: Sortie rue Nation" value={editForm.titre} onChange={(e) => setEditForm({ ...editForm, titre: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Type</label>
                      <select className="input-glass text-sm text-white" style={{ colorScheme: "dark" }} value={editForm.type_action} onChange={(e) => setEditForm({ ...editForm, type_action: e.target.value })}>
                        {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k} style={{ background: "#1a1d2a" }}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" /> Date *
                      </label>
                      <input type="date" className="input-glass text-sm text-white" style={{ colorScheme: "dark" }} value={editForm.date_action} onChange={(e) => setEditForm({ ...editForm, date_action: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Heure début</label>
                      <input type="time" className="input-glass text-sm text-white" style={{ colorScheme: "dark" }} value={editForm.heure_debut} onChange={(e) => setEditForm({ ...editForm, heure_debut: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Heure fin</label>
                      <input type="time" className="input-glass text-sm text-white" style={{ colorScheme: "dark" }} value={editForm.heure_fin} onChange={(e) => setEditForm({ ...editForm, heure_fin: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Notes</label>
                    <textarea className="input-glass text-sm text-white h-20 resize-none" placeholder="Informations complémentaires..." value={editForm.notes_debrief} onChange={(e) => setEditForm({ ...editForm, notes_debrief: e.target.value })} />
                  </div>

                  {/* Décalage rapide */}
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Décaler de</label>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 3, 7, 14].map(days => {
                        const newDate = new Date(editForm.date_action);
                        newDate.setDate(newDate.getDate() + days);
                        const formatted = newDate.toISOString().split("T")[0];
                        return (
                          <button
                            key={days}
                            onClick={() => setEditForm({ ...editForm, date_action: formatted })}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc" }}
                          >
                            +{days}j
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.6)" }}
                      onClick={() => setTab("cr")}
                    >Annuler</button>
                    <button
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.85))", border: "1px solid rgba(99,155,255,0.35)", color: "#fff", boxShadow: "0 0 20px rgba(59,130,246,0.2)" }}
                      onClick={handleUpdateAction}
                      disabled={saving}
                    >
                      <Save className="w-4 h-4" /> {saving ? "Sauvegarde..." : "Enregistrer"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Contacts Modal */}
      <AnimatePresence>
        {showContacts && (
          <ContactsModal
            action={showContacts}
            user={user}
            onClose={() => setShowContacts(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}