import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, Instagram, MessageSquare, Plus, CheckCircle, XCircle, ChevronRight, X, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const TYPE_SUIVI_LABELS = {
  message_insta: { label: "Instagram", icon: "📸", color: "text-pink-400" },
  message_sms:   { label: "SMS",       icon: "💬", color: "text-blue-400" },
  appel:         { label: "Appel",     icon: "📞", color: "text-emerald-400" },
  rencontre:     { label: "Rencontre", icon: "🤝", color: "text-amber-400" },
  autre:         { label: "Autre",     icon: "📝", color: "text-zinc-400" },
};

const STATUT_CONFIG = {
  nouveau:  { label: "Nouveau",   color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  en_suivi: { label: "En suivi",  color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  venu:     { label: "Venu(e)",   color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  inactif:  { label: "Inactif",   color: "bg-zinc-700/20 text-zinc-600 border-zinc-700/20" },
};

const PROCHAIN_CONTACT_CONFIG = {
  a_relancer: { label: "À relancer",  color: "bg-amber-500/10 text-amber-400 border-amber-500/20",    dot: "bg-amber-400" },
  a_inviter:  { label: "À inviter",   color: "bg-violet-500/10 text-violet-400 border-violet-500/20", dot: "bg-violet-400" },
  confirme:   { label: "Confirmé",    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  en_attente: { label: "En attente",  color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",       dot: "bg-zinc-500" },
};

export default function SuiviContactPanel({ contact, user, users = [], onClose, onUpdated }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type_suivi: "message_sms", contenu: "", repondu: false, prochaine_etape: "" });
  const [saving, setSaving] = useState(false);

  const { data: suivis = [] } = useQuery({
    queryKey: ["suivis", contact.id],
    queryFn: () => base44.entities.SuiviContact.filter({ contact_id: contact.id }, "-date_suivi", 50),
  });

  const handleAddSuivi = async () => {
    setSaving(true);
    await base44.entities.SuiviContact.create({
      ...form,
      contact_id: contact.id,
      contact_nom: `${contact.prenom} ${contact.nom || ""}`.trim(),
      date_suivi: new Date().toISOString().split("T")[0],
      auteur_email: user?.email || "",
      auteur_nom: user?.full_name || "",
    });
    await base44.entities.ContactEvang.update(contact.id, {
      statut_suivi: "en_suivi",
      derniere_interaction: new Date().toISOString().split("T")[0],
    });
    queryClient.invalidateQueries({ queryKey: ["suivis", contact.id] });
    queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
    toast.success("Suivi enregistré !");
    setForm({ type_suivi: "message_sms", contenu: "", repondu: false, prochaine_etape: "" });
    setShowForm(false);
    setSaving(false);
    onUpdated?.();
  };

  const handleChangeStatut = async (statut) => {
    await base44.entities.ContactEvang.update(contact.id, { statut_suivi: statut });
    queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
    toast.success(`Statut : ${STATUT_CONFIG[statut].label}`);
    onUpdated?.();
  };

  const handleChangeProchainContact = async (val) => {
    await base44.entities.ContactEvang.update(contact.id, { statut_prochain_contact: val });
    queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
    toast.success("Action mise à jour");
    onUpdated?.();
  };

  const handleAssignResponsable = async (email) => {
    const u = users.find(u => u.email === email);
    await base44.entities.ContactEvang.update(contact.id, {
      responsable_suivi_email: email,
      responsable_suivi_nom: u?.full_name || email,
    });
    queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
    toast.success("Responsable assigné");
    onUpdated?.();
  };

  const prochain = PROCHAIN_CONTACT_CONFIG[contact.statut_prochain_contact] || PROCHAIN_CONTACT_CONFIG.a_relancer;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.02) 100%)",
          border: "1px solid rgba(255,255,255,0.09)",
          backdropFilter: "blur(36px)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xl font-black shadow-lg flex-shrink-0">
                {contact.prenom?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="text-base font-bold text-white leading-tight">{contact.prenom} {contact.nom || ""}</p>
                {contact.age && <p className="text-xs text-zinc-500 mt-0.5">{contact.age} ans</p>}
                <div className="flex flex-wrap gap-3 mt-1">
                  {contact.telephone && (
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Phone className="w-3 h-3" />{contact.telephone}
                    </span>
                  )}
                  {contact.instagram && (
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Instagram className="w-3 h-3" />{contact.instagram}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Badges rapides */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {contact.invite_fij && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">🤝 FIJ</span>
            )}
            {contact.invite_ejp && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">🤝 EJP</span>
            )}
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1", prochain.color)}>
              <span className={cn("w-1.5 h-1.5 rounded-full inline-block", prochain.dot)} />
              {prochain.label}
            </span>
            {contact.responsable_suivi_nom && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.05] text-zinc-400 border border-white/[0.08] flex items-center gap-1">
                <UserCheck className="w-2.5 h-2.5" /> {contact.responsable_suivi_nom}
              </span>
            )}
          </div>

          {/* Statut suivi */}
          <div>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Statut suivi</p>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(STATUT_CONFIG).map(([key, { label, color }]) => (
                <button
                  key={key}
                  onClick={() => handleChangeStatut(key)}
                  className={cn(
                    "text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all",
                    contact.statut_suivi === key ? color : "bg-white/[0.03] border-white/[0.06] text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Prochain contact */}
          <div className="mt-3">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Action prévue</p>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(PROCHAIN_CONTACT_CONFIG).map(([key, { label, color }]) => (
                <button
                  key={key}
                  onClick={() => handleChangeProchainContact(key)}
                  className={cn(
                    "text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all",
                    contact.statut_prochain_contact === key ? color : "bg-white/[0.03] border-white/[0.06] text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignation responsable */}
          {users.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Responsable du suivi</p>
              <select
                className="input-glass text-sm"
                value={contact.responsable_suivi_email || ""}
                onChange={(e) => handleAssignResponsable(e.target.value)}
              >
                <option value="">— Non assigné —</option>
                {users.map(u => (
                  <option key={u.id} value={u.email}>{u.full_name || u.email}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── Ajouter un suivi ── */}
        <div className="px-5 pt-4 pb-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Historique ({suivis.length})
            </p>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.85))",
                border: "1px solid rgba(99,155,255,0.35)",
                color: "#fff",
                boxShadow: "0 0 20px rgba(59,130,246,0.25)",
              }}
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="w-3.5 h-3.5" /> Nouveau suivi
            </button>
          </div>

          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="rounded-xl p-4 mb-4 space-y-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Type</label>
                      <select
                        className="input-glass text-sm"
                        value={form.type_suivi}
                        onChange={(e) => setForm({ ...form, type_suivi: e.target.value })}
                      >
                        {Object.entries(TYPE_SUIVI_LABELS).map(([key, { icon, label }]) => (
                          <option key={key} value={key}>{icon} {label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.repondu}
                          onChange={(e) => setForm({ ...form, repondu: e.target.checked })}
                          className="accent-emerald-500 w-4 h-4 rounded"
                        />
                        A répondu
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Résumé de l'échange</label>
                    <textarea
                      className="input-glass h-16 resize-none text-sm"
                      placeholder="Nous avons parlé de..."
                      value={form.contenu}
                      onChange={(e) => setForm({ ...form, contenu: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Prochaine étape</label>
                    <input
                      className="input-glass text-sm"
                      placeholder="Ex: Relancer dans 3 jours..."
                      value={form.prochaine_etape}
                      onChange={(e) => setForm({ ...form, prochaine_etape: e.target.value })}
                    />
                  </div>
                  <button
                    className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.85))",
                      border: "1px solid rgba(99,155,255,0.35)",
                      color: "#fff",
                      boxShadow: "0 0 20px rgba(59,130,246,0.2)",
                    }}
                    onClick={handleAddSuivi}
                    disabled={saving}
                  >
                    <MessageSquare className="w-4 h-4" />
                    {saving ? "Enregistrement..." : "Enregistrer le suivi"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Timeline ── */}
        <div className="px-5 py-4 space-y-1">
          {suivis.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-600">Aucun suivi enregistré</p>
              <p className="text-xs text-zinc-700 mt-1">Ajoutez le premier contact via le bouton ci-dessus</p>
            </div>
          ) : (
            suivis.map((s, idx) => {
              const t = TYPE_SUIVI_LABELS[s.type_suivi] || TYPE_SUIVI_LABELS.autre;
              return (
                <div key={s.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      {t.icon}
                    </div>
                    {idx < suivis.length - 1 && (
                      <div className="w-px flex-1 mt-1" style={{ background: "rgba(255,255,255,0.05)" }} />
                    )}
                  </div>
                  <div className="flex-1 pb-4 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-xs font-bold", t.color)}>{t.label}</span>
                      <span className="text-[10px] text-zinc-600">
                        {format(new Date(s.date_suivi), "d MMM yyyy", { locale: fr })}
                      </span>
                      {s.repondu
                        ? <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-semibold"><CheckCircle className="w-3 h-3" /> Répondu</span>
                        : <span className="flex items-center gap-0.5 text-[10px] text-zinc-600"><XCircle className="w-3 h-3" /> Sans réponse</span>
                      }
                    </div>
                    {s.contenu && (
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{s.contenu}</p>
                    )}
                    {s.prochaine_etape && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <ChevronRight className="w-3 h-3 text-amber-500 flex-shrink-0" />
                        <span className="text-[10px] text-amber-400">{s.prochaine_etape}</span>
                      </div>
                    )}
                    {s.auteur_nom && (
                      <p className="text-[10px] text-zinc-700 mt-1">par {s.auteur_nom}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}