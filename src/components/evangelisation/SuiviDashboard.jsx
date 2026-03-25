import React, { useMemo } from "react";
import { Users, TrendingUp, AlertCircle, CheckCircle2, Clock, Target } from "lucide-react";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const GlassCard = ({ children, className = "", style = {} }) => (
  <div
    className={cn("rounded-2xl p-5", className)}
    style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.02) 100%)",
      border: "1px solid rgba(255,255,255,0.09)",
      backdropFilter: "blur(36px)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.3)",
      ...style,
    }}
  >
    {children}
  </div>
);

const PROCHAIN_CONFIG = {
  a_relancer: { label: "À relancer", color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
  a_inviter:  { label: "À inviter",  color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  confirme:   { label: "Confirmé",   color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  en_attente: { label: "En attente", color: "text-zinc-400",   bg: "bg-zinc-500/10 border-zinc-500/20" },
};

export default function SuiviDashboard({ contacts, suivis }) {
  const stats = useMemo(() => {
    const total = contacts.length;
    const venusCount = contacts.filter(c => c.statut_suivi === "venu").length;
    const conversionRate = total > 0 ? Math.round((venusCount / total) * 100) : 0;

    const staleContacts = contacts.filter(c => {
      if (["venu", "inactif"].includes(c.statut_suivi)) return false;
      const last = c.derniere_interaction || c.date_contact;
      return !last || differenceInDays(new Date(), new Date(last)) >= 7;
    });

    // Par responsable
    const byResponsable = {};
    contacts.forEach(c => {
      const key = c.responsable_suivi_email || "__non_assigne__";
      const nom = c.responsable_suivi_nom || "Non assigné";
      if (!byResponsable[key]) byResponsable[key] = { nom, contacts: 0, venus: 0, suiviCount: 0 };
      byResponsable[key].contacts++;
      if (c.statut_suivi === "venu") byResponsable[key].venus++;
    });
    suivis.forEach(s => {
      const contact = contacts.find(c => c.id === s.contact_id);
      if (!contact) return;
      const key = contact.responsable_suivi_email || "__non_assigne__";
      if (byResponsable[key]) byResponsable[key].suiviCount++;
    });

    // Par action prochaine
    const byProchain = { a_relancer: 0, a_inviter: 0, confirme: 0, en_attente: 0 };
    contacts.forEach(c => {
      const k = c.statut_prochain_contact || "a_relancer";
      if (byProchain[k] !== undefined) byProchain[k]++;
    });

    return { total, venusCount, conversionRate, staleContacts, byResponsable, byProchain };
  }, [contacts, suivis]);

  const responsables = Object.entries(stats.byResponsable).sort((a, b) => b[1].contacts - a[1].contacts);

  return (
    <div className="space-y-5">
      {/* KPIs row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total contacts", value: stats.total,          color: "text-white",         icon: Users },
          { label: "Suivis actifs",  value: contacts.filter(c => c.statut_suivi === "en_suivi").length, color: "text-blue-400", icon: TrendingUp },
          { label: "Venu(e)s",       value: stats.venusCount,     color: "text-emerald-400",   icon: CheckCircle2 },
          { label: "Taux conversion",value: `${stats.conversionRate}%`, color: stats.conversionRate >= 20 ? "text-emerald-400" : "text-amber-400", icon: Target },
        ].map(({ label, value, color, icon: Icon }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <GlassCard>
              <div className="flex items-start justify-between mb-2">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-tight">{label}</p>
                <Icon className={cn("w-4 h-4 opacity-40", color)} />
              </div>
              <p className={cn("text-3xl font-black", color)}>{value}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contacts à relancer */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Contacts froids ({stats.staleContacts.length})
            </p>
          </div>
          {stats.staleContacts.length === 0 ? (
            <div className="flex items-center gap-2 py-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <p className="text-xs text-zinc-500">Tous les contacts sont actifs ✓</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stats.staleContacts.map(c => {
                const last = c.derniere_interaction || c.date_contact;
                const days = last ? differenceInDays(new Date(), new Date(last)) : null;
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 rounded-xl"
                    style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500/40 to-red-600/40 border border-white/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {c.prenom?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-200">{c.prenom} {c.nom || ""}</p>
                        {c.responsable_suivi_nom && (
                          <p className="text-[10px] text-zinc-600">{c.responsable_suivi_nom}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {days !== null ? `${days}j` : "?"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Actions prévues */}
        <GlassCard>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Actions prévues</p>
          <div className="space-y-3">
            {Object.entries(PROCHAIN_CONFIG).map(([key, { label, color, bg }]) => {
              const count = stats.byProchain[key] || 0;
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={cn("text-xs font-semibold", color)}>{label}</span>
                    <span className="text-xs font-black text-white">{count}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <motion.div
                      className={cn("h-full rounded-full", bg.split(" ")[0])}
                      style={{ border: "none" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Classement par responsable */}
      <GlassCard>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">
          Suivi par responsable
        </p>
        {responsables.length === 0 ? (
          <p className="text-sm text-zinc-600 py-4 text-center">Aucun responsable assigné</p>
        ) : (
          <div className="space-y-2">
            {responsables.map(([key, data]) => {
              const rate = data.contacts > 0 ? Math.round((data.venus / data.contacts) * 100) : 0;
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/30 to-violet-600/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {data.nom?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-200 truncate">{data.nom}</p>
                    <p className="text-[10px] text-zinc-600">
                      {data.suiviCount} suivi{data.suiviCount > 1 ? "s" : ""} · {data.venus} venu{data.venus > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-black text-white">{data.contacts}</p>
                      <p className="text-[10px] text-zinc-600">contacts</p>
                    </div>
                    <div
                      className="text-center px-2.5 py-1 rounded-lg"
                      style={{ background: rate >= 20 ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", border: `1px solid ${rate >= 20 ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}` }}
                    >
                      <p className={cn("text-sm font-black", rate >= 20 ? "text-emerald-400" : "text-amber-400")}>{rate}%</p>
                      <p className="text-[9px] text-zinc-600">conversion</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}