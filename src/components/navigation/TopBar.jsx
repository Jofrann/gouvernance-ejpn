import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Bell, Menu, X, Command, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

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

const NIVEAU_COLORS = {
  trone: "bg-amber-100 text-amber-800",
  gouvernance: "bg-blue-100 text-blue-800",
  execution: "bg-emerald-100 text-emerald-800",
};

export default function TopBar({ user, onToggleSidebar, sidebarOpen }) {
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

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

  const niveau = user?.niveau || "execution";
  const role = user?.role || "admin";

  return (
    <header className="h-14 border-b border-zinc-200 bg-white flex items-center px-4 gap-3 flex-shrink-0">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className="lg:hidden h-8 w-8"
      >
        {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </Button>

      {/* Search bar */}
      <div className="flex-1 max-w-md">
        <button
          onClick={() => {
            setShowSearch(true);
            setTimeout(() => searchRef.current?.focus(), 100);
          }}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-400 hover:border-zinc-300 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Recherche rapide...</span>
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-200/60 text-[10px] font-medium text-zinc-500">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className={cn("text-[10px] font-semibold uppercase tracking-wide", NIVEAU_COLORS[niveau])}>
          {niveau}
        </Badge>

        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="w-4 h-4 text-zinc-500" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-zinc-200">
          <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-bold">
            {user?.full_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-zinc-900 leading-none">{user?.full_name || "Utilisateur"}</p>
            <p className="text-[10px] text-zinc-400">{ROLE_LABELS[role] || role}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => base44.auth.logout()}
        >
          <LogOut className="w-3.5 h-3.5 text-zinc-400" />
        </Button>
      </div>

      {/* Command Palette Overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/40" onClick={() => setShowSearch(false)}>
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
              <Search className="w-4 h-4 text-zinc-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Rechercher une page, un membre, une FI..."
                className="flex-1 text-sm outline-none placeholder:text-zinc-400"
              />
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] font-medium text-zinc-400">ESC</kbd>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto">
              <p className="px-3 py-6 text-center text-sm text-zinc-400">Tapez pour rechercher...</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}