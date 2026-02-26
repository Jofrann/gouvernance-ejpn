import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Map page names to readable activity labels
const PAGE_LABELS = {
  Home: "Vue d'ensemble",
  TroneRadar: "Tableau de Bord Direction",
  TroneValidation: "Validation & Décisions",
  TroneArchives: "Archives & Décrets",
  GouvMasterPlan: "Appropriation & OKR",
  GouvAllocation: "Planification Opérationnelle",
  GouvRoadmap: "Roadmap & Transmission",
  GouvAnomalies: "Collecte des Résultats",
  GouvDonnees: "Données Brutes",
  GouvBilan: "Générateur de Bilan",
  GouvMatrice: "Évaluation vs Vision",
  GouvModelisation: "Scénarios d'Ajustement",
  GouvRedaction: "Rédaction de Recommandation",
  FIDashboard: "Dashboard FI",
  FIClinique: "Suivi Hebdomadaire",
  FIDossiers: "Membres & Dossiers",
  FITransferts: "Transferts FI",
  FITourControle: "Tour de Contrôle",
  FIManager: "Gestion FI",
  FormationSalle: "Direction du Mois",
  FormationLabo: "Dépôt Livrable",
  FormationBulletin: "Mon Portfolio",
  FormationCorrection: "Correction",
  FormationAssiduite: "Assiduité",
  EvangelisationRadar: "Agenda & Actions",
  EvangelisationDebrief: "Debrief Évangélisation",
  EvangelisationHeatmap: "Impact & Rendement",
  EvangelisationROI: "ROI Tracker",
  CommunicationKanban: "Studio Com.",
  CommunicationBibliotheque: "Bibliothèque",
  CommunicationFunnel: "Analytics",
  CommunicationDirectives: "Directives Com.",
  Parametres: "Paramètres",
};

// Call this hook on every page to update the current user's activity
export function useTrackActivity(pageName) {
  useEffect(() => {
    const label = PAGE_LABELS[pageName] || pageName;
    base44.auth.updateMe({ current_activity: label, last_seen: new Date().toISOString() }).catch(() => {});

    // Clear on unmount
    return () => {
      base44.auth.updateMe({ current_activity: null }).catch(() => {});
    };
  }, [pageName]);
}

// Display component: small indicator under a user's name
export default function LiveActivityIndicator({ activity, lastSeen }) {
  if (!activity) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-zinc-600">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 inline-block" />
        Hors ligne
      </span>
    );
  }

  // Check if "seen" recently (< 10 minutes)
  const isRecent = lastSeen && (Date.now() - new Date(lastSeen).getTime()) < 10 * 60 * 1000;

  if (!isRecent) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-zinc-600">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 inline-block" />
        Inactif
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-[10px] text-emerald-500 max-w-[140px]">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse flex-shrink-0" />
      <span className="truncate">{activity}</span>
    </span>
  );
}