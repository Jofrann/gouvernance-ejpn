import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";

export default function CreateActionModal({ onClose, onCreated, editAction = null }) {
  const isEdit = !!editAction;

  const toLocalDatetime = (val) => {
    if (!val) return "";
    try {
      const d = new Date(val);
      const pad = n => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return ""; }
  };

  const [form, setForm] = useState(isEdit ? {
    titre: editAction.titre || "",
    date_action: toLocalDatetime(editAction.date_action),
    type_action: editAction.type_action || "Terrain",
    lieu: editAction.lieu || "",
    statut: editAction.statut || "Planifiée",
  } : {
    titre: "",
    date_action: "",
    type_action: "Terrain",
    lieu: "",
    statut: "Planifiée",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isEdit) {
      await base44.entities.ActionEvangelisation.update(editAction.id, form);
    } else {
      await base44.entities.ActionEvangelisation.create(form);
    }
    setLoading(false);
    onCreated();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1018] p-6 space-y-5 shadow-2xl z-10"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">{isEdit ? "Modifier l'action" : "Nouvelle Action"}</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 font-medium">Titre *</label>
            <input className="input-glass mt-1" placeholder="Ex: Sortie rue centre-ville" required
              value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 font-medium">Type *</label>
              <select className="input-glass mt-1"
                value={form.type_action} onChange={e => setForm({ ...form, type_action: e.target.value })}>
                <option value="Terrain">🚶 Terrain</option>
                <option value="Digital">📱 Digital</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium">Statut</label>
              <select className="input-glass mt-1"
                value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}>
                <option value="Planifiée">Planifiée</option>
                <option value="En cours">En cours</option>
                <option value="Terminée">Terminée</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 font-medium">Date & Heure *</label>
            <input type="datetime-local" className="input-glass mt-1" required
              value={form.date_action} onChange={e => setForm({ ...form, date_action: e.target.value })} />
          </div>

          <div>
            <label className="text-xs text-zinc-500 font-medium">Lieu</label>
            <input className="input-glass mt-1" placeholder="Ex: Place de la République"
              value={form.lieu} onChange={e => setForm({ ...form, lieu: e.target.value })} />
          </div>

          <button type="submit" disabled={loading}
            className="btn-glow-blue w-full py-2.5 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Enregistrer les modifications" : "Créer l'action"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}