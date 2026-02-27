import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Crown, BarChart3, FileCheck, Archive, Target, Users, MapPin,
  AlertTriangle, Database, FileText, GitCompare, FlaskConical,
  PenTool, Home, Heart, ClipboardList, FolderOpen, ArrowRightLeft,
  Eye, GraduationCap, BookOpen, Upload, Award, CheckSquare,
  UserCheck, Globe, Calendar, MessageSquare, Flame,
  Megaphone, Kanban, Library, BarChart2, Briefcase, Shield,
  Settings, LogOut, User, Menu, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { base44 } from "@/api/base44Client";
import {
  TRONE_ROLES, GOUV_ROLES, EXEC_ROLES,
  getAllowedExecPoles, getAllowedGouvGroups
} from "@/components/shared/roleAccess";

const NAVIGATION = {
  trone: {
    label: "Direction",
    icon: Crown,
    items: [
      { label: "Tableau de Bord", page: "TroneRadar", icon: BarChart3 },
      { label: "Validation & Décisions", page: "TroneValidation", icon: FileCheck },
      { label: "Archives & Décrets", page: "TroneArchives", icon: Archive },
      { label: "Notre Équipe", page: "Equipe", icon: Users },
    ],
  },
  gouvernance: {
    label: "Gouvernance",
    icon: Shield,
    groups: {
      gouvernance_direction: {
        label: "Directrice d'Exécution",
        icon: Target,
        items: [
          { label: "Appropriation & OKR", page: "GouvMasterPlan", icon: Target },
          { label: "Planification Opérationnelle", page: "GouvAllocation", icon: Users },
          { label: "Roadmap & Transmission", page: "GouvRoadmap", icon: MapPin },
          { label: "Notre Équipe", page: "EquipeGouvernance", icon: Users },
        ],
      },
      gouvernance_suivi: {
        label: "Responsable de Suivi",
        icon: Eye,
        items: [
          { label: "Collecte & Tri des Résultats", page: "GouvAnomalies", icon: AlertTriangle },
          { label: "Données Brutes (Pôles)", page: "GouvDonnees", icon: Database },
          { label: "Générateur de Bilan", page: "GouvBilan", icon: FileText },
        ],
      },
      gouvernance_strategie: {
        label: "Analyste Stratégique",
        icon: FlaskConical,
        items: [
          { label: "Évaluation vs Vision", page: "GouvMatrice", icon: GitCompare },
          { label: "Scénarios d'Ajustement", page: "GouvModelisation", icon: FlaskConical },
          { label: "Recommandations", page: "GouvRedaction", icon: PenTool },
        ],
      },
    },
  },
  execution: {
    label: "Exécution",
    icon: Briefcase,
    poles: {
      familles_impact: {
        label: "Familles d'Impact",
        icon: Home,
        items: [
          { label: "Hub FI", page: "FIHub", icon: Heart },
          { label: "Suivi Hebdo", page: "FIClinique", icon: ClipboardList },
          { label: "Membres & Dossiers", page: "FIDossiers", icon: FolderOpen },
          { label: "Transferts", page: "FITransferts", icon: ArrowRightLeft },
          { label: "Tour de Contrôle", page: "FITourControle", icon: Eye },
          { label: "Notre Équipe", page: "Equipe", icon: Users },
        ],
      },
      formation: {
        label: "Formation",
        icon: GraduationCap,
        items: [
          { label: "Direction du Mois", page: "FormationSalle", icon: BookOpen },
          { label: "Dépôt Livrable", page: "FormationLabo", icon: Upload },
          { label: "Mon Portfolio", page: "FormationBulletin", icon: Award },
          { label: "Correction", page: "FormationCorrection", icon: CheckSquare },
          { label: "Assiduité", page: "FormationAssiduite", icon: UserCheck },
          { label: "Notre Équipe", page: "Equipe", icon: Users },
        ],
      },
      evangelisation: {
        label: "Évangélisation",
        icon: Globe,
        items: [
          { label: "Agenda & Actions", page: "EvangelisationRadar", icon: Calendar },
          { label: "Debrief", page: "EvangelisationDebrief", icon: MessageSquare },
          { label: "Analyse des Résultats", page: "EvangelisationAnalyse", icon: Flame },
          { label: "Notre Équipe", page: "Equipe", icon: Users },
        ],
      },
      communication: {
        label: "Communication",
        icon: Megaphone,
        items: [
          { label: "Studio", page: "CommunicationKanban", icon: Kanban },
          { label: "Bibliothèque", page: "CommunicationBibliotheque", icon: Library },
          { label: "Analytics", page: "CommunicationFunnel", icon: BarChart2 },
          { label: "Directives", page: "CommunicationDirectives", icon: Briefcase },
          { label: "Notre Équipe", page: "Equipe", icon: Users },
        ],
      },
    },
  },
};

function NavLink({ item, currentPage, onClose }) {
  return (
    <Link
      to={createPageUrl(item.page)}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
        currentPage === item.page
          ? "bg-white/10 text-white"
          : "text-zinc-400 hover:text-white hover:bg-white/5"
      )}
    >
      <item.icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

function SectionTitle({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-2 mt-5">
      <Icon className="w-3.5 h-3.5 text-zinc-500" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</span>
    </div>
  );
}

export default function MobileNav({ user, currentPage, userRoles }) {
  const [open, setOpen] = React.useState(false);

  const isTrone = userRoles.some(r => TRONE_ROLES.includes(r));
  const isGouvernance = userRoles.some(r => GOUV_ROLES.includes(r));
  const isExecution = userRoles.some(r => EXEC_ROLES.includes(r));

  const allowedExecPoles = getAllowedExecPoles(userRoles);
  const allowedGouvGroups = getAllowedGouvGroups(userRoles);

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
          <Menu className="w-5 h-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] bg-[#0f1117] border-white/10 p-0 flex flex-col overflow-hidden">
        <SheetHeader className="p-4 border-b border-white/5 flex-shrink-0">
          <SheetTitle className="flex items-center gap-2.5">
            <div className="relative w-7 h-7">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600" />
              <div className="relative flex items-center justify-center w-full h-full">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">O.S.P — EJPN</span>
              <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Gouvernance</div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {/* Home */}
          <NavLink item={{ label: "Vue d'ensemble", page: "Home", icon: BarChart3 }} currentPage={currentPage} onClose={close} />

          {/* Direction */}
          {isTrone && (
            <>
              <SectionTitle icon={Crown} label="Direction" />
              {NAVIGATION.trone.items.map(item => (
                <NavLink key={item.page} item={item} currentPage={currentPage} onClose={close} />
              ))}
            </>
          )}

          {/* Gouvernance — filtered by sub-role */}
          {isGouvernance && allowedGouvGroups.length > 0 && (
            <>
              <SectionTitle icon={Shield} label="Gouvernance" />
              {Object.entries(NAVIGATION.gouvernance.groups)
                .filter(([k]) => allowedGouvGroups.includes(k))
                .map(([, group]) => (
                  <div key={group.label} className="mb-3">
                    <p className="text-[10px] font-semibold text-zinc-600 px-3 mb-1">{group.label}</p>
                    {group.items.map(item => (
                      <NavLink key={item.page} item={item} currentPage={currentPage} onClose={close} />
                    ))}
                  </div>
                ))}
            </>
          )}

          {/* Exécution — filtered by pole access */}
          {isExecution && allowedExecPoles.length > 0 && (
            <>
              <SectionTitle icon={Briefcase} label="Exécution" />
              {Object.entries(NAVIGATION.execution.poles)
                .filter(([k]) => allowedExecPoles.includes(k))
                .map(([, pole]) => (
                  <div key={pole.label} className="mb-3">
                    <p className="text-[10px] font-semibold text-zinc-600 px-3 mb-1">{pole.label}</p>
                    {pole.items.map(item => (
                      <NavLink key={item.page} item={item} currentPage={currentPage} onClose={close} />
                    ))}
                  </div>
                ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 p-3 border-t border-white/5 space-y-1">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                  {user?.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border-2 border-[#0f1117]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white leading-none">{user?.full_name || "Utilisateur"}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{user?.email}</p>
              </div>
            </div>
          )}
          <Link to={createPageUrl("MonProfil")} onClick={close} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
            <User className="w-4 h-4 text-zinc-500" />
            <span>Mon Profil</span>
          </Link>
          <Link to={createPageUrl("Parametres")} onClick={close} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
            <Settings className="w-4 h-4 text-zinc-500" />
            <span>Paramètres</span>
          </Link>
          <button onClick={() => base44.auth.logout()} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4 text-zinc-500" />
            <span>Déconnexion</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}