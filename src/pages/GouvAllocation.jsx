import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Home, GraduationCap, Globe, Megaphone, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const POLE_CONFIG = [
  { key: "familles_impact", label: "Familles d'Impact", icon: Home, color: "text-emerald-600", bg: "bg-emerald-50", roles: ["pilote_fi", "copilote_fi", "responsable_fi"] },
  { key: "formation", label: "Formation", icon: GraduationCap, color: "text-violet-600", bg: "bg-violet-50", roles: ["etudiant", "responsable_formation"] },
  { key: "evangelisation", label: "Évangélisation", icon: Globe, color: "text-rose-600", bg: "bg-rose-50", roles: ["agent_terrain", "agent_virtuel", "responsable_evangelisation"] },
  { key: "communication", label: "Communication", icon: Megaphone, color: "text-orange-600", bg: "bg-orange-50", roles: ["producteur", "createur", "responsable_communication"] },
];

export default function GouvAllocationPage() {
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });
  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres-all"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });

  const totalUsers = users.filter((u) => u.role !== "admin").length;

  const poleStats = useMemo(() => POLE_CONFIG.map((p) => {
    const poleUsers = users.filter((u) => p.roles.includes(u.role));
    return { ...p, count: poleUsers.length, users: poleUsers };
  }), [users]);

  const fiStats = useMemo(() => familles.map((fi) => {
    const fiMembres = membres.filter((m) => m.famille_impact_id === fi.id);
    const pilotes = users.filter((u) => u.email === fi.pilote_email || u.email === fi.co_pilote_email);
    return { fi, membres: fiMembres.length, pilotes: pilotes.length, objectif: fi.objectif_membres || 12, taux: Math.round((fiMembres.length / (fi.objectif_membres || 12)) * 100) };
  }), [familles, membres, users]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Planification Opérationnelle</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Allocation des ressources humaines par pôle</p>
      </div>

      {/* Global */}
      <div className="p-4 rounded-xl bg-zinc-900 text-white flex items-center gap-4">
        <Users className="w-8 h-8 text-zinc-400 flex-shrink-0" />
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-wider">Effectif Total Opérationnel</p>
          <p className="text-4xl font-bold">{totalUsers}</p>
        </div>
        <div className="ml-auto grid grid-cols-2 gap-x-8 gap-y-1 text-right">
          <div><p className="text-2xl font-bold">{familles.filter((f) => f.status === "active").length}</p><p className="text-xs text-zinc-400">FI Actives</p></div>
          <div><p className="text-2xl font-bold">{membres.length}</p><p className="text-xs text-zinc-400">Membres suivis</p></div>
        </div>
      </div>

      {/* Pole allocation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {poleStats.map((p) => {
          const Icon = p.icon;
          const share = totalUsers > 0 ? Math.round((p.count / totalUsers) * 100) : 0;
          return (
            <Card key={p.key} className="border-zinc-200 bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("p-2.5 rounded-lg", p.bg)}>
                    <Icon className={cn("w-5 h-5", p.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{p.label}</p>
                    <p className="text-xs text-zinc-400">{p.count} agent{p.count !== 1 ? "s" : ""} · {share}% des effectifs</p>
                  </div>
                </div>
                <Progress value={share} className="h-1.5 mb-3" />
                <div className="space-y-1">
                  {p.users.slice(0, 5).map((u) => (
                    <div key={u.id} className="flex items-center gap-2 py-1">
                      <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-600">{(u.full_name || u.email || "?")[0].toUpperCase()}</div>
                      <span className="text-xs text-zinc-700 truncate">{u.full_name || u.email}</span>
                      <Badge className="ml-auto text-[9px] bg-zinc-100 text-zinc-500 border border-zinc-200">{u.role?.replace(/_/g, " ")}</Badge>
                    </div>
                  ))}
                  {p.users.length > 5 && <p className="text-[10px] text-zinc-400 text-center">+{p.users.length - 5} autres</p>}
                  {p.users.length === 0 && <p className="text-xs text-zinc-400 py-2 text-center">Aucun agent affecté</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FI capacity */}
      <Card className="border-zinc-200 bg-white">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Capacité des Familles d'Impact</CardTitle></CardHeader>
        <CardContent>
          {fiStats.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">Aucune Famille d'Impact créée</p>
          ) : (
            <div className="space-y-3">
              {fiStats.map(({ fi, membres: nb, objectif, taux }) => (
                <div key={fi.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-zinc-800">{fi.name}</span>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>{fi.campus}</span>
                      <span className={cn("font-bold", taux >= 80 ? "text-emerald-600" : taux >= 50 ? "text-amber-600" : "text-red-600")}>{nb}/{objectif} membres ({taux}%)</span>
                    </div>
                  </div>
                  <Progress value={Math.min(taux, 100)} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}