import React, { useState, useCallback } from "react";
import Joyride, { STATUS, EVENTS } from "react-joyride";
import { base44 } from "@/api/base44Client";
import { Sparkles, X, ChevronRight, ChevronLeft, Check } from "lucide-react";

// ─── Custom Tooltip Glassmorphism ────────────────────────────────────────────
function GlassTooltip({ continuous, index, step, backProps, closeProps, primaryProps, skipProps, size, isLastStep }) {
  return (
    <div
      className="relative max-w-sm w-80 rounded-2xl p-5 text-white"
      style={{
        background: "linear-gradient(135deg, rgba(15,17,26,0.92) 0%, rgba(10,12,20,0.96) 100%)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(40px) saturate(1.8) brightness(1.05)",
        WebkitBackdropFilter: "blur(40px) saturate(1.8) brightness(1.05)",
        boxShadow: "0 0 40px rgba(59,130,246,0.18), 0 0 80px rgba(139,92,246,0.10), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.2), 0 24px 48px rgba(0,0,0,0.5)",
      }}
    >
      {/* Glow line top */}
      <div className="absolute top-0 left-6 right-6 h-px" style={{
        background: "linear-gradient(90deg, transparent, rgba(99,155,255,0.5), rgba(139,92,246,0.5), transparent)"
      }} />

      {/* AI Agent Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
              background: "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(139,92,246,0.4))",
              border: "1px solid rgba(99,155,255,0.3)",
              boxShadow: "0 0 12px rgba(59,130,246,0.3)"
            }}>
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#0a0c14]" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Agent EJP OS</p>
            <p className="text-[9px] text-zinc-500">{index + 1} / {size}</p>
          </div>
        </div>
        <button
          {...skipProps}
          className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <X className="w-3.5 h-3.5 text-zinc-500" />
        </button>
      </div>

      {/* Step indicator dots */}
      <div className="flex gap-1 mb-3">
        {Array.from({ length: size }).map((_, i) => (
          <div
            key={i}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: i === index ? "20px" : "6px",
              background: i === index
                ? "linear-gradient(90deg, #3b82f6, #8b5cf6)"
                : i < index
                  ? "rgba(59,130,246,0.4)"
                  : "rgba(255,255,255,0.1)"
            }}
          />
        ))}
      </div>

      {/* Title */}
      {step.title && (
        <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">{step.title}</h3>
      )}

      {/* Content */}
      <div className="text-xs text-zinc-400 leading-relaxed mb-4">
        {step.content}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <button
          {...skipProps}
          className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Passer le tutoriel
        </button>
        <div className="flex items-center gap-2">
          {index > 0 && (
            <button
              {...backProps}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-zinc-400 transition-all hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <ChevronLeft className="w-3 h-3" /> Retour
            </button>
          )}
          <button
            {...primaryProps}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.85))",
              border: "1px solid rgba(99,155,255,0.35)",
              boxShadow: "0 0 16px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.15)"
            }}
          >
            {isLastStep ? (
              <><Check className="w-3 h-3" /> Terminé</>
            ) : (
              <>Suivant <ChevronRight className="w-3 h-3" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Steps builder (context-aware) ───────────────────────────────────────────
function buildSteps({ user, roles, membres, saisiesAujourdhui, isThursday }) {
  const firstName = user?.full_name?.split(" ")[0] || "toi";
  const steps = [];

  // Step 1 — toujours affiché
  steps.push({
    target: "body",
    placement: "center",
    title: `Bienvenue sur EJP OS, ${firstName} 👋`,
    content: `Je suis l'Agent EJP OS. Je vais te guider à travers les modules clés de la plateforme pour que tu sois opérationnel(le) en quelques minutes.`,
    disableBeacon: true,
  });

  // Step 2 — Navigation principale
  steps.push({
    target: "[data-joyride='top-nav']",
    placement: "bottom",
    title: "Navigation principale",
    content: "La barre du haut te donne accès à tous les modules : Familles d'Impact, Formation, Évangélisation, Communication et Gouvernance.",
    disableBeacon: true,
  });

  // Steps contextuels pour pilotes FI
  if (roles.some(r => ["pilote_fi", "copilote_fi"].includes(r))) {
    steps.push({
      target: "[data-joyride='kpi-membres']",
      placement: "bottom",
      title: "Tes membres · Vue rapide",
      content: `Ce bloc affiche le nombre de membres actifs dans ta FI. ${membres === 0 ? "👉 Commence par en ajouter via le Hub FI !" : `Tu as actuellement ${membres} membre(s) suivi(s).`}`,
      disableBeacon: true,
    });

    if (isThursday && saisiesAujourdhui === 0) {
      steps.push({
        target: "[data-joyride='task-clinique']",
        placement: "top",
        title: "⚡ Action urgente — C'est jeudi !",
        content: "Aucune saisie clinique n'a encore été enregistrée aujourd'hui. La Clinique du Jeudi est ta priorité absolue maintenant.",
        disableBeacon: true,
      });
    }

    steps.push({
      target: "[data-joyride='task-hub-fi']",
      placement: "top",
      title: "Hub FI — Ton centre de contrôle",
      content: "Le Hub FI centralise tout : Clinique hebdo, Dossiers membres, Transferts et Workspace. C'est ta base d'opérations.",
      disableBeacon: true,
    });
  }

  // Steps contextuels pour Direction / Trône
  if (roles.some(r => ["trone", "admin", "responsable_general", "responsable_fi"].includes(r))) {
    steps.push({
      target: "[data-joyride='kpi-membres']",
      placement: "bottom",
      title: "Vue globale du Mouvement",
      content: "Ce tableau de bord synthétise l'ensemble des KPIs stratégiques : âmes suivies, FI actives, OKRs en cours et recommandations à valider.",
      disableBeacon: true,
    });

    steps.push({
      target: "[data-joyride='kpi-okr']",
      placement: "bottom",
      title: "Pilotage des OKRs",
      content: "Suis la progression de tes objectifs trimestriels par pôle. Clique pour accéder au Master Plan et ajuster les valeurs en temps réel.",
      disableBeacon: true,
    });
  }

  // Step final — toujours affiché
  steps.push({
    target: "body",
    placement: "center",
    title: "Tu es prêt(e) ! 🚀",
    content: "Tu peux retrouver ce guide à tout moment depuis ton profil. Bonne mission !",
    disableBeacon: true,
  });

  return steps;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OnboardingWalkthrough({ user, roles, membres, saisiesAujourdhui }) {
  const onboardingState = user?.onboarding_state || {};
  const alreadyDone = onboardingState?.dashboard === true;

  const [run, setRun] = useState(!alreadyDone);

  const isThursday = new Date().getDay() === 4;

  const steps = buildSteps({ user, roles, membres, saisiesAujourdhui, isThursday });

  const handleJoyrideCallback = useCallback(async (data) => {
    const { status, type } = data;
    const finished = [STATUS.FINISHED, STATUS.SKIPPED].includes(status);

    if (finished && type === EVENTS.TOUR_END || type === EVENTS.TOUR_END) {
      setRun(false);
      // Persist to DB
      const current = user?.onboarding_state || {};
      await base44.auth.updateMe({
        onboarding_state: { ...current, dashboard: true },
      });
    }
  }, [user]);

  if (alreadyDone) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      disableOverlayClose
      spotlightPadding={6}
      tooltipComponent={(props) => <GlassTooltip {...props} />}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          zIndex: 10000,
          arrowColor: "rgba(15,17,26,0.95)",
        },
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        },
        spotlight: {
          borderRadius: "12px",
          boxShadow: "0 0 0 2px rgba(59,130,246,0.4), 0 0 40px rgba(59,130,246,0.15)",
        },
      }}
    />
  );
}