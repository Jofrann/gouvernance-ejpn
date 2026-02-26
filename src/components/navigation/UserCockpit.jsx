import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  X, LogOut, Settings, User, Monitor, Smartphone, Wifi,
  Bell, BellOff, Shield, Edit3, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
import { Switch } from "@/components/ui/switch";

const ROLE_LABELS = {
  admin: "Administrateur",
  trone: "Trône",
  gouvernance_direction: "Directrice d'Exécution",
  gouvernance_suivi: "Resp. de Suivi",
  gouvernance_strategie: "Analyste Stratégique",
  pilote_fi: "Pilote FI",
  copilote_fi: "Co-Pilote FI",
  responsable_fi: "Responsable FI",
  etudiant: "Pilote en Formation",
  responsable_formation: "Resp. Formation",
  agent_terrain: "Agent Terrain",
  agent_virtuel: "Agent Virtuel",
  responsable_evangelisation: "Resp. Évangélisation",
  producteur: "Producteur",
  createur: "Créateur",
  responsable_communication: "Resp. Communication",
};

const RADAR_DATA = [
  { axis: "Leadership", value: 80 },
  { axis: "Pastorale", value: 65 },
  { axis: "Évangélisation", value: 72 },
  { axis: "Formation", value: 88 },
  { axis: "Communication", value: 60 },
];

const SESSIONS = [
  { device: "MacBook Pro", location: "Paris, FR", icon: Monitor, active: true },
  { device: "iPhone 15", location: "Nantes, FR", icon: Smartphone, active: false },
];

function InlineEdit({ value, onSave, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");

  const save = () => { onSave(val); setEditing(false); };

  if (editing) return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        className="bg-white/[0.06] border border-white/[0.12] rounded-lg px-2.5 py-1 text-sm text-white outline-none focus:border-blue-500/60 transition-colors w-full"
        placeholder={placeholder}
      />
      <button onClick={save} className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors">
        <Check className="w-3 h-3 text-blue-400" />
      </button>
    </div>
  );

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 group text-left w-full"
    >
      <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{value || <span className="text-zinc-600 italic">{placeholder}</span>}</span>
      <Edit3 className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100" />
    </button>
  );
}

export default function UserCockpit({ open, onClose, user }) {
  const [notifs, setNotifs] = useState({
    anniversaires: true,
    corrections: true,
    alertes_clinique: true,
    recommandations: false,
  });

  const role = user?.role || "admin";

  const handleSave = async (field, value) => {
    await base44.auth.updateMe({ [field]: value });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Cockpit panel */}
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed top-4 right-4 bottom-4 z-[56] w-[380px] rounded-2xl border border-white/[0.08]
              bg-[#0d1018]/98 backdrop-blur-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-white">Cockpit Personnel</span>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  to={createPageUrl("Parametres")}
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition-all"
                >
                  <Settings className="w-4 h-4" />
                </Link>
                <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* ID Card */}
              <div className="p-5 border-b border-white/[0.06]">
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-blue-500/20">
                      {user?.full_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-[#0d1018] shadow-sm shadow-emerald-400/50" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-base font-bold text-white">{user?.full_name || "Utilisateur"}</p>
                    <p className="text-xs text-zinc-500">{user?.email}</p>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] font-semibold uppercase tracking-wider">
                      {ROLE_LABELS[role] || role}
                    </span>
                  </div>
                </div>

                {/* Inline editable fields */}
                <div className="mt-4 space-y-3 bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
                  <div>
                    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1">Téléphone</p>
                    <InlineEdit
                      value={user?.phone}
                      placeholder="Ajouter un numéro..."
                      onSave={(v) => handleSave("phone", v)}
                    />
                  </div>
                  <div className="h-px bg-white/[0.04]" />
                  <div>
                    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1">Ville</p>
                    <InlineEdit
                      value={user?.ville}
                      placeholder="Ex: Paris, Lyon..."
                      onSave={(v) => handleSave("ville", v)}
                    />
                  </div>
                </div>
              </div>

              {/* Radar de Croissance */}
              <div className="p-5 border-b border-white/[0.06]">
                <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                  Radar de Croissance
                </p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={RADAR_DATA}>
                      <PolarGrid stroke="rgba(255,255,255,0.04)" />
                      <PolarAngleAxis dataKey="axis" tick={{ fill: "#52525b", fontSize: 10 }} />
                      <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={1.5} dot={{ fill: "#3b82f6", r: 2 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sessions */}
              <div className="p-5 border-b border-white/[0.06]">
                <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Centre de Sécurité
                </p>
                <div className="space-y-2">
                  {SESSIONS.map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <div key={i} className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all",
                        s.active ? "bg-emerald-500/[0.04] border-emerald-500/20" : "bg-white/[0.02] border-white/[0.04]"
                      )}>
                        <Icon className={cn("w-4 h-4", s.active ? "text-emerald-400" : "text-zinc-600")} />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-zinc-300">{s.device}</p>
                          <p className="text-[10px] text-zinc-600">{s.location}</p>
                        </div>
                        {s.active ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                            <Wifi className="w-3 h-3" /> Live
                          </span>
                        ) : (
                          <button className="text-[10px] text-red-500 hover:text-red-400 font-semibold transition-colors">
                            Déconnecter
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notifications */}
              <div className="p-5">
                <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                  Notifications Granulaires
                </p>
                <div className="space-y-3">
                  {[
                    { key: "anniversaires", label: "Anniversaires FI", desc: "Rappels dates importantes" },
                    { key: "corrections", label: "Corrections livrables", desc: "Quand vos livrables sont notés" },
                    { key: "alertes_clinique", label: "Alertes Clinique", desc: "Chutes libres détectées" },
                    { key: "recommandations", label: "Recommandations", desc: "Réponses du Trône" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-zinc-300">{item.label}</p>
                        <p className="text-[10px] text-zinc-600">{item.desc}</p>
                      </div>
                      <Switch
                        checked={notifs[item.key]}
                        onCheckedChange={v => setNotifs(prev => ({ ...prev, [item.key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t border-white/[0.06]">
              <button
                onClick={() => base44.auth.logout()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium
                  text-red-400 hover:text-red-300 bg-red-500/[0.06] hover:bg-red-500/[0.12] border border-red-500/10
                  hover:border-red-500/20 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}