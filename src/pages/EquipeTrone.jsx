import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Crown, Mail, Shield } from "lucide-react";

const ROLE_LABELS = {
  admin: "Administrateur",
  responsable_general: "Responsable Général",
};

const ROLE_ROLES = ["responsable_general", "admin"];

function MemberCard({ user }) {
  const initials = user.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  return (
    <div className="ai-card p-5 flex flex-col items-center gap-3 text-center card-hover">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
        {initials}
      </div>
      <div>
        <p className="font-semibold text-white">{user.full_name}</p>
        <p className="text-xs text-amber-400 font-medium mt-0.5">{ROLE_LABELS[user.role] || user.role}</p>
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

export default function EquipeTronePage() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-trone"],
    queryFn: () => base44.entities.User.list(),
  });

  const membres = users.filter(u => ROLE_ROLES.includes(u.role));

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-10 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
          <Crown className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Équipe — Niveau Trône</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Le sommet stratégique — Décision et Orientation</p>
        </div>
      </div>

      {/* Members */}
      {isLoading ? (
        <div className="text-center py-20 text-zinc-600">Chargement...</div>
      ) : membres.length === 0 ? (
        <div className="text-center py-20 text-zinc-600">Aucun membre trouvé.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {membres.map(u => <MemberCard key={u.id} user={u} />)}
        </div>
      )}
    </div>
  );
}