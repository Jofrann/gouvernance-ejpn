import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  Archive, Crown, Plus, PenTool, Eye, BookOpen,
  Send, ChevronDown, Search, Filter, Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const GlassCard = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.45 }}
    className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px) saturate(1.4)" }}
  >{children}</motion.div>
);

const TYPE_CONFIG = {
  vision: { label: "Vision", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  directive: { label: "Directive", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  correction: { label: "Correction", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  nomination: { label: "Nomination", color: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
};

const STATUT_CONFIG = {
  brouillon: { label: "Brouillon", color: "text-zinc-500" },
  publie: { label: "Publié", color: "text-emerald-400" },
  archive: { label: "Archivé", color: "text-zinc-600" },
};

function DecretCard({ decret, onPublish, onArchive, isAdmin }) {
  const [expanded, setExpanded] = useState(false);
  const typeCfg = TYPE_CONFIG[decret.type] || TYPE_CONFIG.directive;
  const statutCfg = STATUT_CONFIG[decret.statut] || STATUT_CONFIG.brouillon;

  return (
    <div className="rounded-2xl border border-white/[0.07] overflow-hidden hover:border-white/[0.12] transition-all" style={{ background: "rgba(255,255,255,0.02)" }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4 flex items-start gap-3">
        <PenTool className="w-4 h-4 text-rose-400/60 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${typeCfg.color}`}>
              {typeCfg.label}
            </span>
            <span className={`text-[10px] font-semibold ${statutCfg.color}`}>{statutCfg.label}</span>
          </div>
          <p className="text-sm font-bold text-white truncate">{decret.titre}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">
            {decret.created_date ? format(new Date(decret.created_date), "d MMM yyyy 'à' HH:mm", { locale: fr }) : "—"}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-600 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5">
          <p className="text-sm text-zinc-300 leading-relaxed mt-3 whitespace-pre-wrap">{decret.contenu}</p>
          {isAdmin && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {decret.statut === "brouillon" && (
                <button
                  onClick={() => onPublish(decret.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300 hover:bg-emerald-500/30 transition-all"
                >
                  <Send className="w-3 h-3" />
                  Publier
                </button>
              )}
              {decret.statut === "publie" && (
                <button
                  onClick={() => onArchive(decret.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-500/10 border border-zinc-500/20 text-xs text-zinc-400 hover:bg-zinc-500/20 transition-all"
                >
                  <Archive className="w-3 h-3" />
                  Archiver
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const EMPTY_DECRET = { titre: "", contenu: "", type: "directive", statut: "brouillon" };

export default function TroneArchivesPage() {
  useTrackActivity("TroneArchives");
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_DECRET);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("tous");
  const [statutFilter, setStatutFilter] = useState("tous");

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: decrets = [] } = useQuery({
    queryKey: ["decrets"],
    queryFn: () => base44.entities.Decret.list("-created_date", 100),
  });

  const createDecret = useMutation({
    mutationFn: (data) => base44.entities.Decret.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["decrets"] }); setForm(EMPTY_DECRET); setShowForm(false); },
  });

  const updateDecret = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Decret.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decrets"] }),
  });

  const isAdmin = user?.role === "admin";

  const filtered = decrets.filter(d => {
    const s = search.toLowerCase();
    const searchOk = !s || d.titre?.toLowerCase().includes(s) || d.contenu?.toLowerCase().includes(s);
    const typeOk = typeFilter === "tous" || d.type === typeFilter;
    const statutOk = statutFilter === "tous" || d.statut === statutFilter;
    return searchOk && typeOk && statutOk;
  });

  const publies = decrets.filter(d => d.statut === "publie").length;
  const brouillons = decrets.filter(d => d.statut === "brouillon").length;
  const archives = decrets.filter(d => d.statut === "archive").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-amber-400" />
              <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-[0.25em]">Niveau I — Direction Souveraine</p>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Archives & Décrets</h1>
            <p className="text-sm text-zinc-500 mt-1">Registre immuable des directions et visions validées</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-sm text-rose-300 hover:bg-rose-500/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nouveau Décret
            </button>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Publiés", value: publies, color: "text-emerald-400" },
          { label: "Brouillons", value: brouillons, color: "text-amber-400" },
          { label: "Archivés", value: archives, color: "text-zinc-500" },
        ].map(({ label, value, color }, i) => (
          <GlassCard key={label} delay={0.05 + i * 0.05}>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <GlassCard delay={0}>
          <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-400" />
            Rédiger un nouveau décret
          </p>
          <div className="space-y-3">
            <input
              value={form.titre}
              onChange={e => setForm({ ...form, titre: e.target.value })}
              placeholder="Titre du décret..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none"
            />
            <div className="flex gap-2">
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-300 outline-none"
              >
                {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select
                value={form.statut}
                onChange={e => setForm({ ...form, statut: e.target.value })}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-300 outline-none"
              >
                <option value="brouillon">Sauvegarder en brouillon</option>
                <option value="publie">Publier immédiatement</option>
              </select>
            </div>
            <textarea
              value={form.contenu}
              onChange={e => setForm({ ...form, contenu: e.target.value })}
              placeholder="Contenu du décret, vision, directive ou nomination..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none resize-none h-32"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-500 hover:text-white transition-colors">Annuler</button>
              <button
                onClick={() => createDecret.mutate({ ...form, auteur_email: user?.email })}
                disabled={!form.titre || !form.contenu || createDecret.isPending}
                className="px-4 py-2 rounded-xl bg-rose-500/30 border border-rose-500/40 text-sm text-rose-200 hover:bg-rose-500/40 disabled:opacity-50 transition-all"
              >
                {createDecret.isPending ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-48 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un décret..."
            className="bg-transparent text-xs text-zinc-300 placeholder:text-zinc-600 outline-none flex-1"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-400 outline-none"
        >
          <option value="tous">Tous les types</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select
          value={statutFilter}
          onChange={e => setStatutFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-400 outline-none"
        >
          <option value="tous">Tous les statuts</option>
          {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </motion.div>

      {/* Decrets list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <GlassCard delay={0.3} className="text-center py-12">
            <BookOpen className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Aucun décret enregistré</p>
            {isAdmin && <p className="text-xs text-zinc-600 mt-1">Cliquez sur "Nouveau Décret" pour commencer</p>}
          </GlassCard>
        ) : filtered.map(decret => (
          <DecretCard
            key={decret.id}
            decret={decret}
            isAdmin={isAdmin}
            onPublish={(id) => updateDecret.mutate({ id, data: { statut: "publie" } })}
            onArchive={(id) => updateDecret.mutate({ id, data: { statut: "archive" } })}
          />
        ))}
      </div>
    </div>
  );
}