import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { X, Phone, Instagram, MessageSquare, Plus, Loader2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUTS = [
  "Nouveau (Glacé)",
  "Premier Contact Digital",
  "Création de Lien",
  "Confirmé Dimanche",
  "Transféré FI",
];

const TYPE_ICONS = {
  "Message Insta": "📸",
  "Appel": "📞",
  "WhatsApp": "💬",
  "Rencontre physique": "🤝",
};

export default function AmeSlideOver({ ame, onClose, onUpdated }) {
  const queryClient = useQueryClient();
  const [addingInteraction, setAddingInteraction] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newInteraction, setNewInteraction] = useState({
    type_interaction: "Message Insta",
    notes: "",
    date_interaction: new Date().toISOString().slice(0, 16),
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["interactions", ame.id],
    queryFn: () => base44.entities.InteractionSuivi.filter({ ame_id: ame.id }, "-date_interaction", 50),
  });

  const handleStatutChange = async (newStatut) => {
    await base44.entities.AmeVivier.update(ame.id, {
      statut_confiance: newStatut,
      est_transfere_fi: newStatut === "Transféré FI",
    });
    queryClient.invalidateQueries({ queryKey: ["evang-ames"] });
    toast.success(`Statut mis à jour : ${newStatut}`);
    onUpdated();
  };

  const handleAddInteraction = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    await base44.entities.InteractionSuivi.create({
      ame_id: ame.id,
      auteur_email: me.email,
      auteur_nom: me.full_name,
      ...newInteraction,
    });
    queryClient.invalidateQueries({ queryKey: ["interactions", ame.id] });
    setNewInteraction({ type_interaction: "Message Insta", notes: "", date_interaction: new Date().toISOString().slice(0, 16) });
    setAddingInteraction(false);
    setLoading(false);
    toast.success("Interaction enregistrée !");
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#0d1018] border-l border-white/10 flex flex-col"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">{ame.nom_prenom}</h2>
            {ame.age && <p className="text-xs text-zinc-500 mt-0.5">{ame.age} ans</p>}
            <div className="flex items-center gap-3 mt-2">
              {ame.telephone && (
                <a href={`tel:${ame.telephone}`} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
                  <Phone className="w-3 h-3" /> {ame.telephone}
                </a>
              )}
              {ame.instagram && (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Instagram className="w-3 h-3" /> @{ame.instagram.replace("@", "")}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Statut tunnel */}
        <div className="p-5 border-b border-white/[0.06] flex-shrink-0">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Tunnel de confiance</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUTS.map(s => (
              <button
                key={s}
                onClick={() => handleStatutChange(s)}
                className={cn(
                  "text-[10px] px-2 py-1 rounded-full border font-medium transition-all",
                  ame.statut_confiance === s
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                    : "bg-white/[0.03] border-white/[0.07] text-zinc-600 hover:text-zinc-400"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Interactions */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Historique</p>
            <button onClick={() => setAddingInteraction(!addingInteraction)}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
              <Plus className="w-3 h-3" /> Ajouter
            </button>
          </div>

          {addingInteraction && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500">Type</label>
                  <select className="input-glass mt-1 text-sm"
                    value={newInteraction.type_interaction}
                    onChange={e => setNewInteraction({ ...newInteraction, type_interaction: e.target.value })}>
                    {Object.keys(TYPE_ICONS).map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500">Date</label>
                  <input type="datetime-local" className="input-glass mt-1 text-sm"
                    value={newInteraction.date_interaction}
                    onChange={e => setNewInteraction({ ...newInteraction, date_interaction: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500">Notes</label>
                <textarea className="input-glass mt-1 h-20 resize-none text-sm"
                  placeholder="Ce qui s'est passé, ses réactions, prochaine étape..."
                  value={newInteraction.notes}
                  onChange={e => setNewInteraction({ ...newInteraction, notes: e.target.value })} />
              </div>
              <button onClick={handleAddInteraction} disabled={loading}
                className="btn-glow-blue w-full py-2 flex items-center justify-center gap-2 text-sm">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
              </button>
            </div>
          )}

          {interactions.length === 0 && !addingInteraction && (
            <div className="py-8 text-center">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 text-zinc-700" />
              <p className="text-xs text-zinc-600">Aucune interaction enregistrée</p>
            </div>
          )}

          <div className="space-y-2">
            {interactions.map(interaction => (
              <div key={interaction.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{TYPE_ICONS[interaction.type_interaction]}</span>
                  <span className="text-xs font-medium text-zinc-300">{interaction.type_interaction}</span>
                  <span className="text-[10px] text-zinc-600 ml-auto">
                    {format(new Date(interaction.date_interaction), "d MMM · HH'h'mm", { locale: fr })}
                  </span>
                </div>
                {interaction.notes && (
                  <p className="text-xs text-zinc-500 leading-relaxed">{interaction.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
}