import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Crown, BarChart3, FileCheck, Archive, ChevronDown, ChevronRight,
  Target, Users, MapPin, TrendingUp, AlertTriangle, Database,
  FileText, GitCompare, FlaskConical, PenTool, Home, Heart,
  ClipboardList, FolderOpen, ArrowRightLeft, Eye, GraduationCap,
  BookOpen, Upload, Award, CheckSquare, UserCheck, Globe,
  Calendar, MessageSquare, Flame, Calculator, Megaphone,
  Kanban, Library, BarChart2, Briefcase, Shield, Settings, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAVIGATION = {
  trone: {
    label: "Le Trône",
    icon: Crown,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    items: [
      { label: "Radar Global", page: "TroneRadar", icon: BarChart3 },
      { label: "Bureau de Validation", page: "TroneValidation", icon: FileCheck },
      { label: "Archives & Décrets", page: "TroneArchives", icon: Archive },
    ],
  },
  gouvernance: {
    label: "Gouvernance",
    icon: Shield,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    groups: {
      gouvernance_direction: {
        label: "Direction d'Exécution",
        icon: Target,
        items: [
          { label: "Master Plan (OKR)", page: "GouvMasterPlan", icon: Target },
          { label: "Allocation", page: "GouvAllocation", icon: Users },
          { label: "Roadmap", page: "GouvRoadmap", icon: MapPin },
        ],
      },
      gouvernance_suivi: {
        label: "Suivi",
        icon: Eye,
        items: [
          { label: "Anomalies", page: "GouvAnomalies", icon: AlertTriangle },
          { label: "Données Brutes", page: "GouvDonnees", icon: Database },
          { label: "Générateur de Bilan", page: "GouvBilan", icon: FileText },
        ],
      },
      gouvernance_strategie: {
        label: "Stratégie",
        icon: FlaskConical,
        items: [
          { label: "Matrice Campus", page: "GouvMatrice", icon: GitCompare },
          { label: "Modélisation", page: "GouvModelisation", icon: FlaskConical },
          { label: "Rédaction Finale", page: "GouvRedaction", icon: PenTool },
        ],
      },
    },
  },
  execution: {
    label: "Exécution",
    icon: Briefcase,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    poles: {
      familles_impact: {
        label: "Familles d'Impact",
        icon: Home,
        roles: ["pilote_fi", "copilote_fi", "responsable_fi"],
        items: [
          { label: "Dashboard FI", page: "FIDashboard", icon: Heart, roles: ["pilote_fi", "copilote_fi", "responsable_fi"] },
          { label: "Clinique du Jeudi", page: "FIClinique", icon: ClipboardList, roles: ["pilote_fi", "copilote_fi"] },
          { label: "Dossiers Âmes", page: "FIDossiers", icon: FolderOpen, roles: ["pilote_fi", "copilote_fi", "responsable_fi"] },
          { label: "Transferts", page: "FITransferts", icon: ArrowRightLeft, roles: ["pilote_fi", "copilote_fi"] },
          { label: "Tour de Contrôle", page: "FITourControle", icon: Eye, roles: ["responsable_fi"] },
        ],
      },
      formation: {
        label: "Formation",
        icon: GraduationCap,
        roles: ["etudiant", "responsable_formation"],
        items: [
          { label: "Salle d'Étude", page: "FormationSalle", icon: BookOpen, roles: ["etudiant"] },
          { label: "Laboratoire", page: "FormationLabo", icon: Upload, roles: ["etudiant"] },
          { label: "Bulletin", page: "FormationBulletin", icon: Award, roles: ["etudiant", "responsable_formation"] },
          { label: "Correction Board", page: "FormationCorrection", icon: CheckSquare, roles: ["responsable_formation"] },
          { label: "Assiduité", page: "FormationAssiduite", icon: UserCheck, roles: ["responsable_formation"] },
        ],
      },
      evangelisation: {
        label: "Évangélisation",
        icon: Globe,
        roles: ["agent_terrain", "agent_virtuel", "responsable_evangelisation"],
        items: [
          { label: "Radar Ops", page: "EvangelisationRadar", icon: Calendar, roles: ["agent_terrain", "agent_virtuel", "responsable_evangelisation"] },
          { label: "Zone Debrief", page: "EvangelisationDebrief", icon: MessageSquare, roles: ["agent_terrain", "agent_virtuel"] },
          { label: "Heatmap", page: "EvangelisationHeatmap", icon: Flame, roles: ["responsable_evangelisation"] },
          { label: "ROI Tracker", page: "EvangelisationROI", icon: Calculator, roles: ["responsable_evangelisation"] },
        ],
      },
      communication: {
        label: "Communication",
        icon: Megaphone,
        roles: ["producteur", "createur", "responsable_communication"],
        items: [
          { label: "Kanban Studio", page: "CommunicationKanban", icon: Kanban, roles: ["producteur", "createur", "responsable_communication"] },
          { label: "Bibliothèque", page: "CommunicationBibliotheque", icon: Library, roles: ["producteur", "createur", "responsable_communication"] },
          { label: "Funnel Analytics", page: "CommunicationFunnel", icon: BarChart2, roles: ["responsable_communication"] },
          { label: "Directives Board", page: "CommunicationDirectives", icon: Briefcase, roles: ["responsable_communication"] },
        ],
      },
    },
  },
};

function NavSection({ label, icon: Icon, color, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider",
          "hover:bg-zinc-100 transition-colors",
          color || "text-zinc-500"
        )}
      >
        <Icon className="w-4 h-4" />
        <span className="flex-1 text-left">{label}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
      {open && <div className="ml-2 mt-0.5 space-y-0.5">{children}</div>}
    </div>
  );
}

function NavItem({ label, page, icon: Icon, active }) {
  return (
    <Link
      to={createPageUrl(page)}
      className={cn(
        "nav-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm",
        active
          ? "bg-blue-50 text-blue-700 font-medium"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function SidebarNav({ userRole, userNiveau, userPole, currentPage }) {
  const effectiveNiveau = userNiveau || "execution";
  const effectiveRole = userRole || "admin";
  const effectivePole = userPole || "familles_impact";

  const isAdmin = effectiveRole === "admin";
  const isTrone = effectiveNiveau === "trone" || isAdmin;
  const isGouvernance = effectiveNiveau === "gouvernance" || isAdmin;
  const isExecution = effectiveNiveau === "execution" || isAdmin;

  const canSeeGovGroup = (groupKey) => {
    if (isAdmin) return true;
    return effectiveRole === groupKey;
  };

  const canSeePole = (poleKey) => {
    if (isAdmin) return true;
    return effectivePole === poleKey;
  };

  const canSeeItem = (item) => {
    if (isAdmin) return true;
    if (!item.roles) return true;
    return item.roles.includes(effectiveRole);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-zinc-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 tracking-tight">Gouvernance</h1>
            <p className="text-[10px] text-zinc-400 font-medium tracking-wider uppercase">EJPN Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Home */}
        <Link
          to={createPageUrl("Home")}
          className={cn(
            "nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-3",
            currentPage === "Home"
              ? "bg-zinc-900 text-white font-medium"
              : "text-zinc-600 hover:bg-zinc-50"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Vue d'ensemble</span>
        </Link>

        {/* Trône */}
        {isTrone && (
          <NavSection label="Le Trône" icon={Crown} color="text-amber-600" defaultOpen={effectiveNiveau === "trone"}>
            {NAVIGATION.trone.items.map((item) => (
              <NavItem key={item.page} {...item} active={currentPage === item.page} />
            ))}
          </NavSection>
        )}

        {/* Gouvernance */}
        {isGouvernance && (
          <NavSection label="Gouvernance" icon={Shield} color="text-blue-600" defaultOpen={effectiveNiveau === "gouvernance"}>
            {Object.entries(NAVIGATION.gouvernance.groups).map(([key, group]) =>
              canSeeGovGroup(key) ? (
                <NavSection key={key} label={group.label} icon={group.icon} defaultOpen={isAdmin || effectiveRole === key}>
                  {group.items.map((item) => (
                    <NavItem key={item.page} {...item} active={currentPage === item.page} />
                  ))}
                </NavSection>
              ) : null
            )}
          </NavSection>
        )}

        {/* Exécution */}
        {isExecution && (
          <NavSection label="Exécution" icon={Briefcase} color="text-emerald-600" defaultOpen={effectiveNiveau === "execution"}>
            {Object.entries(NAVIGATION.execution.poles).map(([key, pole]) =>
              canSeePole(key) ? (
                <NavSection key={key} label={pole.label} icon={pole.icon}>
                  {pole.items.filter(canSeeItem).map((item) => (
                    <NavItem key={item.page} {...item} active={currentPage === item.page} />
                  ))}
                </NavSection>
              ) : null
            )}
          </NavSection>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-200 px-3 py-3 space-y-0.5">
        <Link
          to={createPageUrl("Parametres")}
          className="nav-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
        >
          <Settings className="w-4 h-4" />
          <span>Paramètres</span>
        </Link>
      </div>
    </div>
  );
}