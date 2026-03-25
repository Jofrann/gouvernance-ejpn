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

const fieldStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "0.75rem",
  color: "rgba(255,255,255,0.9)",
  padding: "0.625rem 0.875rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
  colorScheme: "dark",
  textAlign: "center",
  fontWeight: "900",
  fontSize: "1.125rem",
};

const textareaStyle = {
  ...fieldStyle,
  textAlign: "left",
  fontWeight: "400",
  fontSize: "0.875rem",
  height: "5rem",
  resize: "none",
};

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
            <label style={{ display: "block", fontSize: "0.625rem", fontWeight: 700, color: "rgba(113,128,150,0.9)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.375rem" }}>
              {emoji} {label}
            </label>
            <input
              type="number"
              min="0"
              disabled={isReadOnly}
              style={{ ...fieldStyle, opacity: isReadOnly ? 0.5 : 1 }}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: parseInt(e.target.value) || 0 })}
            />
          </div>
        ))}
      </div>

      <div>
        <label style={{ display: "block", fontSize: "0.625rem", fontWeight: 700, color: "rgba(113,128,150,0.9)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.375rem" }}>
          📝 Observations
        </label>
        <textarea
          disabled={isReadOnly}
          style={{ ...textareaStyle, opacity: isReadOnly ? 0.5 : 1 }}
          placeholder="Contexte, points positifs, difficultés rencontrées..."
          value={form.observations}
          onChange={(e) => setForm({ ...form, observations: e.target.value })}
        />
      </div>

      {!isReadOnly && (
        <div className="flex gap-2 pt-2">
          <button
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.65)" }}
            onClick={() => handleSave("brouillon")}
            disabled={saving}
          >
            Sauvegarder brouillon
          </button>
          <button
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.85))", border: "1px solid rgba(99,155,255,0.35)", color: "#fff", boxShadow: "0 0 20px rgba(59,130,246,0.2)" }}
            onClick={() => handleSave("soumis")}
            disabled={saving}
          >
            <CheckCircle2 className="w-4 h-4" /> {saving ? "Envoi..." : "Soumettre le CR"}
          </button>
        </div>
      )}
    </div>
  );
}