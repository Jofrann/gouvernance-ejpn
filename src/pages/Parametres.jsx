import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Users, Plus, Pencil, Trash2, Crown, Shield, Briefcase, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLES = [
  // Niveau I
  { value: "admin", label: "Admin Plateforme", niveau: "I", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "responsable_general", label: "Responsable Général FIJ", niveau: "I", color: "bg-amber-100 text-amber-800 border-amber-200" },
  // Niveau II
  { value: "directrice_execution", label: "Directrice d'Exécution", niveau: "II", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "responsable_suivi", label: "Responsable de Suivi", niveau: "II", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "analyste_strategique", label: "Analyste Stratégique", niveau: "II", color: "bg-blue-100 text-blue-800 border-blue-200" },
  // Niveau III — FI
  { value: "responsable_fi", label: "Responsable Pôle FI", niveau: "III", pole: "familles_impact", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "pilote_fi", label: "Pilote de FI", niveau: "III", pole: "familles_impact", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "copilote_fi", label: "Co-Pilote de FI", niveau: "III", pole: "familles_impact", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  // Niveau III — Formation
  { value: "responsable_formation", label: "Responsable Formation", niveau: "III", pole: "formation", color: "bg-violet-100 text-violet-800 border-violet-200" },
  { value: "etudiant", label: "Pilote en Formation", niveau: "III", pole: "formation", color: "bg-violet-100 text-violet-800 border-violet-200" },
  // Niveau III — Évangélisation
  { value: "responsable_evangelisation", label: "Responsable Évangélisation", niveau: "III", pole: "evangelisation", color: "bg-rose-100 text-rose-800 border-rose-200" },
  { value: "agent_terrain", label: "Agent Terrain", niveau: "III", pole: "evangelisation", color: "bg-rose-100 text-rose-800 border-rose-200" },
  { value: "agent_virtuel", label: "Agent Virtuel", niveau: "III", pole: "evangelisation", color: "bg-rose-100 text-rose-800 border-rose-200" },
  // Niveau III — Communication
  { value: "responsable_communication", label: "Responsable Communication", niveau: "III", pole: "communication", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "producteur", label: "Producteur", niveau: "III", pole: "communication", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "createur", label: "Créateur de Contenu", niveau: "III", pole: "communication", color: "bg-orange-100 text-orange-800 border-orange-200" },
];

const POLES = [
  { value: "", label: "— Aucun pôle (Niveaux I & II) —" },
  { value: "familles_impact", label: "Pôle Familles d'Impact" },
  { value: "formation", label: "Pôle Formation" },
  { value: "evangelisation", label: "Pôle Évangélisation" },
  { value: "communication", label: "Pôle Communication" },
];

const NIVEAUX = [
  { value: "trone", label: "Niveau I — Direction" },
  { value: "gouvernance", label: "Niveau II — Gouvernance" },
  { value: "execution", label: "Niveau III — Exécution" },
];

const NIVEAU_ICONS = { I: Crown, II: Shield, III: Briefcase };
const NIVEAU_COLORS = {
  I: "text-amber-400",
  II: "text-blue-400",
  III: "text-emerald-400",
};

// Dark-theme role colors
const ROLES_DARK = [
  { value: "admin", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  { value: "responsable_general", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  { value: "directrice_execution", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  { value: "responsable_suivi", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  { value: "analyste_strategique", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  { value: "responsable_fi", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { value: "pilote_fi", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { value: "copilote_fi", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { value: "responsable_formation", color: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  { value: "etudiant", color: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  { value: "responsable_evangelisation", color: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  { value: "agent_terrain", color: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  { value: "agent_virtuel", color: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  { value: "responsable_communication", color: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  { value: "producteur", color: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  { value: "createur", color: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
];

function getRoleInfo(roleValue) {
  const base = ROLES.find((r) => r.value === roleValue) || { label: roleValue, niveau: "III" };
  const dark = ROLES_DARK.find((r) => r.value === roleValue) || { color: "bg-white/10 text-zinc-300 border-white/20" };
  return { ...base, color: dark.color };
}

function UserRow({ user, onEdit, onDelete, isCurrentUser }) {
  const userRoles = Array.isArray(user.roles) && user.roles.length > 0
    ? user.roles
    : Array.isArray(user?.data?.roles) && user.data.roles.length > 0
    ? user.data.roles
    : user.role ? [user.role] : ["user"];
  const primaryRole = getRoleInfo(userRoles[0]);
  const NiveauIcon = NIVEAU_ICONS[primaryRole.niveau] || Briefcase;
  return (
    <tr className="border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/40 to-violet-600/40 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
            {(user.full_name || user.email || "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user.full_name || "—"}</p>
            <p className="text-xs text-zinc-500">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex flex-wrap items-center gap-1">
          <NiveauIcon className={cn("w-3.5 h-3.5 flex-shrink-0", NIVEAU_COLORS[primaryRole.niveau])} />
          {userRoles.map(r => {
            const info = getRoleInfo(r);
            return <Badge key={r} variant="outline" className={cn("text-[10px] border", info.color)}>{info.label}</Badge>;
          })}
        </div>
      </td>
      <td className="py-3 px-4">
        {user.pole ? (
          <span className="text-xs text-zinc-400">{POLES.find((p) => p.value === user.pole)?.label?.replace("Pôle ", "") || user.pole}</span>
        ) : (
          <span className="text-xs text-zinc-700">—</span>
        )}
      </td>
      <td className="py-3 px-4">
        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
          {NIVEAUX.find((n) => n.value === user.niveau)?.label?.split("—")[0]?.trim() || "—"}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 justify-end">
          <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/10" onClick={() => onEdit(user)}>
            <Pencil className="w-3.5 h-3.5 text-zinc-500" />
          </Button>
          {!isCurrentUser && (
            <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-red-500/10" onClick={() => onDelete(user)}>
              <Trash2 className="w-3.5 h-3.5 text-red-500/70" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function ParametresPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [form, setForm] = useState({ roles: ["pilote_fi"], niveau: "execution", pole: "familles_impact" });

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const meRoles = Array.isArray(me?.roles) && me.roles.length > 0
    ? me.roles
    : Array.isArray(me?.data?.roles) && me.data.roles.length > 0
    ? me.data.roles
    : me?.role ? [me.role] : [];
  const isAdmin = meRoles.includes("admin");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="px-6 py-10 max-w-7xl mx-auto">
        <div className="ai-card flex flex-col items-center justify-center py-24 rounded-2xl">
          <Shield className="w-10 h-10 text-zinc-600 mb-3" />
          <p className="text-sm font-semibold text-zinc-400">Accès réservé aux administrateurs</p>
        </div>
      </div>
    );
  }

  const filtered = users.filter((u) => {
    const uRoles = Array.isArray(u.roles) && u.roles.length > 0
      ? u.roles
      : Array.isArray(u?.data?.roles) && u.data.roles.length > 0
      ? u.data.roles
      : u.role ? [u.role] : [];
    return (
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      uRoles.some(r => r.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const openCreate = () => {
    setEditUser(null);
    setInviteEmail("");
    setForm({ roles: ["pilote_fi"], niveau: "execution", pole: "familles_impact" });
    setSheetOpen(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    const existingRoles = Array.isArray(user.roles) && user.roles.length > 0
      ? user.roles
      : Array.isArray(user?.data?.roles) && user.data.roles.length > 0
      ? user.data.roles
      : user.role ? [user.role] : ["pilote_fi"];
    const primaryRoleInfo = getRoleInfo(existingRoles[0]);
    const niveauMap = { "I": "trone", "II": "gouvernance", "III": "execution" };
    setForm({ roles: existingRoles, niveau: niveauMap[primaryRoleInfo.niveau] || "execution", pole: user.pole || primaryRoleInfo.pole || "" });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const primaryRole = form.roles[0] || "user";
    if (editUser) {
      await base44.entities.User.update(editUser.id, {
        role: primaryRole,
        roles: form.roles,
        niveau: form.niveau,
        pole: form.pole,
      });
      toast.success("Utilisateur mis à jour");
    } else {
      if (!inviteEmail) { toast.error("Email requis"); setSaving(false); return; }
      await base44.users.inviteUser(inviteEmail, primaryRole === "admin" ? "admin" : "user");
      toast.success(`Invitation envoyée à ${inviteEmail}`);
    }
    queryClient.invalidateQueries({ queryKey: ["users"] });
    setSheetOpen(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.User.delete(deleteTarget.id);
    queryClient.invalidateQueries({ queryKey: ["users"] });
    toast.success("Utilisateur supprimé");
    setDeleteTarget(null);
  };

  const handleRoleToggle = (value) => {
    const currentRoles = form.roles || [];
    let newRoles;
    if (currentRoles.includes(value)) {
      newRoles = currentRoles.filter(r => r !== value);
      if (newRoles.length === 0) return; // Au moins 1 rôle requis
    } else {
      newRoles = [...currentRoles, value];
    }
    // Auto-update niveau and pole from primary role
    const primaryRoleInfo = getRoleInfo(newRoles[0]);
    const niveauMap = { "I": "trone", "II": "gouvernance", "III": "execution" };
    setForm(prev => ({
      ...prev,
      roles: newRoles,
      niveau: niveauMap[primaryRoleInfo.niveau] || "execution",
      pole: primaryRoleInfo.pole || prev.pole || "",
    }));
  };

  // Group by niveau for display (based on primary role)
  const byNiveau = {
    I: filtered.filter((u) => {
      const uRoles = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : u.role ? [u.role] : [];
      return getRoleInfo(uRoles[0]).niveau === "I";
    }),
    II: filtered.filter((u) => {
      const uRoles = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : u.role ? [u.role] : [];
      return getRoleInfo(uRoles[0]).niveau === "II";
    }),
    III: filtered.filter((u) => {
      const uRoles = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : u.role ? [u.role] : [];
      return getRoleInfo(uRoles[0]).niveau === "III";
    }),
  };

  return (
    <div className="px-6 py-10 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.25em] mb-1">Administration</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Gestion des Utilisateurs</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{users.length} compte{users.length !== 1 ? "s" : ""} · Hiérarchie à 3 niveaux</p>
        </div>
        <button className="btn-glow-blue px-4 py-2.5 flex items-center gap-2" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Inviter un utilisateur
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input className="input-glass pl-9" placeholder="Rechercher par nom, email ou rôle…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { n: "I", Icon: Crown, color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5" },
          { n: "II", Icon: Shield, color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/5" },
          { n: "III", Icon: Briefcase, color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
        ].map(({ n, Icon, color, border, bg }) => (
          <div key={n} className={cn("rounded-xl border p-4 flex items-center gap-3", bg, border)}>
            <Icon className={cn("w-5 h-5", color)} />
            <div>
              <p className={cn("text-[10px] font-bold uppercase tracking-wider", color)}>Niveau {n}</p>
              <p className="text-xl font-bold text-white">{byNiveau[n].length}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="ai-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/[0.06]">
              <tr>
                {["Utilisateur", "Rôle", "Pôle", "Niveau", ""].map((h) => (
                  <th key={h} className="text-left py-2.5 px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="py-16 text-center text-sm text-zinc-600">Chargement…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-sm text-zinc-600"><Users className="w-8 h-8 text-zinc-700 mx-auto mb-2" />Aucun utilisateur trouvé</td></tr>
              ) : filtered.map((u) => (
                <UserRow key={u.id} user={u} onEdit={openEdit} onDelete={setDeleteTarget} isCurrentUser={u.id === me?.id} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-[#0d1018] border-white/10 text-white">
          <SheetHeader className="pb-4 border-b border-white/10">
            <SheetTitle className="text-white">{editUser ? `Modifier — ${editUser.full_name || editUser.email}` : "Inviter un utilisateur"}</SheetTitle>
          </SheetHeader>
          <div className="py-5 space-y-5">
            {!editUser && (
              <div>
                <label className="text-xs font-medium text-zinc-500">Adresse email *</label>
                <input className="input-glass mt-1" type="email" placeholder="prenom.nom@ejpn.org" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
            )}

            {/* Roles — multi-sélection */}
            <div>
              <label className="text-xs font-medium text-zinc-500">Rôles * <span className="text-zinc-600 font-normal">(cochez un ou plusieurs)</span></label>
              <div className="mt-2 space-y-3 max-h-72 overflow-y-auto pr-1">
                {[
                  { label: "Niveau I — Direction", color: "text-amber-400", roles: ROLES.filter(r => r.niveau === "I") },
                  { label: "Niveau II — Gouvernance", color: "text-blue-400", roles: ROLES.filter(r => r.niveau === "II") },
                  { label: "Niveau III — FI", color: "text-emerald-400", roles: ROLES.filter(r => r.pole === "familles_impact") },
                  { label: "Niveau III — Formation", color: "text-violet-400", roles: ROLES.filter(r => r.pole === "formation") },
                  { label: "Niveau III — Évangélisation", color: "text-rose-400", roles: ROLES.filter(r => r.pole === "evangelisation") },
                  { label: "Niveau III — Communication", color: "text-orange-400", roles: ROLES.filter(r => r.pole === "communication") },
                ].map(section => (
                  <div key={section.label}>
                    <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1.5", section.color)}>{section.label}</p>
                    <div className="space-y-1">
                      {section.roles.map(r => {
                        const checked = (form.roles || []).includes(r.value);
                        return (
                          <label key={r.value} className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all",
                            checked ? "bg-white/10 border-white/20" : "border-white/[0.06] hover:bg-white/5"
                          )}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleRoleToggle(r.value)}
                              className="rounded accent-blue-500"
                            />
                            <span className="text-sm text-zinc-300">{r.label}</span>
                            {checked && (form.roles || [])[0] === r.value && (
                              <span className="ml-auto text-[10px] font-semibold text-zinc-500">Principal</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview badges */}
            {(form.roles || []).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="text-xs text-zinc-500 mr-1">Accès accordés :</span>
                {(form.roles || []).map(r => (
                  <Badge key={r} variant="outline" className={cn("text-[10px] border", getRoleInfo(r).color)}>
                    {getRoleInfo(r).label}
                  </Badge>
                ))}
              </div>
            )}

            <button className="btn-glow-blue w-full py-2.5" disabled={saving} onClick={handleSave}>
              {saving ? "Enregistrement…" : editUser ? "Enregistrer les modifications" : "Envoyer l'invitation"}
            </button>

            {editUser && (
              <p className="text-[11px] text-zinc-600 text-center">
                L'utilisateur verra ses nouveaux accès dès sa prochaine connexion.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#0d1018] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              <strong className="text-zinc-300">{deleteTarget?.full_name || deleteTarget?.email}</strong> perdra immédiatement tout accès à la plateforme. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10">Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30" onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}