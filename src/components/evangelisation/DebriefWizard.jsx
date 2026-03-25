import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { X, Loader2, Plus, Trash2, Lock, ChevronRight, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const EMPTY_AME = { nom_prenom: "", age: "", telephone: "", instagram: "", invite_fij: false };

export default function DebriefWizard({ action, existingCR, onClose, onSealed }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [chiffres, setChiffres] = useState({
    participants_count: existingCR?.participants_count || "",
    abordes_count: existingCR?.abordes_count || "",
    contacts_pris: existingCR?.contacts_pris || "",
    invitations_faites: existingCR?.invitations_faites || "",
    prieres_autres: existingCR?.prieres_autres || "",
    prieres_salut: existingCR?.prieres_salut || "",
  });

  const [ames, setAmes] = useState([{ ...EMPTY_AME }]);

  const isLocked = existingCR?.est_verrouille;

  const addAme = () => setAmes(prev => [...prev, { ...EMPTY_AME }]);
  const removeAme = (i) => setAmes(prev => prev.filter((_, idx) => idx !== i));
  const updateAme = (i, field, value) => setAmes(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));

  const handleSeal = async () => {
    setLoading(true);
    const me = await base44.auth.me();

    // 1. Créer ou mettre à jour le CompteRendu
    const crData = {
      action_id: action.id,
      auteur_email: me.email,
      auteur_nom: me.full_name,
      est_verrouille: true,
      participants_count: parseInt(chiffres.participants_count) || 0,
      abordes_count: parseInt(chiffres.abordes_count) || 0,
      contacts_pris: parseInt(chiffres.contacts_pris) || 0,
      invitations_faites: parseInt(chiffres.invitations_faites) || 0,
      prieres_autres: parseInt(chiffres.prieres_autres) || 0,
      prieres_salut: parseInt(chiffres.prieres_salut) || 0,
    };

    if (existingCR) {
      await base44.entities.CompteRendu.update(existingCR.id, crData);
    } else {
      await base44.entities.CompteRendu.create(crData);
    }

    // 2. Créer les AmeVivier depuis les lignes renseignées
    const amesValides = ames.filter(a => a.nom_prenom.trim() !== "");
    if (amesValides.length > 0) {
      await base44.entities.AmeVivier.bulkCreate(
        amesValides.map(a => ({
          nom_prenom: a.nom_prenom.trim(),
          age: parseInt(a.age) || undefined,
          telephone: a.telephone || undefined,
          instagram: a.instagram || undefined,
          invite_fij: a.invite_fij,
          statut_confiance: "Nouveau (Glacé)",
          origine_action_id: action.id,
          responsable_email: me.email,
        }))
      );
    }

    // 3. Marquer l'action terminée
    await base44.entities.ActionEvangelisation.update(action.id, { statut: "Terminée" });

    setLoading(false);
    onSealed();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0d1018] shadow-2xl z-10 flex flex-col max-h-[90vh]"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/10 flex-shrink-0">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Compte Rendu · {action.titre}</p>
            <p className="text-xs text-zinc-600">{format(new Date(action.date_action), "d MMMM yyyy", { locale: fr })}</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300"><X className="w-5 h-5" /></button>
        </div>

        {/* Step indicator */}
        {!isLocked && (
          <div className="flex items-center gap-0 px-5 pt-4 flex-shrink-0">
            {[{ n: 1, label: "Les Chiffres" }, { n: 2, label: "Les Âmes" }].map((s, i) => (
              <React.Fragment key={s.n}>
                <div className={cn("flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-all",
                  step === s.n ? "bg-blue-500/20 text-blue-400" : "text-zinc-600")}>
                  <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                    step === s.n ? "bg-blue-500 text-white" : step > s.n ? "bg-emerald-500 text-white" : "bg-white/10")}>
                    {step > s.n ? "✓" : s.n}
                  </span>
                  {s.label}
                </div>
                {i === 0 && <ChevronRight className="w-3 h-3 text-zinc-700" />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Locked state */}
        {isLocked ? (
          <div className="p-6 text-center">
            <Lock className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
            <p className="text-sm font-semibold text-white">Ce CR est scellé</p>
            <p className="text-xs text-zinc-500 mt-1">Les données sont verrouillées et ne peuvent plus être modifiées.</p>
          </div>
        ) : (
          <>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-zinc-300 mb-4">Métriques de la sortie</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "participants_count", label: "👥 Personnes EJP sorties" },
                      { key: "abordes_count", label: "🗣️ Personnes abordées" },
                      { key: "contacts_pris", label: "📲 Contacts réels pris" },
                      { key: "invitations_faites", label: "🤝 Invitations FIJ/EJP" },
                      { key: "prieres_autres", label: "🙏 Autres prières" },
                      { key: "prieres_salut", label: "😇 Prières du salut" },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs text-zinc-500 font-medium">{f.label}</label>
                        <input type="number" min="0" className="input-glass mt-1"
                          value={chiffres[f.key]}
                          onChange={e => setChiffres({ ...chiffres, [f.key]: e.target.value })} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-300">Âmes rencontrées</p>
                    <button onClick={addAme}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">
                      <Plus className="w-3 h-3" /> Ajouter une ligne
                    </button>
                  </div>
                  <div className="space-y-2">
                    {ames.map((ame, i) => (
                      <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input className="input-glass text-sm" placeholder="Nom & Prénom *"
                            value={ame.nom_prenom} onChange={e => updateAme(i, "nom_prenom", e.target.value)} />
                          <input type="number" className="input-glass text-sm" placeholder="Âge"
                            value={ame.age} onChange={e => updateAme(i, "age", e.target.value)} />
                          <input className="input-glass text-sm" placeholder="📞 Téléphone"
                            value={ame.telephone} onChange={e => updateAme(i, "telephone", e.target.value)} />
                          <input className="input-glass text-sm" placeholder="📸 Instagram @"
                            value={ame.instagram} onChange={e => updateAme(i, "instagram", e.target.value)} />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                            <input type="checkbox" checked={ame.invite_fij} onChange={e => updateAme(i, "invite_fij", e.target.checked)}
                              className="rounded" />
                            Invité(e) à la FIJ/EJP
                          </label>
                          {ames.length > 1 && (
                            <button onClick={() => removeAme(i)} className="text-zinc-700 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-5 border-t border-white/10 flex-shrink-0">
              {step === 2 ? (
                <>
                  <button onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                    <ChevronLeft className="w-3.5 h-3.5" /> Retour
                  </button>
                  <button onClick={handleSeal} disabled={loading}
                    className="btn-glow-gold px-5 py-2.5 flex items-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4" /> Sceller le Rapport</>}
                  </button>
                </>
              ) : (
                <button onClick={() => setStep(2)} className="btn-glow-blue px-5 py-2.5 flex items-center gap-2 ml-auto">
                  Suivant : Les Âmes <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}