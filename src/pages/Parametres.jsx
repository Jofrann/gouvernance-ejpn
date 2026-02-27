import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserRoles } from "@/components/shared/roleAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Plus, Pencil, Trash2, Crown, Shield, Briefcase, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLES = [
  // Niveau I — Direction (Trône)
  { value: "admin", label: "Admin Plateforme", niveau: "I", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "trone", label: "Trône / Direction", niveau: "I", color: "bg-amber-100 text-amber-800 border-amber-200" },
  // Niveau II — Gouvernance
  { value: "gouvernance_direction", label: "Directrice d'Exécution", niveau: "II", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "gouvernance_suivi", label: "Responsable de Suivi", niveau: "II", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "gouvernance_strategie", label: "Analyste Stratégique", niveau: "II", color: "bg-blue-100 text-blue-800 border-blue-200" },
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

// Map role value → niveau display key for UserRow
const ROLE_NIVEAU_MAP = {
  admin: "I", trone: "I",
  gouvernance_direction: "II", gouvernance_suivi: "II", gouvernance_strategie: "II",
};

const NIVEAU_ICONS = { I: Crown, II: Shield, III: Briefcase };
const NIVEAU_COLORS = {
  I: "text-amber-700",
  II: "text-blue-700",
  III: "text-emerald-700",
};

function getRoleInfo(roleValue) {
  return ROLES.find((r) => r.value === roleValue) || { label: roleValue, niveau: "III", color: "bg-zinc-100 text-zinc-700 border-zinc-200" };
}

function UserRow({ user, onEdit, onDelete, isCurrentUser }) {
  const userRolesList = getUserRoles(user);
  const primaryRole = getRoleInfo(userRolesList[0] || user.role);
  const NiveauIcon = NIVEAU_ICONS[primaryRole.niveau] || Briefcase;
  return (
    <tr className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
            {(user.full_name || user.email || "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">{user.full_name || "—"}</p>
            <p className="text-xs text-zinc-400">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <NiveauIcon className={cn("w-3.5 h-3.5", NIVEAU_COLORS[primaryRole.niveau])} />
          {userRolesList.map(r => {
            const info = getRoleInfo(r);
            return <Badge key={r} variant="outline" className={cn("text-[10px] border", info.color)}>{info.label}</Badge>;
          })}
        </div>
      </td>
      <td className="py-3 px-4">
        {user.pole ? (
          <span className="text-xs text-zinc-600">{POLES.find((p) => p.value === user.pole)?.label?.replace("Pôle ", "") || user.pole}</span>
        ) : (
          <span className="text-xs text-zinc-300">—</span>
        )}
      </td>
      <td className="py-3 px-4">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
          {NIVEAUX.find((n) => n.value === user.niveau)?.label?.split("—")[0]?.trim() || "—"}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 justify-end">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(user)}>
            <Pencil className="w-3.5 h-3.5 text-zinc-400" />
          </Button>
          {!isCurrentUser && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(user)}>
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
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
  const [form, setForm] = useState({ role: "pilote_fi", roles: ["pilote_fi"], niveau: "execution", pole: "familles_impact" });

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: me?.role === "admin",
  });

  if (me?.role !== "admin") {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="border-zinc-200 bg-white">
          <CardContent className="py-20 text-center">
            <Shield className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-700">Accès réservé aux administrateurs</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filtered = users.filter((u) =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.role || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditUser(null);
    setInviteEmail("");
    setForm({ role: "pilote_fi", roles: ["pilote_fi"], niveau: "execution", pole: "familles_impact" });
    setSheetOpen(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    const existingRoles = getUserRoles(user);
    setForm({ role: user.role || "pilote_fi", roles: existingRoles.length > 0 ? existingRoles : [user.role || "pilote_fi"], niveau: user.niveau || "execution", pole: user.pole || "" });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const primaryRole = (form.roles && form.roles.length > 0) ? form.roles[0] : form.role;
    if (editUser) {
      await base44.entities.User.update(editUser.id, { role: primaryRole, roles: form.roles || [primaryRole], niveau: form.niveau, pole: form.pole });
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

  const handleRoleChange = (value) => {
    const roleInfo = getRoleInfo(value);
    const niveauMap = { "I": "trone", "II": "gouvernance", "III": "execution" };
    setForm({ role: value, niveau: niveauMap[roleInfo.niveau] || "execution", pole: roleInfo.pole || "" });
  };

  // Group by niveau for display
  const byNiveau = {
    I: filtered.filter((u) => getRoleInfo(u.role).niveau === "I"),
    II: filtered.filter((u) => getRoleInfo(u.role).niveau === "II"),
    III: filtered.filter((u) => getRoleInfo(u.role).niveau === "III"),
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Gestion des Utilisateurs</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{users.length} compte{users.length !== 1 ? "s" : ""} · Hiérarchie à 3 niveaux</p>
        </div>
        <Button className="bg-zinc-900 hover:bg-zinc-800 gap-2" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Inviter un utilisateur
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input className="pl-9 bg-white border-zinc-200" placeholder="Rechercher par nom, email ou rôle…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[["I", "amber", Crown], ["II", "blue", Shield], ["III", "emerald", Briefcase]].map(([n, c, Icon]) => (
          <Card key={n} className={`border-${c}-200 bg-${c}-50/40`}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 text-${c}-600`} />
              <div>
                <p className={`text-xs font-bold text-${c}-700`}>Niveau {n}</p>
                <p className="text-xl font-bold text-zinc-900">{byNiveau[n].length}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="border-zinc-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                {["Utilisateur", "Rôle", "Pôle", "Niveau", ""].map((h) => (
                  <th key={h} className="text-left py-2.5 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="py-16 text-center text-sm text-zinc-400">Chargement…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-sm text-zinc-400"><Users className="w-8 h-8 text-zinc-200 mx-auto mb-2" />Aucun utilisateur trouvé</td></tr>
              ) : filtered.map((u) => (
                <UserRow key={u.id} user={u} onEdit={openEdit} onDelete={setDeleteTarget} isCurrentUser={u.id === me?.id} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit / Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle>{editUser ? `Modifier — ${editUser.full_name || editUser.email}` : "Inviter un utilisateur"}</SheetTitle>
          </SheetHeader>
          <div className="py-5 space-y-5">
            {!editUser && (
              <div>
                <label className="text-xs font-medium text-zinc-500">Adresse email *</label>
                <Input className="mt-1 bg-white border-zinc-200" type="email" placeholder="prenom.nom@ejpn.org" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
            )}

            {/* Role */}
            <div>
              <label className="text-xs font-medium text-zinc-500">Rôle *</label>
              <Select value={form.role} onValueChange={handleRoleChange}>
                <SelectTrigger className="mt-1 bg-white border-zinc-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-[10px] font-bold text-amber-600 uppercase tracking-wider">Niveau I — Direction (Trône)</div>
                  {ROLES.filter((r) => r.niveau === "I").map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  <div className="px-2 py-1 mt-1 text-[10px] font-bold text-blue-600 uppercase tracking-wider">Niveau II — Gouvernance</div>
                  {ROLES.filter((r) => r.niveau === "II").map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  <div className="px-2 py-1 mt-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Niveau III — FI</div>
                  {ROLES.filter((r) => r.pole === "familles_impact").map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  <div className="px-2 py-1 mt-1 text-[10px] font-bold text-violet-600 uppercase tracking-wider">Niveau III — Formation</div>
                  {ROLES.filter((r) => r.pole === "formation").map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  <div className="px-2 py-1 mt-1 text-[10px] font-bold text-rose-600 uppercase tracking-wider">Niveau III — Évangélisation</div>
                  {ROLES.filter((r) => r.pole === "evangelisation").map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  <div className="px-2 py-1 mt-1 text-[10px] font-bold text-orange-600 uppercase tracking-wider">Niveau III — Communication</div>
                  {ROLES.filter((r) => r.pole === "communication").map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Preview badge */}
            {form.role && (
              <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <span className="text-xs text-zinc-500">Accès accordé :</span>
                <Badge variant="outline" className={cn("text-[10px] border", getRoleInfo(form.role).color)}>
                  {getRoleInfo(form.role).label}
                </Badge>
              </div>
            )}

            <Button className="w-full bg-zinc-900 hover:bg-zinc-800" disabled={saving} onClick={handleSave}>
              {saving ? "Enregistrement…" : editUser ? "Enregistrer les modifications" : "Envoyer l'invitation"}
            </Button>

            {editUser && (
              <p className="text-[11px] text-zinc-400 text-center">
                L'utilisateur verra ses nouveaux accès dès sa prochaine connexion.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong> perdra immédiatement tout accès à la plateforme. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}