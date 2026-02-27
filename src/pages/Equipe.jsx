import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Crown, Shield, Home, GraduationCap, Globe, Megaphone,
  Mail, Target, Eye, FlaskConical, BookOpen, Film, PenTool,
  MapPin, Wifi, Users, ToggleLeft, ToggleRight
} from "lucide-react";
import MemoFlashBoard from "@/components/equipe/MemoFlashBoard";
import MemberSlideOver from "@/components/equipe/MemberSlideOver";
import LiveActivityIndicator, { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";
import { cn } from "@/lib/utils";
import { getPrimaryExecPole } from "@/components/shared/roleAccess";

/* ─── Pole configs ─── */
const POLES = [
  {
    key: "trone",
    label: "Trône",
    icon: Crown,
    gradient: "from-amber-500 to-orange-600",
    accent: "text-amber-400",
    pole: "trone",
    subtitle: "Sommet stratégique",
    groups: [
      { key: "responsable_general", label: "Responsable Général", icon: Crown, color: "from-amber-500 to-orange-600" },
      { key: "admin", label: "Administrateur", icon: Crown, color: "from-orange-500 to-red-600" },
    ],
  },
  {
    key: "gouvernance",
    label: "Gouvernance",
    icon: Shield,
    gradient: "from-blue-500 to-indigo-600",
    accent: "text-blue-400",
    pole: "gouvernance",
    subtitle: "Pipeline Traducteur",
    groups: [
      { key: "directrice_execution", label: "Directrice d'Exécution", icon: Target, color: "from-blue-500 to-indigo-600" },
      { key: "responsable_suivi", label: "Responsable de Suivi", icon: Eye, color: "from-indigo-500 to-purple-600" },
      { key: "analyste_strategique", label: "Analyste Stratégique", icon: FlaskConical, color: "from-purple-500 to-violet-600" },
    ],
  },
  {
    key: "familles_impact",
    label: "Familles d'Impact",
    icon: Home,
    gradient: "from-emerald-500 to-teal-600",
    accent: "text-emerald-400",
    pole: "familles_impact",
    subtitle: "Suivi hebdomadaire des maisons",
    groups: [
      { key: "responsable_fi", label: "Responsable du Pôle", icon: Shield, color: "from-emerald-500 to-teal-600" },
      { key: "pilote_fi", label: "Pilotes", icon: Home, color: "from-teal-500 to-cyan-600" },
      { key: "copilote_fi", label: "Co-Pilotes", icon: Users, color: "from-cyan-500 to-sky-600" },
    ],
  },
  {
    key: "formation",
    label: "Formation",
    icon: GraduationCap,
    gradient: "from-violet-500 to-purple-600",
    accent: "text-violet-400",
    pole: "formation",
    subtitle: "L'École des Leaders",
    groups: [
      { key: "responsable_formation", label: "Responsable du Pôle", icon: Shield, color: "from-violet-500 to-purple-600" },
      { key: "etudiant", label: "Pilotes en Formation", icon: BookOpen, color: "from-purple-500 to-pink-600" },
    ],
  },
  {
    key: "evangelisation",
    label: "Évangélisation",
    icon: Globe,
    gradient: "from-orange-500 to-red-600",
    accent: "text-orange-400",
    pole: "evangelisation",
    subtitle: "Terrain & Virtuel",
    groups: [
      { key: "responsable_evangelisation", label: "Responsable du Pôle", icon: Shield, color: "from-orange-500 to-red-600" },
      { key: "agent_terrain", label: "Agents Terrain", icon: MapPin, color: "from-red-500 to-rose-600" },
      { key: "agent_virtuel", label: "Agents Virtuels", icon: Wifi, color: "from-rose-500 to-pink-600" },
    ],
  },
  {
    key: "communication",
    label: "Communication",
    icon: Megaphone,
    gradient: "from-pink-500 to-rose-600",
    accent: "text-pink-400",
    pole: "communication",
    subtitle: "Production & Création",
    groups: [
      { key: "responsable_communication", label: "Responsable du Pôle", icon: Shield, color: "from-pink-500 to-rose-600" },
      { key: "producteur", label: "Producteurs", icon: Film, color: "from-rose-500 to-fuchsia-600" },
      { key: "createur", label: "Créateurs de Contenu", icon: PenTool, color: "from-fuchsia-500 to-purple-600" },
    ],
  },
];

function MemberCard({ user, pole, onClick }) {
  const group = pole.groups.find(g => g.key === user.role);
  const initials = user.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const gradient = group?.color || pole.gradient;
  const isOnline = user.current_activity && (Date.now() - new Date(user.last_seen).getTime()) < 600000;

  return (
    <button onClick={onClick} className="ai-card p-5 flex flex-col items-center gap-3 text-center card-hover w-full">
      <div className="relative">
        <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
          {initials}
        </div>
        {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0d1018]" />}
      </div>
      <div>
        <p className="font-semibold text-white">{user.full_name}</p>
        <p className={cn("text-xs font-medium mt-0.5", pole.accent)}>{group?.label || user.role}</p>
        <div className="mt-1.5">
          <LiveActivityIndicator activity={user.current_activity} lastSeen={user.last_seen} />
        </div>
      </div>
      <span className="flex items-center gap-1.5 text-xs text-zinc-600">
        <Mail className="w-3 h-3" />{user.email}
      </span>
    </button>
  );
}

export default function EquipePage() {
  useTrackActivity("Equipe");
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("pole") || "trone";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedMember, setSelectedMember] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-equipe"],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 20000,
  });

  const pole = POLES.find(p => p.key === activeTab) || POLES[0];
  const allRoleKeys = pole.groups.map(g => g.key);
  const membres = users.filter(u => allRoleKeys.includes(u.role));
  const PoleIcon = pole.icon;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.25em] mb-1">Organisation</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Notre Équipe</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Tous les membres de l'O.S.P — EJPN</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap mb-8 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        {POLES.map(p => {
          const Icon = p.icon;
          const isActive = activeTab === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setActiveTab(p.key)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1 justify-center",
                isActive
                  ? "bg-white/10 text-white shadow"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive && p.accent)} />
              <span className="hidden sm:inline">{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Pole header */}
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pole.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
          <PoleIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{pole.label}</h2>
          <p className="text-xs text-zinc-500">{pole.subtitle}</p>
        </div>
        <div className="ml-auto text-sm text-zinc-600">{membres.length} membre{membres.length !== 1 ? "s" : ""}</div>
      </div>

      {/* Memo flash */}
      <MemoFlashBoard pole={pole.pole} user={currentUser} />

      {/* Members */}
      {isLoading ? (
        <div className="text-center py-20 text-zinc-600 text-sm">Chargement...</div>
      ) : membres.length === 0 ? (
        <div className="text-center py-20 text-zinc-600 text-sm">Aucun membre dans ce pôle.</div>
      ) : (
        <div className="space-y-8">
          {pole.groups.map(group => {
            const groupMembers = membres.filter(u => u.role === group.key);
            if (groupMembers.length === 0) return null;
            return (
              <div key={group.key}>
                <div className="flex items-center gap-2 mb-4">
                  <group.icon className="w-4 h-4 text-zinc-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{group.label}</h3>
                  <span className="text-xs text-zinc-700">({groupMembers.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {groupMembers.map(u => (
                    <MemberCard key={u.id} user={u} pole={pole} onClick={() => setSelectedMember(u)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MemberSlideOver
        member={selectedMember}
        currentUser={currentUser}
        allUsers={users}
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </div>
  );
}