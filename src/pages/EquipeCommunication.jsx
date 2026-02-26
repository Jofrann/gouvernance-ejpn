import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Megaphone, Mail, Shield, Film, PenTool } from "lucide-react";
import MemoFlashBoard from "@/components/equipe/MemoFlashBoard";
import MemberSlideOver from "@/components/equipe/MemberSlideOver";
import LiveActivityIndicator, { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const ROLE_LABELS = {
  responsable_communication: "Responsable du Pôle",
  producteur: "Producteur",
  createur: "Créateur de Contenu",
};
const ROLE_GROUPS = [
  { key: "responsable_communication", label: "Responsable du Pôle", icon: Shield, color: "from-pink-500 to-rose-600" },
  { key: "producteur", label: "Producteurs", icon: Film, color: "from-rose-500 to-fuchsia-600" },
  { key: "createur", label: "Créateurs de Contenu", icon: PenTool, color: "from-fuchsia-500 to-purple-600" },
];

function MemberCard({ user, onClick }) {
  const group = ROLE_GROUPS.find(g => g.key === user.role);
  const initials = user.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const gradient = group?.color || "from-pink-500 to-rose-600";
  const isOnline = user.current_activity && (Date.now() - new Date(user.last_seen).getTime()) < 600000;

  return (
    <button onClick={onClick} className="ai-card p-5 flex flex-col items-center gap-3 text-center card-hover w-full">
      <div className="relative">
        <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>{initials}</div>
        {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0d1018]" />}
      </div>
      <div>
        <p className="font-semibold text-white">{user.full_name}</p>
        <p className="text-xs text-pink-400 font-medium mt-0.5">{ROLE_LABELS[user.role] || user.role}</p>
        <div className="mt-1.5"><LiveActivityIndicator activity={user.current_activity} lastSeen={user.last_seen} /></div>
      </div>
      <span className="flex items-center gap-1.5 text-xs text-zinc-600"><Mail className="w-3 h-3" />{user.email}</span>
    </button>
  );
}

export default function EquipeCommunicationPage() {
  useTrackActivity("EquipeCommunication");
  const [selectedMember, setSelectedMember] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-communication"],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 20000,
  });

  const roleKeys = ROLE_GROUPS.map(g => g.key);
  const membres = users.filter(u => roleKeys.includes(u.role));

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
          <Megaphone className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Équipe — Communication</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Pôle 4 — Production & Création de Contenu</p>
        </div>
      </div>

      <MemoFlashBoard pole="communication" user={currentUser} />

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
                  <span className="text-xs text-zinc-600">({groupMembers.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {groupMembers.map(u => <MemberCard key={u.id} user={u} onClick={() => setSelectedMember(u)} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MemberSlideOver member={selectedMember} currentUser={currentUser} allUsers={users} open={!!selectedMember} onClose={() => setSelectedMember(null)} />
    </div>
  );
}