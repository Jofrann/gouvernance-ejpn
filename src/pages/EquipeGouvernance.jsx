import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Mail, Target, Eye, FlaskConical } from "lucide-react";

const ROLE_LABELS = {
  directrice_execution: "Directrice d'Exécution",
  responsable_suivi: "Responsable de Suivi",
  analyste_strategique: "Analyste Stratégique",
};

const ROLE_GROUPS = [
  { key: "directrice_execution", label: "Directrice d'Exécution", icon: Target, color: "from-blue-500 to-indigo-600" },
  { key: "responsable_suivi", label: "Responsable de Suivi", icon: Eye, color: "from-indigo-500 to-purple-600" },
  { key: "analyste_strategique", label: "Analyste Stratégique", icon: FlaskConical, color: "from-purple-500 to-violet-600" },
];

function MemberCard({ user }) {
  const group = ROLE_GROUPS.find(g => g.key === user.role);
  const initials = user.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const gradient = group?.color || "from-blue-500 to-indigo-600";

  return (
    <div className="ai-card p-5 flex flex-col items-center gap-3 text-center card-hover">
      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
        {initials}
      </div>
      <div>
        <p className="font-semibold text-white">{user.full_name}</p>
        <p className="text-xs text-blue-400 font-medium mt-0.5">{ROLE_LABELS[user.role] || user.role}</p>
      </div>
      <a
        href={`mailto:${user.email}`}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Mail className="w-3 h-3" />
        {user.email}
      </a>
    </div>
  );
}

export default function EquipeGouvernancePage() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-gouvernance"],
    queryFn: () => base44.entities.User.list(),
  });

  const roleKeys = ROLE_GROUPS.map(g => g.key);
  const membres = users.filter(u => roleKeys.includes(u.role));

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-10 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Équipe — Gouvernance</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Le Pipeline Traducteur — 3 étapes stratégiques</p>
        </div>
      </div>

      {/* Grouped by role */}
      {isLoading ? (
        <div className="text-center py-20 text-zinc-600">Chargement...</div>
      ) : membres.length === 0 ? (
        <div className="text-center py-20 text-zinc-600">Aucun membre trouvé.</div>
      ) : (
        <div className="space-y-8">
          {ROLE_GROUPS.map(group => {
            const groupMembers = membres.filter(u => u.role === group.key);
            if (groupMembers.length === 0) return null;
            return (
              <div key={group.key}>
                <div className="flex items-center gap-2 mb-4">
                  <group.icon className="w-4 h-4 text-zinc-500" />
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{group.label}</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {groupMembers.map(u => <MemberCard key={u.id} user={u} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}