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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: "#0d1018", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
          <div>
            <p className="text-sm font-bold text-white">📋 Contacts — {action.titre}</p>
            <p className="text-xs text-zinc-500">{format(new Date(action.date_action), "d MMMM yyyy", { locale: fr })}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-glow-blue px-3 py-1.5 flex items-center gap-1.5 text-xs"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="border-b border-white/[0.07] overflow-hidden"
            >
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500">Prénom *</label>
                    <input className="input-glass mt-1" placeholder="Jean" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Nom</label>
                    <input className="input-glass mt-1" placeholder="Dupont" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Âge</label>
                    <input type="number" className="input-glass mt-1" placeholder="22" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">📱 Téléphone</label>
                    <input className="input-glass mt-1" placeholder="06..." value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-zinc-500">📸 Instagram</label>
                    <input className="input-glass mt-1" placeholder="@username" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
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
                <button className="btn-glow-blue w-full py-2.5 flex items-center justify-center gap-2" onClick={handleAdd} disabled={saving}>
                  <UserCheck className="w-4 h-4" /> Enregistrer le contact
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contact list */}
        <div className="p-5 space-y-3">
          {contacts.length === 0 ? (
            <div className="text-center py-10 text-zinc-600 text-sm">Aucun contact enregistré pour cette sortie</div>
          ) : (
            contacts.map((c) => (
              <div key={c.id} className="rounded-xl border border-white/[0.07] p-3 flex items-start gap-3 hover:border-white/[0.14] transition-all">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
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