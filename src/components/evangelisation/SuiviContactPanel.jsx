import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, Instagram, MessageSquare, Plus, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_SUIVI_LABELS = {
  message_insta: { label: "Instagram", icon: "📸", color: "text-pink-400" },
  message_sms:   { label: "SMS",       icon: "💬", color: "text-blue-400" },
  appel:         { label: "Appel",     icon: "📞", color: "text-emerald-400" },
  rencontre:     { label: "Rencontre", icon: "🤝", color: "text-amber-400" },
  autre:         { label: "Autre",     icon: "📝", color: "text-zinc-400" },
};

const STATUT_COLORS = {
  nouveau:   "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  en_suivi:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  venu:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  inactif:   "bg-zinc-700/20 text-zinc-600 border-zinc-700/20",
};
const STATUT_LABELS = { nouveau: "Nouveau", en_suivi: "En suivi", venu: "Venu(e)", inactif: "Inactif" };

export default function SuiviContactPanel({ contact, user, onClose, onUpdated }) {
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
    // Update contact status and last interaction
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
    toast.success(`Statut mis à jour : ${STATUT_LABELS[statut]}`);
    onUpdated?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: "#0d1018", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/[0.07]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xl font-bold">
                {contact.prenom?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-bold text-white">{contact.prenom} {contact.nom || ""}</p>
                {contact.age && <p className="text-xs text-zinc-500">{contact.age} ans</p>}
                <div className="flex flex-wrap gap-2 mt-1">
                  {contact.telephone && <span className="flex items-center gap-1 text-xs text-zinc-500"><Phone className="w-3 h-3" />{contact.telephone}</span>}
                  {contact.instagram && <span className="flex items-center gap-1 text-xs text-zinc-500"><Instagram className="w-3 h-3" />{contact.instagram}</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-lg">✕</button>
          </div>

          {/* Statut selector */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {Object.entries(STATUT_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleChangeStatut(key)}
                className={`text-xs px-3 py-1 rounded-full border font-semibold transition-all ${
                  contact.statut_suivi === key ? STATUT_COLORS[key] : "bg-white/[0.03] border-white/[0.06] text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Add suivi */}
        <div className="p-5 border-b border-white/[0.07]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Historique des suivis ({suivis.length})</p>
            <button className="btn-glow-blue px-3 py-1.5 flex items-center gap-1.5 text-xs" onClick={() => setShowForm(!showForm)}>
              <Plus className="w-3.5 h-3.5" /> Nouveau suivi
            </button>
          </div>

          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pt-2 pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-500">Type</label>
                      <select
                        className="input-glass mt-1"
                        value={form.type_suivi}
                        onChange={(e) => setForm({ ...form, type_suivi: e.target.value })}
                      >
                        {Object.entries(TYPE_SUIVI_LABELS).map(([key, { icon, label }]) => (
                          <option key={key} value={key}>{icon} {label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer pb-2">
                        <input type="checkbox" checked={form.repondu} onChange={(e) => setForm({ ...form, repondu: e.target.checked })} className="accent-emerald-500" />
                        ✅ A répondu
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Résumé de l'échange</label>
                    <textarea className="input-glass mt-1 h-16 resize-none" placeholder="Nous avons parlé de..." value={form.contenu} onChange={(e) => setForm({ ...form, contenu: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Prochaine étape</label>
                    <input className="input-glass mt-1" placeholder="Ex: Relancer dans 3 jours..." value={form.prochaine_etape} onChange={(e) => setForm({ ...form, prochaine_etape: e.target.value })} />
                  </div>
                  <button className="btn-glow-blue w-full py-2.5 flex items-center justify-center gap-2" onClick={handleAddSuivi} disabled={saving}>
                    <MessageSquare className="w-4 h-4" /> Enregistrer
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Timeline */}
        <div className="p-5 space-y-3">
          {suivis.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-6">Aucun suivi enregistré</p>
          ) : (
            suivis.map((s) => {
              const t = TYPE_SUIVI_LABELS[s.type_suivi] || TYPE_SUIVI_LABELS.autre;
              return (
                <div key={s.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-sm">{t.icon}</div>
                    <div className="w-px flex-1 bg-white/[0.05] mt-1" />
                  </div>
                  <div className="flex-1 pb-4 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold ${t.color}`}>{t.label}</span>
                      <span className="text-[10px] text-zinc-600">{format(new Date(s.date_suivi), "d MMM yyyy", { locale: fr })}</span>
                      {s.repondu ? <span className="flex items-center gap-0.5 text-[10px] text-emerald-400"><CheckCircle className="w-3 h-3" /> Répondu</span>
                        : <span className="flex items-center gap-0.5 text-[10px] text-zinc-600"><XCircle className="w-3 h-3" /> Sans réponse</span>}
                    </div>
                    {s.contenu && <p className="text-xs text-zinc-400 mt-1">{s.contenu}</p>}
                    {s.prochaine_etape && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-amber-400">
                        <ChevronRight className="w-3 h-3" /> {s.prochaine_etape}
                      </div>
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