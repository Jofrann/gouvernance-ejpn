import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Bell, ChevronDown, ChevronUp, Loader2, AlertTriangle, TrendingDown, Star, UserX } from "lucide-react";
import { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";
import { detectPotentielReproducteur } from "@/components/fi/ReproducteurFlag";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * AI-powered nudge panel for the Tour de Contrôle.
 * Given all FI members + their saisies, computes contextual alerts
 * and can generate an AI-written personalised nudge email to the Pilote.
 */
export default function SmartNudgePanel({ fi, membres, allSaisies }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiNudge, setAiNudge] = useState(null);
  const [sending, setSending] = useState(false);

  const fiSaisies = allSaisies.filter((s) => s.famille_impact_id === fi.id);
  const fiMembres = membres.filter((m) => m.famille_impact_id === fi.id);

  // Compute member-level alerts
  const membresWithAlerts = fiMembres.map((m) => {
    const chute = detectChuteLivre(m.id, fiSaisies);
    const repro = detectPotentielReproducteur(m.id, fiSaisies, m.statut_pipeline);

    // Absence risk: ≥2 absences in last 4 weeks
    const last4 = fiSaisies
      .filter((s) => s.membre_id === m.id)
      .sort((a, b) => new Date(b.semaine) - new Date(a.semaine))
      .slice(0, 4);
    const absenceRisk = last4.filter((s) => !s.presence).length >= 2;

    // Weak dimension: any individual note avg < 4 over last 3 present saisies
    const last3Present = fiSaisies
      .filter((s) => s.membre_id === m.id && s.presence)
      .sort((a, b) => new Date(b.semaine) - new Date(a.semaine))
      .slice(0, 3);
    const weakDimensions = [];
    if (last3Present.length >= 2) {
      const dims = [
        { key: "note_temps", label: "Gestion du temps" },
        { key: "note_finances", label: "Finances" },
        { key: "note_emotions", label: "Émotions" },
        { key: "note_spirituel", label: "Spirituel" },
      ];
      dims.forEach(({ key, label }) => {
        const vals = last3Present.map((s) => s[key]).filter((v) => v !== null && v !== undefined);
        const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        if (avg !== null && avg < 4) weakDimensions.push(label);
      });
    }

    return { membre: m, chute, repro, absenceRisk, weakDimensions };
  }).filter((x) => x.chute || x.absenceRisk || x.weakDimensions.length > 0 || x.repro);

  const urgentCount = membresWithAlerts.filter((x) => x.chute || x.absenceRisk).length;

  const generateAiNudge = async () => {
    if (aiNudge) { setOpen(!open); return; }
    setLoading(true);
    setOpen(true);

    const alertLines = membresWithAlerts.map((x) => {
      const flags = [];
      if (x.chute) flags.push("chute libre de santé sur 3 semaines");
      if (x.absenceRisk) flags.push("risque d'abandon (≥2 absences récentes)");
      if (x.weakDimensions.length > 0) flags.push(`dimensions critiques: ${x.weakDimensions.join(", ")}`);
      if (x.repro) flags.push("profil Reproducteur émergent à encourager");
      return `- ${x.membre.nom_complet} (${x.membre.statut_pipeline}): ${flags.join("; ")}`;
    }).join("\n");

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un coordinateur pastoral expérimenté au sein du mouvement EJPN. Tu envoies un message de management motivant et précis au Pilote de la Famille d'Impact "${fi.name}".

Alertes membres détectées :
${alertLines || "Aucune alerte critique. FI en bonne santé."}

Rédige un message court (max 150 mots) :
1. Commence par une phrase d'encouragement sur la FI.
2. Cite nommément les membres nécessitant une attention immédiate et indique pourquoi.
3. Propose 1-2 actions concrètes et pastorales pour cette semaine.
4. Termine par une phrase de motivation.

Style : direct, fraternel, militaire dans la précision mais chaleureux dans le ton. Pas de formules creuses.`,
    });

    setAiNudge(result);
    setLoading(false);
  };

  const sendNudge = async () => {
    if (!aiNudge || !fi.pilote_email) return;
    setSending(true);
    await base44.integrations.Core.SendEmail({
      to: fi.pilote_email,
      subject: `📊 Rapport Pastoral IA — ${fi.name}`,
      body: aiNudge,
    }).catch(() => {});
    toast.success(`Nudge IA envoyé à ${fi.pilote_email}`);
    setSending(false);
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Member alerts summary */}
      {membresWithAlerts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {membresWithAlerts.filter(x => x.chute || x.absenceRisk).map((x) => (
            <Badge key={x.membre.id} className="bg-red-50 text-red-700 border border-red-200 text-[10px] gap-1">
              <AlertTriangle className="w-3 h-3" /> {x.membre.nom_complet}
              {x.absenceRisk && !x.chute && " · absences"}
              {x.weakDimensions.length > 0 && !x.chute && ` · ${x.weakDimensions[0]}`}
            </Badge>
          ))}
          {membresWithAlerts.filter(x => x.repro).map((x) => (
            <Badge key={`r-${x.membre.id}`} className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] gap-1">
              <Star className="w-3 h-3 fill-amber-500" /> {x.membre.nom_complet} · Reproducteur
            </Badge>
          ))}
        </div>
      )}

      {/* AI Nudge button */}
      <button
        onClick={generateAiNudge}
        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        {loading ? "Génération IA..." : aiNudge ? (open ? "Masquer le nudge IA" : "Voir le nudge IA") : "Générer un Nudge IA personnalisé"}
        {aiNudge && !loading && (open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </button>

      {open && aiNudge && (
        <div className="mt-2 p-3 rounded-lg bg-blue-50/60 border border-blue-100 space-y-3">
          <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-line">{aiNudge}</p>
          <Button
            size="sm"
            className="gap-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-7"
            onClick={sendNudge}
            disabled={sending}
          >
            <Bell className="w-3.5 h-3.5" />
            {sending ? "Envoi..." : `Envoyer au Pilote (${fi.pilote_email})`}
          </Button>
        </div>
      )}
    </div>
  );
}