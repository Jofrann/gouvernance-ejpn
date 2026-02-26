import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Users, Home, GraduationCap, Globe, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const POLE_CONFIG = [
  { key: "familles_impact", label: "Familles d'Impact", icon: Home, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", roles: ["pilote_fi", "copilote_fi", "responsable_fi"] },
  { key: "formation", label: "Formation", icon: GraduationCap, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", roles: ["etudiant", "responsable_formation"] },
  { key: "evangelisation", label: "Évangélisation", icon: Globe, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", roles: ["agent_terrain", "agent_virtuel", "responsable_evangelisation"] },
  { key: "communication", label: "Communication", icon: Megaphone, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", roles: ["producteur", "createur", "responsable_communication"] },
];

const GlassCard = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}
    className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px) saturate(1.4)" }}
  >{children}</motion.div>
);

export default function GouvAllocationPage() {
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });
  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres-all"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });

  const totalUsers = users.filter(u => u.role !== "admin").length;

  const poleStats = useMemo(() => POLE_CONFIG.map(p => {
    const poleUsers = users.filter(u => p.roles.includes(u.role));
    return { ...p, count: poleUsers.length, users: poleUsers };
  }), [users]);

  const fiStats = useMemo(() => familles.map(fi => {
    const fiMembres = membres.filter(m => m.famille_impact_id === fi.id);
    const taux = Math.round((fiMembres.length / (fi.objectif_membres || 12)) * 100);
    return { fi, membres: fiMembres.length, objectif: fi.objectif_membres || 12, taux };
  }), [familles, membres]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Gouvernance</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Planification Opérationnelle</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Allocation des ressources humaines par pôle</p>
      </motion.div>

      {/* Global banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="relative rounded-2xl border border-white/[0.08] px-6 py-5 overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.06) 100%)", backdropFilter: "blur(24px)" }}
      >
        <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at 5% 50%, rgba(59,130,246,0.3) 0%, transparent 60%)" }} />
        <div className="relative flex flex-wrap items-center gap-8">
          <div>
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Effectif Total Opérationnel</p>
            <p className="text-4xl font-black text-white">{totalUsers}</p>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div>
            <p className="text-2xl font-black text-emerald-400">{familles.filter(f => f.status === "active").length}</p>
            <p className="text-xs text-zinc-500">FI Actives</p>
          </div>
          <div>
            <p className="text-2xl font-black text-blue-400">{membres.length}</p>
            <p className="text-xs text-zinc-500">Membres suivis</p>
          </div>
        </div>
      </motion.div>

      {/* Pole allocation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {poleStats.map((p, i) => {
          const Icon = p.icon;
          const share = totalUsers > 0 ? Math.round((p.count / totalUsers) * 100) : 0;
          return (
            <GlassCard key={p.key} delay={0.15 + i * 0.05}>
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("p-2.5 rounded-xl border", p.bg)}>
                  <Icon className={cn("w-5 h-5", p.color)} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{p.label}</p>
                  <p className="text-xs text-zinc-500">{p.count} agent{p.count !== 1 ? "s" : ""} · {share}% des effectifs</p>
                </div>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
                <div className={cn("h-full rounded-full transition-all duration-700", p.color.replace("text-", "bg-").replace("-400", "-500/60"))} style={{ width: `${share}%` }} />
              </div>
              <div className="space-y-1.5">
                {p.users.slice(0, 5).map(u => (
                  <div key={u.id} className="flex items-center gap-2 py-1">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">
                      {(u.full_name || u.email || "?")[0].toUpperCase()}
                    </div>
                    <span className="text-xs text-zinc-400 truncate flex-1">{u.full_name || u.email}</span>
                    <Badge className="text-[9px] bg-white/5 text-zinc-500 border border-white/10">{u.role?.replace(/_/g, " ")}</Badge>
                  </div>
                ))}
                {p.users.length > 5 && <p className="text-[10px] text-zinc-600 text-center">+{p.users.length - 5} autres</p>}
                {p.users.length === 0 && <p className="text-xs text-zinc-600 py-2 text-center">Aucun agent affecté</p>}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* FI capacity */}
      <GlassCard delay={0.4}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">Familles d'Impact</p>
        <p className="text-sm font-semibold text-white mb-4">Capacité & Taux de remplissage</p>
        {fiStats.length === 0 ? (
          <p className="text-sm text-zinc-600 py-8 text-center">Aucune Famille d'Impact créée</p>
        ) : (
          <div className="space-y-3">
            {fiStats.map(({ fi, membres: nb, objectif, taux }) => (
              <div key={fi.id}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <div>
                    <span className="font-medium text-zinc-200">{fi.name}</span>
                    {fi.campus && <span className="text-xs text-zinc-500 ml-2">{fi.campus}</span>}
                  </div>
                  <span className={cn("text-xs font-black", taux >= 80 ? "text-emerald-400" : taux >= 50 ? "text-amber-400" : "text-red-400")}>
                    {nb}/{objectif} ({taux}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", taux >= 80 ? "bg-emerald-500/60" : taux >= 50 ? "bg-amber-500/60" : "bg-red-500/60")}
                    style={{ width: `${Math.min(taux, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}