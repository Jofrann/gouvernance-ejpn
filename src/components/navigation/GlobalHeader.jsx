import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Search, Bell, Plus, Command, Zap, X, BarChart3, Crown, Shield,
  Briefcase, Home, GraduationCap, Globe, Megaphone, Target,
  Heart, ClipboardList, FolderOpen, Upload, Award, Calendar,
  MessageSquare, Kanban, Library, MapPin, AlertTriangle, Database,
  FileText, GitCompare, FlaskConical, PenTool, FileCheck, Archive,
  ArrowRightLeft, Eye, CheckSquare, UserCheck, Flame, Calculator,
  BarChart2, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import UserCockpit from "@/components/navigation/UserCockpit";

const ALL_PAGES = [
  { label: "Vue d'ensemble", page: "Home", icon: BarChart3, tags: ["accueil", "dashboard"] },
  { label: "Radar & Décisions", page: "TroneRadar", icon: Crown, tags: ["trône", "vision"] },
  { label: "Validation & Décisions", page: "TroneValidation", icon: FileCheck, tags: ["trône", "validation"] },
  { label: "Archives & Décrets", page: "TroneArchives", icon: Archive, tags: ["trône", "archives"] },
  { label: "Master Plan & OKR", page: "GouvMasterPlan", icon: Target, tags: ["gouvernance", "okr"] },
  { label: "Roadmap", page: "GouvRoadmap", icon: MapPin, tags: ["gouvernance", "roadmap"] },
  { label: "Collecte & Anomalies", page: "GouvAnomalies", icon: AlertTriangle, tags: ["gouvernance", "anomalies"] },
  { label: "Données Brutes", page: "GouvDonnees", icon: Database, tags: ["gouvernance", "données"] },
  { label: "Générateur de Bilan", page: "GouvBilan", icon: FileText, tags: ["gouvernance", "bilan"] },
  { label: "Matrice d'Analyse", page: "GouvMatrice", icon: GitCompare, tags: ["gouvernance", "analyse"] },
  { label: "Scénarios", page: "GouvModelisation", icon: FlaskConical, tags: ["gouvernance", "modélisation"] },
  { label: "Recommandations", page: "GouvRedaction", icon: PenTool, tags: ["gouvernance", "rédaction"] },
  { label: "Mes Maisons (FI)", page: "FIDashboard", icon: Heart, tags: ["fi", "maisons"] },
  { label: "Clinique du Jeudi", page: "FIClinique", icon: ClipboardList, tags: ["fi", "clinique"] },
  { label: "Membres & Dossiers", page: "FIDossiers", icon: FolderOpen, tags: ["fi", "membres", "crm"] },
  { label: "Transferts FI", page: "FITransferts", icon: ArrowRightLeft, tags: ["fi", "transferts"] },
  { label: "Supervision FI", page: "FITourControle", icon: Eye, tags: ["fi", "supervision"] },
  { label: "Gestion FI", page: "FIManager", icon: Home, tags: ["fi", "gestion"] },
  { label: "Cursus du Mois", page: "FormationSalle", icon: GraduationCap, tags: ["formation", "cursus"] },
  { label: "Dépôt Livrable", page: "FormationLabo", icon: Upload, tags: ["formation", "livrable"] },
  { label: "Mon Portfolio", page: "FormationBulletin", icon: Award, tags: ["formation", "portfolio"] },
  { label: "Correction Board", page: "FormationCorrection", icon: CheckSquare, tags: ["formation", "correction"] },
  { label: "Assiduité Formation", page: "FormationAssiduite", icon: UserCheck, tags: ["formation", "assiduité"] },
  { label: "Opérations & Débriefs", page: "EvangelisationRadar", icon: Calendar, tags: ["évangélisation", "agenda"] },
  { label: "Débrief", page: "EvangelisationDebrief", icon: MessageSquare, tags: ["évangélisation", "débrief"] },
  { label: "Impact & Rendement", page: "EvangelisationHeatmap", icon: Flame, tags: ["évangélisation", "impact"] },
  { label: "ROI Tracker", page: "EvangelisationROI", icon: Calculator, tags: ["évangélisation", "roi"] },
  { label: "Studio Kanban", page: "CommunicationKanban", icon: Kanban, tags: ["communication", "studio"] },
  { label: "Bibliothèque Assets", page: "CommunicationBibliotheque", icon: Library, tags: ["communication", "assets"] },
  { label: "Funnel Analytics", page: "CommunicationFunnel", icon: BarChart2, tags: ["communication", "analytics"] },
  { label: "Directives Com", page: "CommunicationDirectives", icon: Briefcase, tags: ["communication", "directives"] },
];

export default function GlobalHeader({ user, currentPage }) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);
  const [showCockpit, setShowCockpit] = useState(false);
  const [notifs, setNotifs] = useState([
    { id: 1, title: "Nouveau livrable soumis", desc: "Un pilote a déposé un livrable en attente de correction.", time: "5 min", dot: "bg-blue-400", read: false },
    { id: 2, title: "Recommandation approuvée", desc: "Votre recommandation a été approuvée par le Trône.", time: "1h", dot: "bg-emerald-400", read: false },
    { id: 3, title: "Alerte Clinique", desc: "Un membre présente une chute libre sur 3 semaines.", time: "2h", dot: "bg-red-400", read: true },
  ]);
  const searchRef = useRef(null);
  const notifRef = useRef(null);

  const unreadCount = notifs.filter(n => !n.read).length;

  const filtered = searchQuery.length > 1
    ? ALL_PAGES.filter(p =>
        p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some(t => t.includes(searchQuery.toLowerCase()))
      )
    : [];

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setShowSearch(true); }
      if (e.key === "Escape") { setShowSearch(false); setSearchQuery(""); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 80);
  }, [showSearch]);

  // Close notifs on outside click
  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      {/* LAYER 1 — Global Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 gap-3
        bg-[#070a10]/80 backdrop-blur-2xl border-b border-white/[0.06]">
        
        {/* Gradient line bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

        {/* Logo */}
        <Link to={createPageUrl("Home")} className="flex items-center gap-2.5 flex-shrink-0 group mr-2">
          <div className="relative w-7 h-7">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 opacity-90 group-hover:opacity-100 transition-opacity shadow-lg shadow-blue-500/20" />
            <div className="relative flex items-center justify-center w-full h-full">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <span className="hidden sm:block text-sm font-bold text-white tracking-tight">EJP <span className="text-zinc-500 font-medium">OS</span></span>
        </Link>

        {/* Command Palette Button — center */}
        <button
          onClick={() => setShowSearch(true)}
          className="flex-1 max-w-sm mx-auto flex items-center gap-2.5 px-3 py-2 rounded-xl
            bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.07]
            text-zinc-500 hover:text-zinc-300 transition-all duration-200 group"
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0 group-hover:text-blue-400 transition-colors" />
          <span className="text-xs flex-1 text-left hidden sm:block">Rechercher une page, un membre...</span>
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] font-medium text-zinc-600">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Quick Add */}
          <button className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all">
            <Plus className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm shadow-red-500/50" />
              )}
            </button>
            <AnimatePresence>
              {showNotifs && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-2 w-76 rounded-2xl border border-white/10 bg-[#0d1018]/98 backdrop-blur-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">Notifications</span>
                      {unreadCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">{unreadCount}</span>}
                    </div>
                    <button onClick={() => setNotifs(n => n.map(x => ({ ...x, read: true })))} className="text-[10px] text-zinc-500 hover:text-blue-400 transition-colors">
                      Tout lire
                    </button>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {notifs.map(n => (
                      <div key={n.id} onClick={() => setNotifs(p => p.map(x => x.id === n.id ? { ...x, read: true } : x))}
                        className={cn("flex gap-3 px-4 py-3 cursor-pointer transition-colors", n.read ? "opacity-40" : "hover:bg-white/[0.04]")}>
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1.5", n.dot)} />
                        <div>
                          <p className="text-xs font-semibold text-white">{n.title}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{n.desc}</p>
                          <p className="text-[10px] text-zinc-700 mt-1">Il y a {n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Avatar / Cockpit trigger */}
          <button
            onClick={() => setShowCockpit(true)}
            className="flex items-center gap-2 ml-1 p-1 pr-2.5 rounded-xl hover:bg-white/[0.06] transition-all group"
          >
            <div className="relative w-7 h-7">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-500/20">
                {user?.full_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border-2 border-[#070a10]" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-[11px] font-semibold text-white leading-none">{user?.full_name?.split(" ")[0] || "Moi"}</p>
            </div>
          </button>
        </div>
      </header>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-md"
            onClick={() => { setShowSearch(false); setSearchQuery(""); }}
          >
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-lg mx-4 rounded-2xl border border-white/10 bg-[#0d1018]/99 backdrop-blur-2xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
                <Search className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une page, un membre, une FI..."
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                />
                <button onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
                  <X className="w-4 h-4 text-zinc-600 hover:text-zinc-300 transition-colors" />
                </button>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {searchQuery.length < 2 ? (
                  <div className="p-4">
                    <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Navigation rapide</p>
                    <div className="grid grid-cols-2 gap-1">
                      {ALL_PAGES.slice(0, 6).map(p => (
                        <Link key={p.page} to={createPageUrl(p.page)}
                          onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-all">
                          <p.icon className="w-3.5 h-3.5 text-zinc-600" />
                          <span className="truncate">{p.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-zinc-600">Aucun résultat pour "{searchQuery}"</p>
                ) : (
                  <div className="p-2">
                    {filtered.map(p => (
                      <Link key={p.page} to={createPageUrl(p.page)}
                        onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-all group">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                          <p.icon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <span>{p.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-white/[0.06] flex items-center gap-4">
                <span className="text-[10px] text-zinc-700 flex items-center gap-1"><kbd className="px-1 rounded bg-white/[0.04] border border-white/[0.06]">↵</kbd> Ouvrir</span>
                <span className="text-[10px] text-zinc-700 flex items-center gap-1"><kbd className="px-1 rounded bg-white/[0.04] border border-white/[0.06]">ESC</kbd> Fermer</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Cockpit */}
      <UserCockpit open={showCockpit} onClose={() => setShowCockpit(false)} user={user} />
    </>
  );
}