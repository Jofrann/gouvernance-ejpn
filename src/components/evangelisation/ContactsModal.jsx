import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Phone, Instagram, UserCheck, UserX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUT_COLORS = {
  nouveau:   "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  en_suivi:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  venu:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  inactif:   "bg-zinc-700/20 text-zinc-600 border-zinc-700/20",
};
const STATUT_LABELS = { nouveau: "Nouveau", en_suivi: "En suivi", venu: "Venu(e)", inactif: "Inactif" };

const EMPTY_FORM = { prenom: "", nom: "", age: "", telephone: "", instagram: "", invite_fij: false, invite_ejp: false, notes: "" };

export default function ContactsModal({ action, user, onClose }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-action", action.id],
    queryFn: () => base44.entities.ContactEvang.filter({ action_id: action.id }, "-created_date", 100),
  });

  const handleAdd = async () => {
    if (!form.prenom.trim()) { toast.error("Le prénom est requis"); return; }
    setSaving(true);
    await base44.entities.ContactEvang.create({
      ...form,
      age: parseInt(form.age) || undefined,
      action_id: action.id,
      date_contact: action.date_action,
      statut_suivi: "nouveau",
    });
    queryClient.invalidateQueries({ queryKey: ["contacts-action", action.id] });
    queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
    toast.success("Contact ajouté !");
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.ContactEvang.delete(id);
    queryClient.invalidateQueries({ queryKey: ["contacts-action", action.id] });
    queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
    toast.success("Contact supprimé");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.97 }}
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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-widest mb-0.5">Contacts · {action.titre}</p>
            <p className="text-xs text-zinc-500">{format(new Date(action.date_action), "d MMMM yyyy", { locale: fr })}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{
                background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.85))",
                border: "1px solid rgba(99,155,255,0.35)",
                color: "#fff",
                boxShadow: "0 0 16px rgba(59,130,246,0.2)",
              }}
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Prénom *</label>
                    <input className="input-glass text-sm" placeholder="Jean" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Nom</label>
                    <input className="input-glass text-sm" placeholder="Dupont" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Âge</label>
                    <input type="number" className="input-glass text-sm" placeholder="22" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">📱 Téléphone</label>
                    <input className="input-glass text-sm" placeholder="06..." value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">📸 Instagram</label>
                    <input className="input-glass text-sm" placeholder="@username" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                    <input type="checkbox" checked={form.invite_fij} onChange={(e) => setForm({ ...form, invite_fij: e.target.checked })} className="accent-orange-500" />
                    🤝 Invité FIJ
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                    <input type="checkbox" checked={form.invite_ejp} onChange={(e) => setForm({ ...form, invite_ejp: e.target.checked })} className="accent-orange-500" />
                    🤝 Invité EJP
                  </label>
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Notes</label>
                  <textarea className="input-glass mt-1 h-16 resize-none" placeholder="Observations..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <button
                  className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.85))",
                    border: "1px solid rgba(99,155,255,0.35)",
                    color: "#fff",
                    boxShadow: "0 0 20px rgba(59,130,246,0.2)",
                  }}
                  onClick={handleAdd}
                  disabled={saving}
                >
                  <UserCheck className="w-4 h-4" /> {saving ? "Enregistrement..." : "Enregistrer le contact"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contact list */}
        <div className="px-5 py-4 space-y-2">
          {contacts.length === 0 ? (
            <div className="text-center py-10 text-zinc-600 text-sm">Aucun contact enregistré pour cette sortie</div>
          ) : (
            contacts.map((c) => (
              <div
                key={c.id}
                className="rounded-xl p-3 flex items-start gap-3 transition-all"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                  {c.prenom?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{c.prenom} {c.nom || ""}</p>
                    {c.age && <span className="text-xs text-zinc-600">{c.age} ans</span>}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUT_COLORS[c.statut_suivi]}`}>
                      {STATUT_LABELS[c.statut_suivi]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    {c.telephone && <span className="flex items-center gap-1 text-xs text-zinc-500"><Phone className="w-3 h-3" />{c.telephone}</span>}
                    {c.instagram && <span className="flex items-center gap-1 text-xs text-zinc-500"><Instagram className="w-3 h-3" />{c.instagram}</span>}
                    {c.invite_fij && <span className="text-[10px] text-orange-400 font-semibold">🤝 FIJ</span>}
                    {c.invite_ejp && <span className="text-[10px] text-orange-400 font-semibold">🤝 EJP</span>}
                  </div>
                  {c.notes && <p className="text-xs text-zinc-600 mt-1 truncate">{c.notes}</p>}
                </div>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 text-zinc-700 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}