import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";

const FIELDS = [
  { key: "personnes_sorties",   emoji: "👥", label: "Personnes sorties" },
  { key: "personnes_abordees",  emoji: "🗣️", label: "Personnes abordées" },
  { key: "prises_de_contact",   emoji: "📲", label: "Prises de contacts" },
  { key: "invitations_fij_ejp", emoji: "🤝", label: "Invitations (FIJ/EJP)" },
  { key: "prieres_autres",      emoji: "🙏", label: "Autres prières" },
  { key: "prieres_salut",       emoji: "😇", label: "Prières du salut" },
];

export default function CRSortieForm({ action, existingCR, user, onSaved }) {
  const [form, setForm] = useState({
    personnes_sorties: 0,
    personnes_abordees: 0,
    prises_de_contact: 0,
    invitations_fij_ejp: 0,
    prieres_autres: 0,
    prieres_salut: 0,
    observations: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingCR) {
      setForm({
        personnes_sorties: existingCR.personnes_sorties || 0,
        personnes_abordees: existingCR.personnes_abordees || 0,
        prises_de_contact: existingCR.prises_de_contact || 0,
        invitations_fij_ejp: existingCR.invitations_fij_ejp || 0,
        prieres_autres: existingCR.prieres_autres || 0,
        prieres_salut: existingCR.prieres_salut || 0,
        observations: existingCR.observations || "",
      });
    }
  }, [existingCR]);

  const handleSave = async (statut = "brouillon") => {
    setSaving(true);
    const payload = {
      ...form,
      action_id: action.id,
      action_titre: action.titre,
      action_date: action.date_action,
      redacteur_email: user?.email || "",
      redacteur_nom: user?.full_name || "",
      statut,
    };
    if (existingCR) {
      await base44.entities.CRSortie.update(existingCR.id, payload);
    } else {
      await base44.entities.CRSortie.create(payload);
    }
    // Also mark action as debrief_complete when submitted
    if (statut === "soumis") {
      await base44.entities.ActionEvangelisation.update(action.id, {
        debrief_complete: true,
        statut: "termine",
        personnes_touchees: form.personnes_abordees,
        conversions: form.prieres_salut,
      });
    }
    setSaving(false);
    toast.success(statut === "soumis" ? "CR soumis !" : "Brouillon sauvegardé");
    onSaved?.();
  };

  const isReadOnly = existingCR?.statut === "valide";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 pb-3 border-b border-white/[0.07]">
        <FileText className="w-4 h-4 text-orange-400" />
        <p className="text-sm font-semibold text-white">Compte-rendu de sortie</p>
        {existingCR?.statut && (
          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            existingCR.statut === "valide" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
            existingCR.statut === "soumis" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
            "bg-white/5 text-zinc-500 border-white/10"
          }`}>
            {existingCR.statut === "valide" ? "✓ Validé" : existingCR.statut === "soumis" ? "⏳ Soumis" : "Brouillon"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(({ key, emoji, label }) => (
          <div key={key}>
            <label className="text-xs text-zinc-500 font-medium">{emoji} {label}</label>
            <input
              type="number"
              min="0"
              disabled={isReadOnly}
              className="input-glass mt-1 text-center font-bold"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: parseInt(e.target.value) || 0 })}
            />
          </div>
        ))}
      </div>

      <div>
        <label className="text-xs text-zinc-500 font-medium">📝 Observations</label>
        <textarea
          disabled={isReadOnly}
          className="input-glass mt-1 h-20 resize-none"
          placeholder="Contexte, points positifs, difficultés rencontrées..."
          value={form.observations}
          onChange={(e) => setForm({ ...form, observations: e.target.value })}
        />
      </div>

      {!isReadOnly && (
        <div className="flex gap-2 pt-2">
          <button
            className="btn-ghost-glass flex-1 py-2 text-xs"
            onClick={() => handleSave("brouillon")}
            disabled={saving}
          >
            Sauvegarder brouillon
          </button>
          <button
            className="btn-glow-blue flex-1 py-2 flex items-center justify-center gap-2"
            onClick={() => handleSave("soumis")}
            disabled={saving}
          >
            <CheckCircle2 className="w-4 h-4" /> Soumettre le CR
          </button>
        </div>
      )}
    </div>
  );
}