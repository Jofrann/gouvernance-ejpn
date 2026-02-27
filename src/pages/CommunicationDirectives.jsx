import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Plus, Archive, Briefcase, Calendar, BookOpen, Tag,
  ChevronDown, ChevronUp, Edit3, Trash2, X, Save
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const CURRENT_MONTH = format(new Date(), "yyyy-MM");

function DirectiveCard({ d, isResponsable, onArchive, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="ai-card rounded-xl border border-white/8 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-sm font-bold text-white">{d.titre}</h3>
              {d.campagne_tag && (
                <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-md px-2 py-0.5">
                  <Tag className="w-2.5 h-2.5" />{d.campagne_tag}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600 border border-white/5 rounded-md px-2 py-0.5">
                <Calendar className="w-2.5 h-2.5" />{d.mois_cycle}
              </span>
            </div>

            <p className={cn(
              "text-sm text-zinc-400 leading-relaxed whitespace-pre-line transition-all",
              !expanded && "line-clamp-2"
            )}>
              {d.contenu}
            </p>

            {d.contenu?.length > 120 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 mt-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {expanded ? <><ChevronUp className="w-3 h-3" /> Réduire</> : <><ChevronDown className="w-3 h-3" /> Voir tout</>}
              </button>
            )}
          </div>

          {isResponsable && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onArchive(d.id)}
                className="p-1.5 rounded-lg text-zinc-600 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                title="Archiver"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(d.id)}
                className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ArchivedCard({ d }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="p-4 rounded-xl border border-white/5 bg-white/2 hover:bg-white/4 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-zinc-400">{d.titre}</p>
          {d.campagne_tag && (
            <span className="text-[10px] text-zinc-600 border border-white/5 rounded px-1.5 py-0.5">{d.campagne_tag}</span>
          )}
        </div>
        <span className="text-[10px] text-zinc-700 flex-shrink-0">{d.mois_cycle}</span>
      </div>
      <p className={cn("text-xs text-zinc-600 leading-relaxed whitespace-pre-line", !expanded && "line-clamp-2")}>
        {d.contenu}
      </p>
      {d.contenu?.length > 100 && (
        <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-zinc-700 hover:text-zinc-500 mt-1 transition-colors">
          {expanded ? "Réduire" : "Voir plus"}
        </button>
      )}
    </div>
  );
}

export default function CommunicationDirectivesPage() {
  useTrackActivity("CommunicationDirectives");
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ titre: "", contenu: "", campagne_tag: "" });
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isResponsable = user?.role === "admin" || user?.role === "responsable_communication";

  const { data: directives = [] } = useQuery({
    queryKey: ["directives"],
    queryFn: () => base44.entities.DirectivesCom.list("-created_date", 100),
    refetchInterval: 30000,
  });

  const active = directives.filter(d => d.statut === "active");
  const archived = directives.filter(d => d.statut === "archivee");

  const handleCreate = async () => {
    if (!form.titre || !form.contenu) { toast.error("Titre et contenu requis"); return; }
    setSaving(true);
    await base44.entities.DirectivesCom.create({
      ...form, auteur_email: user?.email, mois_cycle: CURRENT_MONTH, statut: "active"
    });
    qc.invalidateQueries({ queryKey: ["directives"] });
    toast.success("Directive publiée !");
    setForm({ titre: "", contenu: "", campagne_tag: "" });
    setShowNew(false);
    setSaving(false);
  };

  const archiveMutation = useMutation({
    mutationFn: (id) => base44.entities.DirectivesCom.update(id, { statut: "archivee" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["directives"] }); toast.success("Archivée"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DirectivesCom.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["directives"] }); toast.success("Supprimée"); },
  });

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-bold text-white">Directives Board</h1>
          <p className="text-xs text-zinc-600">Briefs créatifs · Coffre-Fort des stratégies</p>
        </div>
        {isResponsable && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Directive
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Actives", value: active.length, color: "text-emerald-400", bg: "border-emerald-500/20 bg-emerald-900/10" },
            { label: "Archivées", value: archived.length, color: "text-zinc-400", bg: "border-white/8 bg-white/3" },
            { label: "Ce mois", value: directives.filter(d => d.mois_cycle === CURRENT_MONTH).length, color: "text-blue-400", bg: "border-blue-500/20 bg-blue-900/10" },
          ].map(s => (
            <div key={s.label} className={cn("ai-card rounded-xl border p-4 text-center", s.bg)}>
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Active directives */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Directives Actives</h2>
            <span className="text-xs text-zinc-600">({active.length})</span>
          </div>
          {active.length === 0 ? (
            <div className="ai-card rounded-xl border border-white/5 p-10 flex flex-col items-center gap-3 text-center">
              <Briefcase className="w-8 h-8 text-zinc-700" />
              <p className="text-sm text-zinc-600">Aucune directive active.</p>
              {isResponsable && (
                <button onClick={() => setShowNew(true)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Créer la première →
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {active.map(d => (
                  <DirectiveCard
                    key={d.id}
                    d={d}
                    isResponsable={isResponsable}
                    onArchive={() => archiveMutation.mutate(d.id)}
                    onDelete={() => deleteMutation.mutate(d.id)}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Coffre-Fort */}
        {archived.length > 0 && (
          <div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 mb-3 group"
            >
              <BookOpen className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              <h2 className="text-xs font-bold text-zinc-600 group-hover:text-zinc-400 uppercase tracking-widest transition-colors">
                Coffre-Fort des Stratégies
              </h2>
              <span className="text-xs text-zinc-700 bg-white/5 px-2 py-0.5 rounded-full">{archived.length}</span>
              {showArchived ? <ChevronUp className="w-3.5 h-3.5 text-zinc-600" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />}
            </button>
            <AnimatePresence>
              {showArchived && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2">
                    {archived.map(d => <ArchivedCard key={d.id} d={d} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Sheet Nouvelle Directive */}
      <Sheet open={showNew} onOpenChange={setShowNew}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-[#0d1018] border-l border-white/10 overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-white/10">
            <SheetTitle className="text-white">Nouvelle Directive</SheetTitle>
          </SheetHeader>
          <div className="py-5 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5">Titre *</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 transition-colors"
                placeholder="Ex: Direction Créative — Mars 2026"
                value={form.titre}
                onChange={e => setForm({ ...form, titre: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5">Tag Campagne</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 transition-colors"
                placeholder="Ex: Campagne Vidéo Mars"
                value={form.campagne_tag}
                onChange={e => setForm({ ...form, campagne_tag: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5">Contenu de la Directive *</label>
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 transition-colors resize-none h-52"
                placeholder="Décrivez la direction créative, le brief, les objectifs visuels et de communication..."
                value={form.contenu}
                onChange={e => setForm({ ...form, contenu: e.target.value })}
              />
            </div>
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setShowNew(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-500 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.titre || !form.contenu}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-semibold text-white transition-all"
              >
                {saving ? "Publication..." : "Publier la Directive"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}