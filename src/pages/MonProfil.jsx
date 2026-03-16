import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Check, X, Shield, Crown, Briefcase, Bell, Monitor, Smartphone, LogOut, Radar, Star, Zap, Phone, Mail, User, MapPin, Sparkles, Trash2 } from "lucide-react";
import CopilotPreferences from "@/components/ai/CopilotPreferences";
import AccountDeletionDialog from "@/components/shared/AccountDeletionDialog";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar as RechartsRadar, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/* ─── CONSTANTS ─── */
const ROLE_LABELS = {
  admin: "Administrateur", responsable_general: "Responsable Général",
  directrice_execution: "Directrice d'Exécution", responsable_suivi: "Responsable de Suivi",
  analyste_strategique: "Analyste Stratégique", responsable_fi: "Responsable FI",
  pilote_fi: "Pilote de FI", copilote_fi: "Co-Pilote de FI", responsable_formation: "Resp. Formation",
  etudiant: "Pilote en Formation", responsable_evangelisation: "Resp. Évangélisation",
  agent_terrain: "Agent Terrain", agent_virtuel: "Agent Virtuel",
  responsable_communication: "Resp. Communication", producteur: "Producteur",
  createur: "Créateur de Contenu",
};

const POLE_LABELS = {
  familles_impact: "Familles d'Impact", formation: "Formation",
  evangelisation: "Évangélisation", communication: "Communication",
};

const NIVEAU_MAP = {
  trone:       { label: "Niveau I — Trône",        badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",  glow: "shadow-[0_0_60px_rgba(251,191,36,0.25)]",  ring: "ring-amber-400/40", Icon: Crown },
  gouvernance: { label: "Niveau II — Gouvernance",  badge: "bg-violet-500/15 text-violet-300 border-violet-500/30", glow: "shadow-[0_0_60px_rgba(167,139,250,0.25)]", ring: "ring-violet-400/40", Icon: Shield },
  execution:   { label: "Niveau III — Exécution",  badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",   glow: "shadow-[0_0_60px_rgba(59,130,246,0.25)]",  ring: "ring-blue-400/40",  Icon: Briefcase },
};

const DEFAULT_NOTIFS = {
  anniversaire_fi: true,
  directive_gouvernance: true,
  livrable_corrige: true,
  nouveau_decret: false,
  alerte_pastorale: true,
};

/* ─── INLINE EDITABLE FIELD ─── */
function InlineField({ label, value, field, onSave, icon: Icon, type = "text", placeholder }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setVal(value || ""); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const handleSave = async () => {
    await onSave(field, val);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") { setEditing(false); setVal(value || ""); }
  };

  return (
    <div className="group flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-zinc-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-0.5">{label}</p>
        {editing ? (
          <input
            ref={inputRef}
            type={type}
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none focus:border-blue-500/60 transition-colors"
          />
        ) : (
          <p className="text-sm text-white truncate">{val || <span className="text-zinc-600 italic">Non renseigné</span>}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {saved && <Check className="w-4 h-4 text-emerald-400 animate-pulse" />}
        {editing ? (
          <>
            <button onClick={handleSave} className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setEditing(false); setVal(value || ""); }} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── TOGGLE NOTIF ─── */
function NotifToggle({ label, description, enabled, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="flex-1">
        <p className="text-sm text-white font-medium">{label}</p>
        {description && <p className="text-[11px] text-zinc-600 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative w-10 h-5 rounded-full flex-shrink-0 transition-all duration-300",
          enabled ? "bg-blue-500" : "bg-white/10"
        )}
      >
        <span className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-lg transition-transform duration-300",
          enabled ? "translate-x-5" : "translate-x-0.5"
        )} />
      </button>
    </div>
  );
}

/* ─── DETECT CURRENT DEVICE ─── */
function detectDevice() {
  const ua = navigator.userAgent;
  let device = "Navigateur";
  let icon = Monitor;

  if (/iPhone/i.test(ua)) { device = "iPhone"; icon = Smartphone; }
  else if (/iPad/i.test(ua)) { device = "iPad"; icon = Smartphone; }
  else if (/Android/i.test(ua) && /Mobile/i.test(ua)) { device = "Android Mobile"; icon = Smartphone; }
  else if (/Android/i.test(ua)) { device = "Android Tablette"; icon = Smartphone; }
  else if (/Mac/i.test(ua)) { device = "Mac"; icon = Monitor; }
  else if (/Windows/i.test(ua)) { device = "Windows PC"; icon = Monitor; }
  else if (/Linux/i.test(ua)) { device = "Linux"; icon = Monitor; }

  let browser = "";
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Edg/i.test(ua)) browser = "Edge";

  return { device: browser ? `${device} · ${browser}` : device, icon };
}

/* ─── RADAR DATA ─── */
const RADAR_DATA = [
  { subject: "Leadership", A: 80 },
  { subject: "Évangélisation", A: 65 },
  { subject: "Formation", A: 72 },
  { subject: "Communication", A: 58 },
  { subject: "Pastoral", A: 85 },
  { subject: "Stratégie", A: 60 },
];

/* ─── GLASS CARD ─── */
function GlassCard({ children, className }) {
  return (
    <div className={cn("rounded-2xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-2xl", className)}>
      {children}
    </div>
  );
}

/* ─── MAIN PAGE ─── */
export default function MonProfilPage() {
  const qc = useQueryClient();
  const [notifs, setNotifs] = useState(DEFAULT_NOTIFS);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const currentDevice = detectDevice();

  const { data: user, isLoading } = useQuery({
    queryKey: ["me-profil"],
    queryFn: () => base44.auth.me(),
  });

  const handleSave = async (field, value) => {
    await base44.auth.updateMe({ [field]: value });
    qc.invalidateQueries({ queryKey: ["me-profil"] });
    toast.success("Sauvegardé", { duration: 1500 });
  };

  if (isLoading || !user) {
    return <div className="h-screen flex items-center justify-center text-zinc-600 text-sm">Chargement...</div>;
  }

  const niveau = user.niveau || "execution";
  const niveauInfo = NIVEAU_MAP[niveau] || NIVEAU_MAP.execution;
  const NiveauIcon = niveauInfo.Icon;
  const initials = user.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const memberSince = user.created_date ? format(new Date(user.created_date), "MMMM yyyy", { locale: fr }) : "—";

  return (
    <div className="min-h-screen px-6 py-10 max-w-7xl mx-auto">
      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white tracking-tight">Mon Cockpit Personnel</h1>
        <p className="text-xs text-zinc-600 mt-0.5">Votre carte d'accréditation numérique dans l'O.S.P — EJPN</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── LEFT: Digital ID Card ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* ID Card */}
          <GlassCard className={cn("p-6 relative overflow-hidden", niveauInfo.glow)}>
            {/* Background grid */}
            <div className="absolute inset-0 opacity-[0.02]"
              style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
            />
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Header row */}
            <div className="flex items-center justify-between mb-6 relative">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">O.S.P — EJPN</span>
              </div>
              <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider", niveauInfo.badge)}>
                {niveauInfo.label}
              </span>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center gap-4 relative">
              <div className={cn("w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-3xl font-bold shadow-2xl ring-4", niveauInfo.ring)}>
                {initials}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white tracking-tight">{user.full_name}</h2>
                <p className="text-sm text-zinc-400 mt-0.5">{ROLE_LABELS[user.role] || user.role}</p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 justify-center">
                <span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-full border", niveauInfo.badge)}>
                  <NiveauIcon className="w-2.5 h-2.5 inline mr-1" />{niveauInfo.label}
                </span>
                {user.pole && (
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-300 border-emerald-500/25">
                    {POLE_LABELS[user.pole] || user.pole}
                  </span>
                )}
                {user.role && (
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-white/5 text-zinc-400 border-white/10">
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-6 pt-4 border-t border-white/5 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-base font-bold text-white">4</p>
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Modules</p>
              </div>
              <div>
                <p className="text-base font-bold text-white">{memberSince}</p>
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Depuis</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className={cn("w-2.5 h-2.5", i <= 4 ? "text-amber-400 fill-amber-400" : "text-zinc-700")} />)}
                </div>
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Stature</p>
              </div>
            </div>
          </GlassCard>

          {/* Inline Info Editor */}
          <GlassCard className="p-5">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Informations personnelles</h3>
            <InlineField label="Nom complet" value={user.full_name} field="full_name" onSave={handleSave} icon={User} placeholder="Jean Dupont" />
            <InlineField label="Email" value={user.email} field="email" onSave={handleSave} icon={Mail} type="email" placeholder="vous@ejpn.org" />
            <InlineField label="Téléphone" value={user.telephone} field="telephone" onSave={handleSave} icon={Phone} placeholder="+33 6 00 00 00 00" />
            <InlineField label="Ville" value={user.ville} field="ville" onSave={handleSave} icon={MapPin} placeholder="Paris" />
          </GlassCard>
        </div>

        {/* ── RIGHT ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Radar de Stature */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Radar className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Radar de Stature</h3>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={RADAR_DATA} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="rgba(255,255,255,0.05)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)", fontWeight: 600 }} />
                  <RechartsRadar dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.12} strokeWidth={1.5} dot={{ r: 3, fill: "#3b82f6" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-zinc-600 text-center mt-1">Évaluation de compétences — mis à jour par la hiérarchie</p>
          </GlassCard>

          {/* Sessions actives */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Appareils connectés</h3>
              </div>
              <button
                onClick={() => toast.success("Tous les autres appareils déconnectés")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-medium"
              >
                <LogOut className="w-3 h-3" />
                Déconnecter tout
              </button>
            </div>
            <div className="space-y-2">
              {[{ id: 1, device: currentDevice.device, location: "Session active", current: true, icon: currentDevice.icon, time: "Maintenant" }].map(session => (
                <div key={session.id} className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  session.current ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/[0.02] border-white/5"
                )}>
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", session.current ? "bg-emerald-500/15" : "bg-white/5")}>
                    <session.icon className={cn("w-4 h-4", session.current ? "text-emerald-400" : "text-zinc-500")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{session.device}</p>
                    <p className="text-xs text-zinc-600">{session.location} · {session.time}</p>
                  </div>
                  {session.current ? (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Actuel</span>
                  ) : (
                    <button
                      onClick={() => toast.success("Appareil déconnecté")}
                      className="text-[10px] text-zinc-600 hover:text-red-400 px-2 py-0.5 rounded-full border border-white/5 hover:border-red-500/30 transition-all"
                    >
                      Déconnecter
                    </button>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Copilote IA Preferences */}
          <GlassCard className="p-5">
            <CopilotPreferences user={user} onSave={() => qc.invalidateQueries({ queryKey: ["me-profil"] })} />
          </GlassCard>

          {/* Danger Zone - Account Deletion */}
          <GlassCard className="p-5 border-red-500/20">
           <div className="flex items-center gap-2 mb-4">
             <Trash2 className="w-4 h-4 text-red-400" />
             <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest">Zone Dangereuse</h3>
           </div>
           <p className="text-sm text-zinc-400 mb-4">Supprimer votre compte de manière permanente et irréversible.</p>
           <button
             onClick={() => setShowDeleteDialog(true)}
             className="w-full h-10 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-medium transition-all flex items-center justify-center gap-2"
           >
             <Trash2 className="w-4 h-4" />
             Supprimer mon compte
           </button>
          </GlassCard>

          {/* Centre de notifications */}
          <GlassCard className="p-5">
           <div className="flex items-center gap-2 mb-4">
             <Bell className="w-4 h-4 text-violet-400" />
             <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Centre de notifications</h3>
           </div>
            <NotifToggle
              label="Anniversaires FI"
              description="Quand un membre de votre FI a son anniversaire"
              enabled={notifs.anniversaire_fi}
              onChange={v => setNotifs(n => ({ ...n, anniversaire_fi: v }))}
            />
            <NotifToggle
              label="Directives Gouvernance"
              description="Lorsqu'une nouvelle directive est publiée"
              enabled={notifs.directive_gouvernance}
              onChange={v => setNotifs(n => ({ ...n, directive_gouvernance: v }))}
            />
            <NotifToggle
              label="Livrable corrigé"
              description="Quand votre livrable de formation est noté"
              enabled={notifs.livrable_corrige}
              onChange={v => setNotifs(n => ({ ...n, livrable_corrige: v }))}
            />
            <NotifToggle
              label="Nouveaux décrets"
              description="Publication d'un nouveau décret par le Trône"
              enabled={notifs.nouveau_decret}
              onChange={v => setNotifs(n => ({ ...n, nouveau_decret: v }))}
            />
            <NotifToggle
              label="Alertes pastorales"
              description="Quand un membre de votre FI nécessite un suivi urgent"
              enabled={notifs.alerte_pastorale}
              onChange={v => setNotifs(n => ({ ...n, alerte_pastorale: v }))}
            />
          </GlassCard>
        </div>
      </div>

      {/* Account Deletion Dialog */}
      <AccountDeletionDialog 
        user={user} 
        isOpen={showDeleteDialog} 
        onClose={() => setShowDeleteDialog(false)} 
      />
    </div>
  );
}