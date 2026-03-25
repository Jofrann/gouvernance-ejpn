import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Calendar, MapPin, Clock, CheckCircle2, Lock, AlertTriangle, ChevronRight, Loader2, MoreVertical, Pencil, Trash2, Play, Flag } from "lucide-react";
import DebriefWizard from "@/components/evangelisation/DebriefWizard";
import CreateActionModal from "@/components/evangelisation/CreateActionModal";

const STATUT_CONFIG = {
  "Planifiée": { color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  "En cours": { color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  "Terminée": { color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" }
};

const TYPE_CONFIG = {
  "Terrain": { icon: "🚶" },
  "Digital": { icon: "📱" }
};

export default function EvangelisationOperationsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editAction, setEditAction] = useState(null);
  const [debriefAction, setDebriefAction] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["evang-actions"],
    queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 100)
  });

  const { data: compteRendus = [] } = useQuery({
    queryKey: ["evang-crs"],
    queryFn: () => base44.entities.CompteRendu.list("-created_date", 200)
  });

  const crByAction = compteRendus.reduce((acc, cr) => {
    acc[cr.action_id] = cr;
    return acc;
  }, {});

  const handleChangeStatut = async (action, newStatut) => {
    await base44.entities.ActionEvangelisation.update(action.id, { statut: newStatut });
    queryClient.invalidateQueries({ queryKey: ["evang-actions"] });
    toast.success(`Statut mis à jour : ${newStatut}`);
  };

  const handleDelete = async (action) => {
    await base44.entities.ActionEvangelisation.delete(action.id);
    queryClient.invalidateQueries({ queryKey: ["evang-actions"] });
    setDeleteConfirm(null);
    toast.success("Action supprimée.");
  };

  const planifiees = actions.filter((a) => a.statut === "Planifiée");
  const enCours = actions.filter((a) => a.statut === "En cours");
  const terminees = actions.filter((a) => a.statut === "Terminée");

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["evang-actions"] });
    queryClient.invalidateQueries({ queryKey: ["evang-crs"] });
    queryClient.invalidateQueries({ queryKey: ["evang-ames"] });
  };

  return (
    <div className="px-4 md:px-6 py-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-[0.25em] mb-1">Évangélisation · Pilier 1</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Opérations & Débriefs</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Agenda des sorties · Workflow de compte-rendu</p>
        </div>
        <button
          onClick={() => setShowCreate(true)} className="bg-slate-600 text-slate-50 px-4 py-2.5 btn-glow-blue flex items-center gap-2 flex-shrink-0">

          
          <Plus className="w-4 h-4" /> Nouvelle action
        </button>
      </div>

      {isLoading ?
      <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
        </div> :

      <>
          {enCours.length > 0 &&
        <Section title="En cours" icon="🔴" count={enCours.length}>
              {enCours.map((action) =>
          <ActionCard
            key={action.id}
            action={action}
            cr={crByAction[action.id]}
            onDebrief={() => setDebriefAction(action)}
            onEdit={() => setEditAction(action)}
            onDelete={() => setDeleteConfirm(action)}
            onChangeStatut={(s) => handleChangeStatut(action, s)}
            pulse />

          )}
            </Section>
        }

          <Section title="Planifiées" icon="📅" count={planifiees.length}>
            {planifiees.length === 0 ?
          <EmptyState label="Aucune action planifiée" /> :
          planifiees.map((action) =>
          <ActionCard
            key={action.id}
            action={action}
            cr={crByAction[action.id]}
            onEdit={() => setEditAction(action)}
            onDelete={() => setDeleteConfirm(action)}
            onChangeStatut={(s) => handleChangeStatut(action, s)} />

          )}
          </Section>

          <Section title="Terminées" icon="✅" count={terminees.length}>
            {terminees.length === 0 ?
          <EmptyState label="Aucune action terminée" /> :
          terminees.map((action) =>
          <ActionCard
            key={action.id}
            action={action}
            cr={crByAction[action.id]}
            onDebrief={() => setDebriefAction(action)}
            onEdit={() => setEditAction(action)}
            onDelete={() => setDeleteConfirm(action)}
            onChangeStatut={(s) => handleChangeStatut(action, s)} />

          )}
          </Section>
        </>
      }

      {/* Modals */}
      <AnimatePresence>
        {(showCreate || editAction) &&
        <CreateActionModal
          editAction={editAction}
          onClose={() => {setShowCreate(false);setEditAction(null);}}
          onCreated={() => {
            refreshAll();
            setShowCreate(false);
            setEditAction(null);
            toast.success(editAction ? "Action modifiée !" : "Action créée !");
          }} />

        }
        {debriefAction &&
        <DebriefWizard
          action={debriefAction}
          existingCR={crByAction[debriefAction.id]}
          onClose={() => setDebriefAction(null)}
          onSealed={() => {
            refreshAll();
            setDebriefAction(null);
            toast.success("Rapport scellé ! Les âmes sont dans le Vivier.");
          }} />

        }
        {deleteConfirm &&
        <DeleteConfirmModal
          action={deleteConfirm}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)} />

        }
      </AnimatePresence>
    </div>);

}

function Section({ title, icon, count, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <h2 className="text-sm font-bold text-zinc-300">{title}</h2>
        <span className="text-xs text-zinc-600 font-medium">({count})</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>);

}

function EmptyState({ label }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] py-8 text-center">
      <p className="text-sm text-zinc-600">{label}</p>
    </div>);

}

function ActionCard({ action, cr, onDebrief, onEdit, onDelete, onChangeStatut, pulse }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const statut = STATUT_CONFIG[action.statut] || STATUT_CONFIG["Planifiée"];
  const type = TYPE_CONFIG[action.type_action] || TYPE_CONFIG["Terrain"];
  const crVerrouille = cr?.est_verrouille;

  useEffect(() => {
    const handler = (e) => {if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);};
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const otherStatuts = ["Planifiée", "En cours", "Terminée"].filter((s) => s !== action.statut);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 hover:border-white/[0.14] transition-all">
      
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex items-center gap-1.5 mt-0.5">
            {pulse &&
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
              </span>
            }
            <span className="text-lg">{type.icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{action.titre}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Calendar className="w-3 h-3" />
                {format(new Date(action.date_action), "d MMM yyyy · HH'h'mm", { locale: fr })}
              </span>
              {action.lieu &&
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <MapPin className="w-3 h-3" /> {action.lieu}
                </span>
              }
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", statut.color)}>
            {action.statut}
          </span>

          {/* Context menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition-all">
              
              <MoreVertical className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {menuOpen &&
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-white/10 bg-[#0f1117] shadow-2xl z-30 overflow-hidden">
                
                  <div className="p-1.5 space-y-0.5">
                    {/* Modifier */}
                    <button
                    onClick={() => {setMenuOpen(false);onEdit();}}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all text-left">
                    
                      <Pencil className="w-3.5 h-3.5 text-blue-400" /> Modifier
                    </button>

                    {/* Changer statut */}
                    {otherStatuts.map((s) =>
                  <button
                    key={s}
                    onClick={() => {setMenuOpen(false);onChangeStatut(s);}}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all text-left">
                    
                        <Flag className="w-3.5 h-3.5 text-amber-400" /> Passer à "{s}"
                      </button>
                  )}

                    {/* Debrief si terminée et pas scellé */}
                    {action.statut === "Terminée" && !crVerrouille && onDebrief &&
                  <button
                    onClick={() => {setMenuOpen(false);onDebrief();}}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all text-left">
                    
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> Rédiger le CR
                      </button>
                  }

                    <div className="h-px bg-white/[0.06] my-1" />

                    {/* Supprimer */}
                    <button
                    onClick={() => {setMenuOpen(false);onDelete();}}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/[0.08] transition-all text-left">
                    
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </button>
                  </div>
                </motion.div>
              }
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Quick actions bar */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.05]">
        {action.statut === "Planifiée" &&
        <button onClick={() => onChangeStatut("En cours")}
        className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-1.5">
            <Play className="w-3 h-3" /> Démarrer
          </button>
        }
        {action.statut === "En cours" &&
        <button onClick={() => onChangeStatut("Terminée")}
        className="px-3 py-1.5 rounded-lg bg-zinc-500/10 border border-zinc-500/20 text-xs text-zinc-400 hover:bg-zinc-500/20 transition-all flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" /> Marquer terminée
          </button>
        }
        {action.statut === "Terminée" && (
        crVerrouille ?
        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Lock className="w-3 h-3" /> CR scellé
            </span> :

        onDebrief &&
        <button onClick={onDebrief}
        className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 hover:bg-blue-500/20 transition-all flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> Rédiger le CR <ChevronRight className="w-3 h-3" />
              </button>)


        }
      </div>

      {/* CR summary if locked */}
      {crVerrouille && cr &&
      <div className="mt-3 grid grid-cols-3 gap-2 bg-white/[0.02] rounded-lg p-2">
          <div className="text-center">
            <p className="text-xs font-bold text-white">{cr.abordes_count}</p>
            <p className="text-[10px] text-zinc-600">Abordés</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-white">{cr.contacts_pris}</p>
            <p className="text-[10px] text-zinc-600">Contacts</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-emerald-400">{cr.prieres_salut}</p>
            <p className="text-[10px] text-zinc-600">Saluts</p>
          </div>
        </div>
      }
    </motion.div>);

}

function DeleteConfirmModal({ action, onConfirm, onCancel }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        className="relative w-full max-w-sm rounded-2xl border border-red-500/20 bg-[#0d1018] p-6 shadow-2xl z-10"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Supprimer l'action ?</p>
            <p className="text-xs text-zinc-500 mt-0.5">"{action.titre}"</p>
          </div>
        </div>
        <p className="text-xs text-zinc-600 mb-5">Cette action est irréversible. Le CR associé ne sera pas supprimé.</p>
        <div className="flex gap-2">
          <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-400 hover:bg-white/[0.04] transition-all">
            Annuler
          </button>
          <button onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-sm text-red-400 hover:bg-red-500/30 transition-all font-medium">
            Supprimer
          </button>
        </div>
      </motion.div>
    </motion.div>);

}