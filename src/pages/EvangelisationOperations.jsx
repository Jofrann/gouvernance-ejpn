import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Calendar, MapPin, Clock, CheckCircle2, Lock, AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import DebriefWizard from "@/components/evangelisation/DebriefWizard";
import CreateActionModal from "@/components/evangelisation/CreateActionModal";

const STATUT_CONFIG = {
  "Planifiée": { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
  "En cours":  { color: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
  "Terminée":  { color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", dot: "bg-zinc-500" },
};

const TYPE_CONFIG = {
  "Terrain": { icon: "🚶", color: "text-orange-400" },
  "Digital": { icon: "📱", color: "text-cyan-400" },
};

export default function EvangelisationOperationsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [debriefAction, setDebriefAction] = useState(null);

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["evang-actions"],
    queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 100),
  });

  const { data: compteRendus = [] } = useQuery({
    queryKey: ["evang-crs"],
    queryFn: () => base44.entities.CompteRendu.list("-created_date", 200),
  });

  const crByAction = compteRendus.reduce((acc, cr) => {
    acc[cr.action_id] = cr;
    return acc;
  }, {});

  const handleMarkEnCours = async (action) => {
    await base44.entities.ActionEvangelisation.update(action.id, { statut: "En cours" });
    queryClient.invalidateQueries({ queryKey: ["evang-actions"] });
    toast.success("Action démarrée !");
  };

  const handleMarkTerminee = async (action) => {
    await base44.entities.ActionEvangelisation.update(action.id, { statut: "Terminée" });
    queryClient.invalidateQueries({ queryKey: ["evang-actions"] });
    toast.success("Action marquée terminée. Prêt pour le CR !");
  };

  const planifiees = actions.filter(a => a.statut === "Planifiée");
  const enCours = actions.filter(a => a.statut === "En cours");
  const terminees = actions.filter(a => a.statut === "Terminée");

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
          onClick={() => setShowCreate(true)}
          className="btn-glow-blue px-4 py-2.5 flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> Nouvelle action
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* En cours */}
          {enCours.length > 0 && (
            <Section title="En cours" icon="🔴" count={enCours.length}>
              {enCours.map(action => (
                <ActionCard
                  key={action.id}
                  action={action}
                  cr={crByAction[action.id]}
                  onDebrief={() => setDebriefAction(action)}
                  onMarkTerminee={() => handleMarkTerminee(action)}
                  pulse
                />
              ))}
            </Section>
          )}

          {/* Planifiées */}
          <Section title="Planifiées" icon="📅" count={planifiees.length}>
            {planifiees.length === 0 ? (
              <EmptyState label="Aucune action planifiée" />
            ) : planifiees.map(action => (
              <ActionCard
                key={action.id}
                action={action}
                cr={crByAction[action.id]}
                onMarkEnCours={() => handleMarkEnCours(action)}
              />
            ))}
          </Section>

          {/* Terminées */}
          <Section title="Terminées" icon="✅" count={terminees.length}>
            {terminees.length === 0 ? (
              <EmptyState label="Aucune action terminée" />
            ) : terminees.map(action => (
              <ActionCard
                key={action.id}
                action={action}
                cr={crByAction[action.id]}
                onDebrief={() => setDebriefAction(action)}
              />
            ))}
          </Section>
        </>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateActionModal
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              queryClient.invalidateQueries({ queryKey: ["evang-actions"] });
              setShowCreate(false);
              toast.success("Action créée !");
            }}
          />
        )}
        {debriefAction && (
          <DebriefWizard
            action={debriefAction}
            existingCR={crByAction[debriefAction.id]}
            onClose={() => setDebriefAction(null)}
            onSealed={() => {
              queryClient.invalidateQueries({ queryKey: ["evang-actions"] });
              queryClient.invalidateQueries({ queryKey: ["evang-crs"] });
              queryClient.invalidateQueries({ queryKey: ["evang-ames"] });
              setDebriefAction(null);
              toast.success("Rapport scellé ! Les âmes sont dans le Vivier.");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
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
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] py-8 text-center">
      <p className="text-sm text-zinc-600">{label}</p>
    </div>
  );
}

function ActionCard({ action, cr, onDebrief, onMarkEnCours, onMarkTerminee, pulse }) {
  const statut = STATUT_CONFIG[action.statut] || STATUT_CONFIG["Planifiée"];
  const type = TYPE_CONFIG[action.type_action] || TYPE_CONFIG["Terrain"];
  const crVerrouille = cr?.est_verrouille;
  const crExiste = !!cr;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 hover:border-white/[0.14] transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex items-center gap-1.5 mt-0.5">
            {pulse && <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
            </span>}
            <span className="text-lg">{type.icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{action.titre}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Calendar className="w-3 h-3" />
                {format(new Date(action.date_action), "d MMM yyyy · HH'h'mm", { locale: fr })}
              </span>
              {action.lieu && (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <MapPin className="w-3 h-3" /> {action.lieu}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", statut.color)}>
            {action.statut}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.05]">
        {action.statut === "Planifiée" && onMarkEnCours && (
          <button onClick={onMarkEnCours}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Démarrer
          </button>
        )}
        {action.statut === "En cours" && onMarkTerminee && (
          <button onClick={onMarkTerminee}
            className="px-3 py-1.5 rounded-lg bg-zinc-500/10 border border-zinc-500/20 text-xs text-zinc-400 hover:bg-zinc-500/20 transition-all flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" /> Marquer terminée
          </button>
        )}
        {action.statut === "Terminée" && (
          crVerrouille ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Lock className="w-3 h-3" /> CR scellé
            </span>
          ) : (
            <button onClick={onDebrief}
              className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 hover:bg-blue-500/20 transition-all flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> Rédiger le CR <ChevronRight className="w-3 h-3" />
            </button>
          )
        )}
      </div>

      {/* CR summary if locked */}
      {crVerrouille && cr && (
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
      )}
    </motion.div>
  );
}