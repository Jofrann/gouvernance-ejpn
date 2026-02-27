import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Crown, BarChart3, FileCheck, Archive, Target, Users, MapPin,
  AlertTriangle, Database, FileText, GitCompare, FlaskConical,
  PenTool, Home, Heart, ClipboardList, FolderOpen, ArrowRightLeft,
  Eye, GraduationCap, BookOpen, Upload, Award, CheckSquare,
  UserCheck, Globe, Calendar, MessageSquare, Flame, Calculator,
  Megaphone, Kanban, Library, BarChart2, Briefcase, Shield,
  Settings, LogOut, Search, Bell, ChevronDown, X, Command, Zap, User, MessagesSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import MobileNav from "@/components/navigation/MobileNav";
import {
  TRONE_ROLES, GOUV_ROLES, EXEC_ROLES,
  getAllowedExecPoles, getAllowedGouvGroups, normalizeRole
} from "@/components/shared/roleAccess";

const NOTIF_SAMPLES = [
  { id: 1, title: "Nouveau livrable soumis", desc: "Un pilote a déposé un livrable en attente de correction.", time: "Il y a 5 min", dot: "bg-blue-400", read: false },
  { id: 2, title: "Recommandation approuvée", desc: "Votre recommandation a été approuvée par le Trône.", time: "Il y a 1h", dot: "bg-emerald-400", read: false },
  { id: 3, title: "Alerte Clinique", desc: "Un membre présente une chute libre sur 3 semaines.", time: "Il y a 2h", dot: "bg-red-400", read: true },
];

const ROLE_LABELS = {
  admin: "Administrateur",
  trone: "Trône",
  gouvernance_direction: "Direction",
  gouvernance_suivi: "Suivi",
  gouvernance_strategie: "Stratégie",
  pilote_fi: "Pilote FI",
  copilote_fi: "Co-Pilote FI",
  responsable_fi: "Resp. FI",
  etudiant: "Étudiant",
  responsable_formation: "Resp. Formation",
  agent_terrain: "Agent Terrain",
  agent_virtuel: "Agent Virtuel",
  responsable_evangelisation: "Resp. Évangélisation",
  producteur: "Producteur",
  createur: "Créateur",
  responsable_communication: "Resp. Communication",
};

const NAVIGATION = {
  trone: {
    label: "Direction",
    icon: Crown,
    color: "from-amber-500 to-orange-500",
    textColor: "text-amber-400",
    items: [
      { label: "Tableau de Bord", page: "TroneRadar", icon: BarChart3 },
      { label: "Validation & Décisions", page: "TroneValidation", icon: FileCheck },
      { label: "Archives & Décrets", page: "TroneArchives", icon: Archive },
    ],
  },
  gouvernance: {
    label: "Gouvernance",
    icon: Shield,
    color: "from-blue-500 to-indigo-500",
    textColor: "text-blue-400",
    groups: {
      gouvernance_direction: {
        label: "Directrice d'Exécution",
        icon: Target,
        items: [
          { label: "Appropriation & OKR", page: "GouvMasterPlan", icon: Target },
          { label: "Planification Opérationnelle", page: "GouvAllocation", icon: Users },
          { label: "Roadmap & Transmission", page: "GouvRoadmap", icon: MapPin },
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
    color: "from-emerald-500 to-teal-500",
    textColor: "text-emerald-400",
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
        ],
      },
      evangelisation: {
        label: "Évangélisation",
        icon: Globe,
        items: [
          { label: "Agenda & Actions", page: "EvangelisationRadar", icon: Calendar },
          { label: "Debrief", page: "EvangelisationDebrief", icon: MessageSquare },
          { label: "Analyse des Résultats", page: "EvangelisationAnalyse", icon: Flame },
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
        ],
      },
    },
  },
};

function DropdownMenu({ items, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full left-0 mt-2 min-w-[220px] rounded-xl border border-white/10 bg-[#0f1117]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden z-50"
    >
      <div className="p-1.5">
        {items.map((item) => (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-all group"
          >
            <item.icon className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

function GroupedDropdown({ groups, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full left-0 mt-2 min-w-[640px] rounded-xl border border-white/10 bg-[#0f1117]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden z-50"
    >
      <div className="p-3 grid grid-cols-3 gap-3">
        {Object.entries(groups).map(([key, group]) => (
          <div key={key}>
            <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
              <group.icon className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{group.label}</span>
            </div>
            {group.items.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={onClose}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-all group"
              >
                <item.icon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function PoleDropdown({ poles, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full left-0 mt-2 min-w-[760px] rounded-xl border border-white/10 bg-[#0f1117]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden z-50"
    >
      <div className="p-3 grid grid-cols-4 gap-3">
        {Object.entries(poles).map(([key, pole]) => (
          <div key={key}>
            <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
              <pole.icon className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{pole.label}</span>
            </div>
            {pole.items.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={onClose}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-all group"
              >
                <item.icon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function NavButton({ label, icon: Icon, color, textColor, children, currentPage, pages }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isActive = pages?.some(p => p === currentPage);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          isActive || open
            ? "bg-white/10 text-white"
            : "text-zinc-400 hover:text-white hover:bg-white/5"
        )}
      >
        <Icon className={cn("w-4 h-4", isActive || open ? textColor : "")} />
        <span>{label}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence>{open && children(setOpen)}</AnimatePresence>
    </div>
  );
}

export default function TopNav({ user, currentPage }) {
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState(NOTIF_SAMPLES);
  const searchRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchRef.current?.focus(), 100);
      }
      if (e.key === "Escape") setShowSearch(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Support multi-rôles : tableau `roles` ou fallback sur `role` (string)
  // Normalize legacy role names so navigation access is always correct
  const rawRoles = Array.isArray(user?.roles) && user.roles.length > 0
    ? user.roles
    : user?.role ? [user.role] : ["admin"];
  const userRoles = rawRoles.map(normalizeRole);

  const isAdmin = userRoles.includes("admin");

  const isTrone = userRoles.some(r => TRONE_ROLES.includes(r));
  const isGouvernance = userRoles.some(r => GOUV_ROLES.includes(r));
  const isExecution = userRoles.some(r => EXEC_ROLES.includes(r));

  // Filtered exec poles & gouv groups for this user
  const allowedExecPoles = getAllowedExecPoles(userRoles);
  const allowedGouvGroups = getAllowedGouvGroups(userRoles);

  const role = userRoles[0] || "admin";
  const roleDisplayLabel = ROLE_LABELS[role] || ROLE_LABELS[rawRoles[0]] || role;

  const tronePages = NAVIGATION.trone.items.map(i => i.page);
  const gouvPages = Object.values(NAVIGATION.gouvernance.groups).flatMap(g => g.items.map(i => i.page));
  const execPages = Object.values(NAVIGATION.execution.poles).flatMap(p => p.items.map(i => i.page));

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center px-6 gap-4
        bg-[#080b12]/90 backdrop-blur-xl border-b border-white/[0.06]">
        
        {/* Subtle gradient line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

        {/* Mobile hamburger */}
        <MobileNav user={user} currentPage={currentPage} userRoles={userRoles} />

        {/* Logo */}
        <Link to={createPageUrl("Home")} className="flex items-center gap-3 mr-4 flex-shrink-0 group">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-center w-full h-full">
              <Zap className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="text-sm font-bold text-white tracking-tight">O.S.P — EJPN</span>
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-medium">Gouvernance</div>
          </div>
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-white/10 flex-shrink-0 hidden lg:block" />

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 flex-1">
          {/* Home */}
          <Link
            to={createPageUrl("Home")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              currentPage === "Home" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            <BarChart3 className={cn("w-4 h-4", currentPage === "Home" && "text-blue-400")} />
            <span>Vue d'ensemble</span>
          </Link>

          {/* Trone */}
          {isTrone && (
            <NavButton label="Direction" icon={Crown} color={NAVIGATION.trone.color} textColor={NAVIGATION.trone.textColor} currentPage={currentPage} pages={tronePages}>
              {(close) => <DropdownMenu items={NAVIGATION.trone.items} onClose={() => close(false)} />}
            </NavButton>
          )}

          {/* Gouvernance — filtered by sub-role */}
          {isGouvernance && allowedGouvGroups.length > 0 && (
            <NavButton label="Gouvernance" icon={Shield} color={NAVIGATION.gouvernance.color} textColor={NAVIGATION.gouvernance.textColor} currentPage={currentPage} pages={gouvPages}>
              {(close) => {
                const filteredGroups = Object.fromEntries(
                  Object.entries(NAVIGATION.gouvernance.groups).filter(([k]) => allowedGouvGroups.includes(k))
                );
                return <GroupedDropdown groups={filteredGroups} onClose={() => close(false)} />;
              }}
            </NavButton>
          )}

          {/* Execution — filtered by pole access */}
          {isExecution && allowedExecPoles.length > 0 && (
            <NavButton label="Exécution" icon={Briefcase} color={NAVIGATION.execution.color} textColor={NAVIGATION.execution.textColor} currentPage={currentPage} pages={execPages}>
              {(close) => {
                const filteredPoles = Object.fromEntries(
                  Object.entries(NAVIGATION.execution.poles).filter(([k]) => allowedExecPoles.includes(k))
                );
                return <PoleDropdown poles={filteredPoles} onClose={() => close(false)} />;
              }}
            </NavButton>
          )}

          {/* Mon Équipe */}
          <Link
            to={createPageUrl("Equipe")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              currentPage === "Equipe" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Users className={cn("w-4 h-4", currentPage === "Equipe" && "text-violet-400")} />
            <span>Mon Équipe</span>
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button
            onClick={() => { setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 100); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20 transition-all text-sm"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-xs">Recherche</span>
            <kbd className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-medium text-zinc-600">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
            >
              <Bell className="w-4 h-4" />
              {notifs.some(n => !n.read) && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              )}
            </button>
            <AnimatePresence>
              {showNotifs && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-2 w-80 rounded-xl border border-white/10 bg-[#0f1117]/98 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <span className="text-xs font-semibold text-white">Notifications</span>
                    <button
                      onClick={() => setNotifs(n => n.map(x => ({ ...x, read: true })))}
                      className="text-[10px] text-zinc-500 hover:text-blue-400 transition-colors"
                    >
                      Tout marquer lu
                    </button>
                  </div>
                  <div className="divide-y divide-white/5">
                    {notifs.map(n => (
                      <div
                        key={n.id}
                        onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                        className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors ${n.read ? "opacity-50" : "hover:bg-white/5"}`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${n.dot} ${n.read ? "opacity-30" : ""}`} />
                        <div>
                          <p className="text-xs font-semibold text-white">{n.title}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{n.desc}</p>
                          <p className="text-[10px] text-zinc-700 mt-1">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Messagerie */}
          <Link
            to={createPageUrl("Messagerie")}
            className={`hidden lg:flex p-2 rounded-lg transition-all relative ${
              currentPage === "Messagerie"
                ? "text-blue-400 bg-white/10"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            }`}
            title="Messagerie"
          >
            <MessagesSquare className="w-4 h-4" />
          </Link>

          {/* Mon Profil */}
          <Link
            to={createPageUrl("MonProfil")}
            className="hidden lg:flex p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
            title="Mon Profil"
          >
            <User className="w-4 h-4" />
          </Link>

          {/* Parametres */}
          <Link
            to={createPageUrl("Parametres")}
            className="hidden lg:flex p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
          >
            <Settings className="w-4 h-4" />
          </Link>

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 hidden lg:block" />

          {/* User */}
          <div className="hidden lg:flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                {user?.full_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#080b12]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white leading-none">{user?.full_name || "Utilisateur"}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{roleDisplayLabel}</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => base44.auth.logout()}
            className="hidden lg:flex p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Command Palette */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xl mx-4 rounded-2xl border border-white/10 bg-[#0f1117]/98 backdrop-blur-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                <Search className="w-4 h-4 text-zinc-500" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Rechercher une page, un membre, une FI..."
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                />
                <kbd className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-medium text-zinc-500 border border-white/10">ESC</kbd>
              </div>
              <div className="p-3 max-h-80 overflow-y-auto">
                <p className="px-3 py-6 text-center text-sm text-zinc-600">Tapez pour rechercher...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}