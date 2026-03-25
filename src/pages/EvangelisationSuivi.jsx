import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Filter, Phone, Instagram, AlertCircle, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import SuiviContactPanel from "@/components/evangelisation/SuiviContactPanel";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const STATUT_COLORS = {
  nouveau:   "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  en_suivi:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  venu:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  inactif:   "bg-zinc-700/20 text-zinc-600 border-zinc-700/20",
};
const STATUT_LABELS = { nouveau: "Nouveau", en_suivi: "En suivi", venu: "Venu(e)", inactif: "Inactif" };
const STATUT_ORDER = ["nouveau", "en_suivi", "venu", "inactif"];

export default function EvangelisationSuiviPage() {
  useTrackActivity("EvangelisationSuivi");
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [selectedContact, setSelectedContact] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["all-contacts"],
    queryFn: () => base44.entities.ContactEvang.list("-date_contact", 500),
  });

  useEffect(() => {
    const unsub = base44.entities.ContactEvang.subscribe(() => queryClient.invalidateQueries({ queryKey: ["all-contacts"] }));
    const unsub2 = base44.entities.SuiviContact.subscribe(() => queryClient.invalidateQueries({ queryKey: ["all-contacts"] }));
    return () => { unsub(); unsub2(); };
  }, [queryClient]);

  const filtered = contacts.filter(c => {
    const matchSearch = !search || `${c.prenom} ${c.nom || ""} ${c.telephone || ""} ${c.instagram || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === "tous" || c.statut_suivi === filterStatut;
    return matchSearch && matchStatut;
  });

  // Contacts needing attention (no interaction in 7+ days, not "venu" or "inactif")
  const needsAttention = contacts.filter(c => {
    if (["venu", "inactif"].includes(c.statut_suivi)) return false;
    const lastDate = c.derniere_interaction || c.date_contact;
    if (!lastDate) return true;
    return differenceInDays(new Date(), new Date(lastDate)) >= 7;
  });

  // Stats
  const stats = {
    total: contacts.length,
    nouveau: contacts.filter(c => c.statut_suivi === "nouveau").length,
    en_suivi: contacts.filter(c => c.statut_suivi === "en_suivi").length,
    venu: contacts.filter(c => c.statut_suivi === "venu").length,
    inactif: contacts.filter(c => c.statut_suivi === "inactif").length,
  };

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-[0.25em] mb-1">Évangélisation</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Suivi Digital</h1>
        <p className="text-sm text-zinc-500 mt-0.5">CRM · Contacts terrain · Évangélisation digitale</p>
      </div>

      {/* Attention alert */}
      {needsAttention.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">
              {needsAttention.length} contact{needsAttention.length > 1 ? "s" : ""} sans interaction depuis 7+ jours
            </p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              {needsAttention.slice(0, 3).map(c => `${c.prenom} ${c.nom || ""}`).join(", ")}
              {needsAttention.length > 3 ? ` et ${needsAttention.length - 3} autre(s)` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: "total",    label: "Total contacts",  color: "text-zinc-300",   value: stats.total },
          { key: "en_suivi", label: "En suivi",        color: "text-blue-400",   value: stats.en_suivi },
          { key: "venu",     label: "Venu(e)s",        color: "text-emerald-400", value: stats.venu },
          { key: "inactif",  label: "Inactifs",        color: "text-zinc-600",   value: stats.inactif },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilterStatut(s.key === "total" ? "tous" : s.key)}
            className={cn(
              "rounded-xl border p-4 text-left transition-all",
              (s.key === "total" ? filterStatut === "tous" : filterStatut === s.key)
                ? "border-white/20 bg-white/[0.05]"
                : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]"
            )}
          >
            <p className={cn("text-2xl font-black", s.color)}>{s.value}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input-glass pl-9"
            placeholder="Rechercher un contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          {["tous", ...STATUT_ORDER].map(k => (
            <button
              key={k}
              onClick={() => setFilterStatut(k)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                filterStatut === k ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-300"
              )}
            >
              {k === "tous" ? "Tous" : STATUT_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Contact list */}
      {isLoading ? (
        <div className="text-center py-20 text-zinc-600">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/[0.07] py-16 text-center">
          <p className="text-zinc-600 text-sm">Aucun contact trouvé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((contact, i) => {
            const lastDate = contact.derniere_interaction || contact.date_contact;
            const daysSince = lastDate ? differenceInDays(new Date(), new Date(lastDate)) : null;
            const isStale = daysSince !== null && daysSince >= 7 && !["venu", "inactif"].includes(contact.statut_suivi);

            return (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={cn(
                  "rounded-xl border p-4 flex items-start gap-3 cursor-pointer transition-all hover:border-white/[0.15]",
                  isStale ? "border-amber-500/15 bg-amber-500/[0.03]" : "border-white/[0.07] bg-white/[0.02]"
                )}
                onClick={() => setSelectedContact(contact)}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {contact.prenom?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{contact.prenom} {contact.nom || ""}</p>
                    {contact.age && <span className="text-xs text-zinc-600">{contact.age} ans</span>}
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", STATUT_COLORS[contact.statut_suivi])}>
                      {STATUT_LABELS[contact.statut_suivi]}
                    </span>
                    {contact.invite_fij && <span className="text-[10px] text-orange-400 font-semibold">🤝 FIJ</span>}
                    {contact.invite_ejp && <span className="text-[10px] text-orange-400 font-semibold">🤝 EJP</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {contact.telephone && <span className="flex items-center gap-1 text-xs text-zinc-600"><Phone className="w-3 h-3" />{contact.telephone}</span>}
                    {contact.instagram && <span className="flex items-center gap-1 text-xs text-zinc-600"><Instagram className="w-3 h-3" />{contact.instagram}</span>}
                  </div>
                  {contact.date_contact && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className={cn("w-3 h-3", isStale ? "text-amber-500" : "text-zinc-600")} />
                      <span className={cn("text-[10px]", isStale ? "text-amber-400 font-semibold" : "text-zinc-600")}>
                        {isStale
                          ? `⚠ Pas de suivi depuis ${daysSince}j`
                          : lastDate ? `Dernière interaction : ${format(new Date(lastDate), "d MMM", { locale: fr })}` : `Contacté le ${format(new Date(contact.date_contact), "d MMM yyyy", { locale: fr })}`}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Suivi Panel */}
      <AnimatePresence>
        {selectedContact && (
          <SuiviContactPanel
            contact={selectedContact}
            user={user}
            onClose={() => setSelectedContact(null)}
            onUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
              // Refresh the selected contact
              base44.entities.ContactEvang.filter({ id: selectedContact.id }).then(res => {
                if (res?.[0]) setSelectedContact(res[0]);
              });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}