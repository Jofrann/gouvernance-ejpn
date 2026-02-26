import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Crown, Shield, Briefcase, Home, GraduationCap, Globe, Megaphone,
  Target, Eye, FlaskConical, Heart, Archive, FileCheck, BookOpen,
  Calendar, Kanban, BarChart2, Users, Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import MobileNav from "@/components/navigation/MobileNav";

// Navigation piliers par rôle
const NAV_BY_ROLE = {
  // TRÔNE
  trone: [
    { label: "Radar & Décisions", page: "TroneRadar", icon: Crown, glow: "blue" },
    { label: "Archives & Décrets", page: "TroneArchives", icon: Archive, glow: "amber" },
    { label: "Conseil Royal", page: "EquipeTrone", icon: Users, glow: "violet" },
  ],
  admin: [
    { label: "Radar & Décisions", page: "TroneRadar", icon: Crown, glow: "blue" },
    { label: "Archives & Décrets", page: "TroneArchives", icon: Archive, glow: "amber" },
    { label: "Conseil Royal", page: "EquipeTrone", icon: Users, glow: "violet" },
  ],

  // GOUVERNANCE
  gouvernance_direction: [
    { label: "Master Plan & OKR", page: "GouvMasterPlan", icon: Target, glow: "blue" },
    { label: "Roadmap", page: "GouvRoadmap", icon: Shield, glow: "indigo" },
    { label: "État-Major", page: "EquipeGouvernance", icon: Users, glow: "violet" },
  ],
  gouvernance_suivi: [
    { label: "Collecte & Datas", page: "GouvAnomalies", icon: Eye, glow: "blue" },
    { label: "Générateur de Bilan", page: "GouvBilan", icon: Shield, glow: "indigo" },
    { label: "État-Major", page: "EquipeGouvernance", icon: Users, glow: "violet" },
  ],
  gouvernance_strategie: [
    { label: "Laboratoire", page: "GouvMatrice", icon: FlaskConical, glow: "blue" },
    { label: "Recommandations", page: "GouvRedaction", icon: Shield, glow: "indigo" },
    { label: "État-Major", page: "EquipeGouvernance", icon: Users, glow: "violet" },
  ],

  // EXÉCUTION — FI
  pilote_fi: [
    { label: "Mes Maisons", page: "FIDashboard", icon: Heart, glow: "emerald" },
    { label: "Centre de Transferts", page: "FITransferts", icon: Home, glow: "teal" },
    { label: "Ma F.I", page: "EquipeFI", icon: Users, glow: "violet" },
  ],
  copilote_fi: [
    { label: "Mes Maisons", page: "FIDashboard", icon: Heart, glow: "emerald" },
    { label: "Centre de Transferts", page: "FITransferts", icon: Home, glow: "teal" },
    { label: "Ma F.I", page: "EquipeFI", icon: Users, glow: "violet" },
  ],
  responsable_fi: [
    { label: "Supervision FI", page: "FITourControle", icon: Eye, glow: "emerald" },
    { label: "Direction & Transferts", page: "FIManager", icon: Home, glow: "teal" },
    { label: "Pôle FI", page: "EquipeFI", icon: Users, glow: "violet" },
  ],

  // EXÉCUTION — Formation
  etudiant: [
    { label: "Mon Cursus", page: "FormationSalle", icon: BookOpen, glow: "violet" },
    { label: "Mon Portfolio", page: "FormationBulletin", icon: GraduationCap, glow: "indigo" },
    { label: "Ma Promo", page: "EquipeFormation", icon: Users, glow: "blue" },
  ],
  responsable_formation: [
    { label: "Gestion Cursus", page: "FormationSalle", icon: BookOpen, glow: "violet" },
    { label: "Correction Board", page: "FormationCorrection", icon: GraduationCap, glow: "indigo" },
    { label: "Pôle Formation", page: "EquipeFormation", icon: Users, glow: "blue" },
  ],

  // EXÉCUTION — Évangélisation
  agent_terrain: [
    { label: "Opérations & Débriefs", page: "EvangelisationRadar", icon: Calendar, glow: "rose" },
    { label: "Impact & ROI", page: "EvangelisationHeatmap", icon: Globe, glow: "orange" },
    { label: "Escouade", page: "EquipeEvangelisation", icon: Users, glow: "violet" },
  ],
  agent_virtuel: [
    { label: "Opérations & Débriefs", page: "EvangelisationRadar", icon: Calendar, glow: "rose" },
    { label: "Impact & ROI", page: "EvangelisationHeatmap", icon: Globe, glow: "orange" },
    { label: "Escouade", page: "EquipeEvangelisation", icon: Users, glow: "violet" },
  ],
  responsable_evangelisation: [
    { label: "Coordination", page: "EvangelisationRadar", icon: Calendar, glow: "rose" },
    { label: "Heatmap & ROI", page: "EvangelisationHeatmap", icon: Globe, glow: "orange" },
    { label: "Pôle Évangélisation", page: "EquipeEvangelisation", icon: Users, glow: "violet" },
  ],

  // EXÉCUTION — Communication
  producteur: [
    { label: "Studio Kanban", page: "CommunicationKanban", icon: Kanban, glow: "orange" },
    { label: "Bibliothèque", page: "CommunicationBibliotheque", icon: Megaphone, glow: "amber" },
    { label: "Créatifs", page: "EquipeCommunication", icon: Users, glow: "violet" },
  ],
  createur: [
    { label: "Studio Kanban", page: "CommunicationKanban", icon: Kanban, glow: "orange" },
    { label: "Bibliothèque", page: "CommunicationBibliotheque", icon: Megaphone, glow: "amber" },
    { label: "Créatifs", page: "EquipeCommunication", icon: Users, glow: "violet" },
  ],
  responsable_communication: [
    { label: "Directives & Stratégie", page: "CommunicationDirectives", icon: Megaphone, glow: "orange" },
    { label: "Funnel Analytics", page: "CommunicationFunnel", icon: BarChart2, glow: "amber" },
    { label: "Pôle Com", page: "EquipeCommunication", icon: Users, glow: "violet" },
  ],
};

const GLOW_COLORS = {
  blue: "shadow-blue-500/40 bg-blue-500/10 text-blue-300 border-blue-500/30",
  violet: "shadow-violet-500/40 bg-violet-500/10 text-violet-300 border-violet-500/30",
  emerald: "shadow-emerald-500/40 bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  teal: "shadow-teal-500/40 bg-teal-500/10 text-teal-300 border-teal-500/30",
  indigo: "shadow-indigo-500/40 bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
  amber: "shadow-amber-500/40 bg-amber-500/10 text-amber-300 border-amber-500/30",
  rose: "shadow-rose-500/40 bg-rose-500/10 text-rose-300 border-rose-500/30",
  orange: "shadow-orange-500/40 bg-orange-500/10 text-orange-300 border-orange-500/30",
};

const GLOW_ACTIVE_LINE = {
  blue: "bg-blue-400",
  violet: "bg-violet-400",
  emerald: "bg-emerald-400",
  teal: "bg-teal-400",
  indigo: "bg-indigo-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  orange: "bg-orange-400",
};

function PilierTab({ item, isActive }) {
  const glowClass = GLOW_COLORS[item.glow] || GLOW_COLORS.blue;
  const lineClass = GLOW_ACTIVE_LINE[item.glow] || GLOW_ACTIVE_LINE.blue;
  const Icon = item.icon;

  return (
    <Link
      to={createPageUrl(item.page)}
      className={cn(
        "relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg",
        isActive
          ? cn("border", glowClass)
          : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
      )}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="whitespace-nowrap">{item.label}</span>
      {/* Neon glow line */}
      {isActive && (
        <motion.div
          layoutId="active-tab-line"
          className={cn("absolute -bottom-[11px] left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full", lineClass)}
          style={{ boxShadow: `0 0 8px 2px currentColor` }}
        />
      )}
    </Link>
  );
}

export default function ContextualSubNav({ user, currentPage, userRoles }) {
  const role = userRoles?.[0] || "admin";
  const piliers = NAV_BY_ROLE[role] || NAV_BY_ROLE["admin"];

  return (
    <div className="fixed top-14 left-0 right-0 z-40 h-11 flex items-center
      bg-[#070a10]/70 backdrop-blur-xl border-b border-white/[0.05]">
      
      {/* Mobile hamburger */}
      <div className="lg:hidden px-3 flex items-center">
        <MobileNav user={user} currentPage={currentPage} userRoles={userRoles} />
      </div>

      {/* Home pill */}
      <Link
        to={createPageUrl("Home")}
        className={cn(
          "hidden lg:flex items-center gap-1.5 px-3 py-1.5 mx-3 text-xs font-medium rounded-lg transition-all",
          currentPage === "Home" ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04]"
        )}
      >
        <span>Vue d'ensemble</span>
      </Link>

      <div className="hidden lg:block w-px h-4 bg-white/[0.08] flex-shrink-0" />

      {/* Contextual piliers */}
      <nav className="hidden lg:flex items-center gap-1 px-3 overflow-x-auto flex-1">
        {piliers.map(item => (
          <PilierTab
            key={item.page}
            item={item}
            isActive={currentPage === item.page}
          />
        ))}
      </nav>

      {/* Role badge */}
      <div className="hidden lg:flex items-center px-4 flex-shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-700">{role.replace(/_/g, " ")}</span>
      </div>
    </div>
  );
}