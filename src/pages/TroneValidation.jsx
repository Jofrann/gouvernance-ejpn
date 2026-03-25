import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  FileCheck, Crown, CheckCircle2, XCircle, Clock,
  ChevronRight, AlertCircle, MessageSquare, Filter
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

const POLE_LABELS = {
  familles_impact: "Familles d'Impact", formation: "Formation",
  evangelisation: "Évangélisation", communication: "Communication", general: "Général"
};
const POLE_COLORS = {
  familles_impact: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  formation: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  evangelisation: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  communication: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  general: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"
};

const STATUS_CONFIG = {
  soumise: { label: "En attente", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Clock },
  approuvee: { label: "Approuvée", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
  rejetee: { label: "Rejetée", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: XCircle },
  brouillon: { label: "Brouillon", color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20", icon: AlertCircle },
};

function RecoCard({ reco, onAction, user }) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState(reco.commentaire_trone || "");
  const cfg = STATUS_CONFIG[reco.statut] || STATUS_CONFIG.brouillon;
  const Icon = cfg.icon;
  const isAdmin = user?.role === "admin";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.07] p-5 hover:border-white/[0.12] transition-all"
      style={{ background: "rgba(255,255,255,0.02)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
              <Icon className="w-3 h-3" />
              {cfg.label}
            </span>
            <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${POLE_COLORS[reco.pole_concerne] || POLE_COLORS.general}`}>
              {POLE_LABELS[reco.pole_concerne] || reco.pole_concerne}
            </span>
          </div>
          <h3 className="text-sm font-bold text-white">{reco.titre}</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Par {reco.auteur_email} · {reco.created_date ? format(new Date(reco.created_date), "d MMM yyyy", { locale: fr }) : "—"}
          </p>
        </div>
      </div>

      <p className="text-sm text-zinc-400 leading-relaxed mb-3">{reco.contenu}</p>

      {reco.commentaire_trone && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 mb-3">
          <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider mb-1">Commentaire du Trône</p>
          <p className="text-xs text-zinc-300">{reco.commentaire_trone}</p>
        </div>
      )}

      {showComment && (
        <div className="mb-3 space-y-2">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Ajouter un commentaire ou une directive..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none resize-none h-20"
          />
        </div>
      )}

      {isAdmin && reco.statut === "soumise" && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowComment(!showComment)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-zinc-400 hover:text-white hover:border-white/20 transition-all"
          >
            <MessageSquare className="w-3 h-3" />
            Commenter
          </button>
          <button
            onClick={() => onAction(reco.id, "approuvee", comment)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300 hover:bg-emerald-500/30 transition-all"
          >
            <CheckCircle2 className="w-3 h-3" />
            Approuver
          </button>
          <button
            onClick={() => onAction(reco.id, "rejetee", comment)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 hover:bg-red-500/20 transition-all"
          >
            <XCircle className="w-3 h-3" />
            Rejeter
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function TroneValidationPage() {
  useTrackActivity("TroneValidation");
  const qc = useQueryClient();
  const [filter, setFilter] = useState("soumise");
  const [poleFilter, setPoleFilter] = useState("tous");

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: recommandations = [] } = useQuery({
    queryKey: ["recommandations"],
    queryFn: () => base44.entities.Recommandation.list("-created_date", 100),
  });

  useEffect(() => {
    const unsub = base44.entities.Recommandation.subscribe(() =>
      qc.invalidateQueries({ queryKey: ["recommandations"] })
    );
    return unsub;
  }, [qc]);

  const updateReco = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Recommandation.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recommandations"] }),
  });

  const handleAction = (id, statut, commentaire) => {
    updateReco.mutate({
      id,
      data: { statut, commentaire_trone: commentaire || undefined, date_decision: new Date().toISOString().split("T")[0] }
    });
  };

  const filtered = recommandations.filter(r => {
    const statusOk = filter === "tous" || r.statut === filter;
    const poleOk = poleFilter === "tous" || r.pole_concerne === poleFilter;
    return statusOk && poleOk;
  });

  const enAttente = recommandations.filter(r => r.statut === "soumise").length;
  const approuvees = recommandations.filter(r => r.statut === "approuvee").length;
  const rejetees = recommandations.filter(r => r.statut === "rejetee").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Crown className="w-4 h-4 text-amber-400" />
          <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-[0.25em]">Niveau I — Direction Souveraine</p>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Bureau de Validation</h1>
        <p className="text-sm text-zinc-500 mt-1">Réception et validation des recommandations stratégiques</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "En attente", value: enAttente, color: "text-amber-400", icon: Clock },
          { label: "Approuvées", value: approuvees, color: "text-emerald-400", icon: CheckCircle2 },
          { label: "Rejetées", value: rejetees, color: "text-red-400", icon: XCircle },
        ].map(({ label, value, color, icon: Icon }, i) => (
          <GlassCard key={label} delay={0.05 + i * 0.05}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-3xl font-black ${color}`}>{value}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{label}</p>
              </div>
              <Icon className={`w-5 h-5 ${color} opacity-40`} />
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1 p-1 rounded-xl border border-white/[0.07]" style={{ background: "rgba(255,255,255,0.02)" }}>
          {["tous", "soumise", "approuvee", "rejetee", "brouillon"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${filter === s ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-400"}`}
            >
              {s === "tous" ? "Tous" : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
        <select
          value={poleFilter}
          onChange={e => setPoleFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-400 outline-none"
        >
          <option value="tous">Tous les pôles</option>
          {Object.entries(POLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </motion.div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <GlassCard delay={0.3} className="text-center py-12">
            <FileCheck className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Aucune recommandation à afficher</p>
          </GlassCard>
        ) : filtered.map((reco, i) => (
          <RecoCard key={reco.id} reco={reco} onAction={handleAction} user={user} />
        ))}
      </div>
    </div>
  );
}