import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Home, GraduationCap, Globe, Megaphone, Crown, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const WORKSPACE_CONFIG = {
  pilote_fi:              { label: "Hub Familles d'Impact", sub: "Pilote",              icon: Home,         color: "text-emerald-400", bg: "bg-emerald-500/10" },
  copilote_fi:            { label: "Hub Familles d'Impact", sub: "Co-Pilote",           icon: Home,         color: "text-emerald-400", bg: "bg-emerald-500/10" },
  responsable_fi:         { label: "Pôle Familles d'Impact", sub: "Responsable",        icon: Home,         color: "text-emerald-400", bg: "bg-emerald-500/10" },
  etudiant:               { label: "Espace Formation",       sub: "Étudiant",           icon: GraduationCap, color: "text-blue-400",    bg: "bg-blue-500/10" },
  responsable_formation:  { label: "Pôle Formation",         sub: "Responsable",        icon: GraduationCap, color: "text-blue-400",    bg: "bg-blue-500/10" },
  agent_terrain:          { label: "Pôle Évangélisation",    sub: "Agent Terrain",      icon: Globe,        color: "text-violet-400",  bg: "bg-violet-500/10" },
  agent_virtuel:          { label: "Pôle Évangélisation",    sub: "Agent Virtuel",      icon: Globe,        color: "text-violet-400",  bg: "bg-violet-500/10" },
  responsable_evangelisation: { label: "Pôle Évangélisation", sub: "Responsable",      icon: Globe,        color: "text-violet-400",  bg: "bg-violet-500/10" },
  producteur:             { label: "Pôle Communication",     sub: "Producteur",         icon: Megaphone,    color: "text-pink-400",    bg: "bg-pink-500/10" },
  createur:               { label: "Pôle Communication",     sub: "Créateur",           icon: Megaphone,    color: "text-pink-400",    bg: "bg-pink-500/10" },
  responsable_communication: { label: "Pôle Communication",  sub: "Responsable",       icon: Megaphone,    color: "text-pink-400",    bg: "bg-pink-500/10" },
  gouvernance_direction:  { label: "Gouvernance",            sub: "Direction",          icon: Shield,       color: "text-indigo-400",  bg: "bg-indigo-500/10" },
  gouvernance_suivi:      { label: "Gouvernance",            sub: "Suivi",              icon: Shield,       color: "text-indigo-400",  bg: "bg-indigo-500/10" },
  gouvernance_strategie:  { label: "Gouvernance",            sub: "Stratégie",          icon: Shield,       color: "text-indigo-400",  bg: "bg-indigo-500/10" },
  trone:                  { label: "Direction",              sub: "Trône",              icon: Crown,        color: "text-amber-400",   bg: "bg-amber-500/10" },
};

// Rôles exclus du switcher (admin voit tout via nav normale)
const SKIP_ROLES = ["admin"];

export default function WorkspaceSwitcher({ userRoles = [], activeWorkspace, onSwitch }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const workspaces = userRoles
    .filter(r => !SKIP_ROLES.includes(r) && WORKSPACE_CONFIG[r])
    .map(r => ({ role: r, ...WORKSPACE_CONFIG[r] }));

  // Only render if user has 2+ distinct workspaces
  if (workspaces.length < 2) return null;

  const active = workspaces.find(w => w.role === activeWorkspace) || workspaces[0];
  const ActiveIcon = active.icon;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-sm font-medium",
          "border-white/[0.09] hover:border-white/[0.16] hover:bg-white/[0.04]",
          open ? "bg-white/[0.06] border-white/[0.14]" : "bg-white/[0.025]",
        )}
        style={{ backdropFilter: "blur(24px)" }}
      >
        <div className={cn("w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0", active.bg)}>
          <ActiveIcon className={cn("w-3 h-3", active.color)} />
        </div>
        <span className="text-zinc-300 hidden md:inline max-w-[140px] truncate">{active.label}</span>
        <ChevronDown className={cn("w-3 h-3 text-zinc-500 transition-transform flex-shrink-0", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 3, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full left-0 mt-2 min-w-[240px] rounded-xl border border-white/10 overflow-hidden z-50"
            style={{
              background: "rgba(12,15,26,0.97)",
              backdropFilter: "blur(40px)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)"
            }}
          >
            <div className="px-3 pt-3 pb-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">Changer d'espace</p>
            </div>
            <div className="p-1.5">
              {workspaces.map(ws => {
                const WsIcon = ws.icon;
                const isActive = ws.role === (activeWorkspace || workspaces[0].role);
                return (
                  <button
                    key={ws.role}
                    onClick={() => { onSwitch(ws.role); setOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                      isActive ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", ws.bg)}>
                      <WsIcon className={cn("w-4 h-4", ws.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{ws.label}</p>
                      <p className={cn("text-[10px] font-semibold", ws.color)}>{ws.sub}</p>
                    </div>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="px-3 pb-3 pt-1 border-t border-white/[0.05]">
              <p className="text-[9px] text-zinc-700">La Sub-Nav s'adapte à l'espace actif</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}