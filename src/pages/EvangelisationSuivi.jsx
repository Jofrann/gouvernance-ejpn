import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Phone, Instagram, Clock, AlertCircle, LayoutDashboard, Users } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import SuiviContactPanel from "@/components/evangelisation/SuiviContactPanel";
import SuiviDashboard from "@/components/evangelisation/SuiviDashboard";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

// ── Design tokens (cohérents avec le reste de l'app) ──────────────────────────
const GlassCard = ({ children, className = "" }) => (
  <div
    className={cn("rounded-2xl p-5", className)}
    style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.02) 100%)",
      border: "1px solid rgba(255,255,255,0.09)",
      backdropFilter: "blur(36px)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.3)",
    }}
  >
    {children}
  </div>
);

const STATUT_CONFIG = {
  nouveau:  { label: "Nouveau",  color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  en_suivi: { label: "En suivi", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  venu:     { label: "Venu(e)",  color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  inactif:  { label: "Inactif",  color: "bg-zinc-700/20 text-zinc-600 border-zinc-700/20" },
};

const PROCHAIN_CONFIG = {
  a_relancer: { label: "À relancer", color: "text-amber-400",   dot: "bg-amber-400" },
  a_inviter:  { label: "À inviter",  color: "text-violet-400",  dot: "bg-violet-400" },
  confirme:   { label: "Confirmé",   color: "text-emerald-400", dot: "bg-emerald-400" },
  en_attente: { label: "En attente", color: "text-zinc-500",    dot: "bg-zinc-500" },
};

const STATUT_ORDER = ["nouveau", "en_suivi", "venu", "inactif"];

// ── Page principale ────────────────────────────────────────────────────────────
export default function EvangelisationSuiviPage() {
  useTrackActivity("EvangelisationSuivi");
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [view, setView] = useState("contacts"); // "contacts" | "dashboard"
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [selectedContact, setSelectedContact] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["all-contacts"],
    queryFn: () => base44.entities.ContactEvang.list("-date_contact", 500),
  });

  const { data: allSuivis = [] } = useQuery({
    queryKey: ["all-suivis"],
    queryFn: () => base44.entities.SuiviContact.list("-date_suivi", 1000),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => base44.entities.User.list(),
  });

  useEffect(() => {
    const u1 = base44.entities.ContactEvang.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
    });
    const u2 = base44.entities.SuiviContact.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["all-suivis"] });
    });
    return () => { u1(); u2(); };
  }, [queryClient]);

  const filtered = contacts.filter(c => {
    const matchSearch = !search || `${c.prenom} ${c.nom || ""} ${c.telephone || ""} ${c.instagram || ""} ${c.responsable_suivi_nom || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === "tous" || c.statut_suivi === filterStatut;
    return matchSearch && matchStatut;
  });

  const needsAttention = contacts.filter(c => {
    if (["venu", "inactif"].includes(c.statut_suivi)) return false;
    const last = c.derniere_interaction || c.date_contact;
    return !last || differenceInDays(new Date(), new Date(last)) >= 7;
  });

  const statCounts = {
    total:    contacts.length,
    en_suivi: contacts.filter(c => c.statut_suivi === "en_suivi").length,
    venu:     contacts.filter(c => c.statut_suivi === "venu").length,
    inactif:  contacts.filter(c => c.statut_suivi === "inactif").length,
  };

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-[0.25em] mb-1">Évangélisation</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Suivi Digital</h1>
          <p className="text-sm text-zinc-500 mt-0.5">CRM · Contacts terrain · Évangélisation digitale</p>
        </div>
        {/* View switcher */}
        <div
          className="flex gap-1 p-1 rounded-xl flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {[
            { key: "contacts",  label: "Contacts",  icon: Users },
            { key: "dashboard", label: "Tableau",   icon: LayoutDashboard },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                view === key
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Alerte contacts froids ──────────────────────────────────────── */}
      {needsAttention.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(255,255,255,0.01) 100%)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">
              {needsAttention.length} contact{needsAttention.length > 1 ? "s" : ""} sans interaction depuis 7+ jours
            </p>
            <p className="text-xs text-amber-400/60 mt-0.5">
              {needsAttention.slice(0, 3).map(c => `${c.prenom} ${c.nom || ""}`.trim()).join(", ")}
              {needsAttention.length > 3 ? ` et ${needsAttention.length - 3} autre(s)` : ""}
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Vue Contacts ────────────────────────────────────────────────── */}
      {view === "contacts" && (
        <>
          {/* Stats rapides cliquables */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: "total",    label: "Total",     value: statCounts.total,    color: "text-white" },
              { key: "en_suivi", label: "En suivi",  value: statCounts.en_suivi, color: "text-blue-400" },
              { key: "venu",     label: "Venu(e)s",  value: statCounts.venu,     color: "text-emerald-400" },
              { key: "inactif",  label: "Inactifs",  value: statCounts.inactif,  color: "text-zinc-600" },
            ].map((s, i) => {
              const isActive = s.key === "total" ? filterStatut === "tous" : filterStatut === s.key;
              return (
                <motion.button
                  key={s.key}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  onClick={() => setFilterStatut(s.key === "total" ? "tous" : s.key)}
                  className={cn(
                    "rounded-2xl p-4 text-left transition-all",
                    isActive
                      ? "border border-white/20"
                      : "border border-white/[0.07] hover:border-white/[0.14]"
                  )}
                  style={{
                    background: isActive
                      ? "rgba(255,255,255,0.06)"
                      : "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                  }}
                >
                  <p className={cn("text-3xl font-black", s.color)}>{s.value}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{s.label}</p>
                </motion.button>
              );
            })}
          </div>

          {/* Barre de recherche + filtres statut */}
          <GlassCard className="p-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  className="input-glass pl-9 text-sm"
                  placeholder="Nom, téléphone, Instagram, responsable..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div
                className="flex gap-1 p-1 rounded-xl flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {["tous", ...STATUT_ORDER].map(k => (
                  <button
                    key={k}
                    onClick={() => setFilterStatut(k)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                      filterStatut === k ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-300"
                    )}
                  >
                    {k === "tous" ? "Tous" : STATUT_CONFIG[k]?.label}
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Liste contacts */}
          {isLoading ? (
            <div className="py-20 text-center">
              <div className="inline-flex flex-col items-center gap-3">
                <div className="w-8 h-8 border border-blue-500/20 rounded-full relative">
                  <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin" />
                </div>
                <p className="text-xs text-zinc-600 uppercase tracking-widest">Chargement</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl py-16 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Users className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
              <p className="text-sm text-zinc-600">Aucun contact trouvé</p>
              <p className="text-xs text-zinc-700 mt-1">Modifiez vos filtres ou ajoutez des contacts depuis Sorties & CR</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((contact, i) => {
                const lastDate = contact.derniere_interaction || contact.date_contact;
                const daysSince = lastDate ? differenceInDays(new Date(), new Date(lastDate)) : null;
                const isStale = daysSince !== null && daysSince >= 7 && !["venu", "inactif"].includes(contact.statut_suivi);
                const statut = STATUT_CONFIG[contact.statut_suivi] || STATUT_CONFIG.nouveau;
                const prochain = PROCHAIN_CONFIG[contact.statut_prochain_contact];

                return (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.025, 0.3) }}
                    className="rounded-2xl p-4 flex items-start gap-3 cursor-pointer transition-all"
                    style={{
                      background: isStale
                        ? "linear-gradient(135deg, rgba(245,158,11,0.05) 0%, rgba(255,255,255,0.01) 100%)"
                        : "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                      border: `1px solid ${isStale ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.08)"}`,
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                    }}
                    onClick={() => setSelectedContact(contact)}
                    whileHover={{ borderColor: isStale ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.18)" }}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-lg">
                      {contact.prenom?.[0]?.toUpperCase() || "?"}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-white">{contact.prenom} {contact.nom || ""}</p>
                            {contact.age && <span className="text-[10px] text-zinc-600">{contact.age} ans</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {contact.telephone && (
                              <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                                <Phone className="w-3 h-3" />{contact.telephone}
                              </span>
                            )}
                            {contact.instagram && (
                              <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                                <Instagram className="w-3 h-3" />{contact.instagram}
                              </span>
                            )}
                            {contact.responsable_suivi_nom && (
                              <span className="text-[10px] text-zinc-600">
                                👤 {contact.responsable_suivi_nom}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Badges droite */}
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", statut.color)}>
                            {statut.label}
                          </span>
                          {prochain && (
                            <span className={cn("flex items-center gap-1 text-[10px] font-semibold", prochain.color)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full inline-block flex-shrink-0", prochain.dot)} />
                              {prochain.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer row */}
                      <div className="flex items-center gap-3 mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        {contact.invite_fij && <span className="text-[10px] text-orange-400 font-bold">🤝 FIJ</span>}
                        {contact.invite_ejp && <span className="text-[10px] text-orange-400 font-bold">🤝 EJP</span>}
                        {lastDate && (
                          <span className={cn("flex items-center gap-1 text-[10px] ml-auto", isStale ? "text-amber-400 font-semibold" : "text-zinc-600")}>
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {isStale
                              ? `⚠ ${daysSince}j sans suivi`
                              : `Dernier : ${format(new Date(lastDate), "d MMM", { locale: fr })}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Vue Dashboard ───────────────────────────────────────────────── */}
      {view === "dashboard" && (
        <SuiviDashboard contacts={contacts} suivis={allSuivis} />
      )}

      {/* ── Panneau de suivi ────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedContact && (
          <SuiviContactPanel
            contact={selectedContact}
            user={user}
            users={allUsers}
            onClose={() => setSelectedContact(null)}
            onUpdated={async () => {
              queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
              const res = await base44.entities.ContactEvang.filter({ id: selectedContact.id });
              if (res?.[0]) setSelectedContact(res[0]);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}