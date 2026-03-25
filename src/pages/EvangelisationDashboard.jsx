import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Loader2, TrendingUp, Users, Target, Zap, Heart, ArrowRight } from "lucide-react";

const GlassCard = ({ children, className = "" }) => (
  <div className={cn("rounded-2xl border border-white/[0.07] p-5", className)}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
    {children}
  </div>
);

export default function EvangelisationDashboardPage() {
  const { data: actions = [], isLoading: loadingActions } = useQuery({
    queryKey: ["evang-actions-dash"],
    queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 300),
  });

  const { data: crs = [], isLoading: loadingCRs } = useQuery({
    queryKey: ["evang-crs-dash"],
    queryFn: () => base44.entities.CompteRendu.list("-created_date", 300),
  });

  const { data: ames = [], isLoading: loadingAmes } = useQuery({
    queryKey: ["evang-ames-dash"],
    queryFn: () => base44.entities.AmeVivier.list("-created_date", 500),
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["evang-interactions-dash"],
    queryFn: () => base44.entities.InteractionSuivi.list("-date_interaction", 500),
  });

  const isLoading = loadingActions || loadingCRs || loadingAmes;

  const crVerrouilles = crs.filter(cr => cr.est_verrouille);

  // KPIs agrégés depuis les CR verrouillés
  const kpis = useMemo(() => ({
    totalActions: actions.length,
    totalParticipants: crVerrouilles.reduce((s, cr) => s + (cr.participants_count || 0), 0),
    totalAbordes: crVerrouilles.reduce((s, cr) => s + (cr.abordes_count || 0), 0),
    totalContacts: crVerrouilles.reduce((s, cr) => s + (cr.contacts_pris || 0), 0),
    totalInvitations: crVerrouilles.reduce((s, cr) => s + (cr.invitations_faites || 0), 0),
    totalPrieresSalut: crVerrouilles.reduce((s, cr) => s + (cr.prieres_salut || 0), 0),
    totalAmes: ames.length,
    transferesFI: ames.filter(a => a.statut_confiance === "Transféré FI").length,
  }), [crVerrouilles, actions, ames]);

  // Entonnoir de confiance
  const funnelData = useMemo(() => [
    { name: "Contacts Pris", value: kpis.totalContacts, fill: "#3b82f6" },
    { name: "Contact Digital", value: ames.filter(a => ["Premier Contact Digital","Création de Lien","Confirmé Dimanche","Transféré FI"].includes(a.statut_confiance)).length, fill: "#06b6d4" },
    { name: "Lien Créé", value: ames.filter(a => ["Création de Lien","Confirmé Dimanche","Transféré FI"].includes(a.statut_confiance)).length, fill: "#8b5cf6" },
    { name: "Venus à l'EJP", value: ames.filter(a => ["Confirmé Dimanche","Transféré FI"].includes(a.statut_confiance)).length, fill: "#f59e0b" },
    { name: "Intégrés FI", value: kpis.transferesFI, fill: "#10b981" },
  ], [kpis, ames]);

  // Évolution mensuelle par CR
  const byMonth = useMemo(() => {
    const months = {};
    crVerrouilles.forEach(cr => {
      const action = actions.find(a => a.id === cr.action_id);
      const date = action?.date_action || cr.created_date;
      if (!date) return;
      const m = date.slice(0, 7);
      if (!months[m]) months[m] = { mois: m, abordes: 0, contacts: 0, saluts: 0 };
      months[m].abordes += cr.abordes_count || 0;
      months[m].contacts += cr.contacts_pris || 0;
      months[m].saluts += cr.prieres_salut || 0;
    });
    return Object.values(months).sort((a, b) => a.mois.localeCompare(b.mois)).slice(-6).map(m => ({
      ...m,
      label: format(new Date(m.mois + "-01"), "MMM yy", { locale: fr }),
    }));
  }, [crVerrouilles, actions]);

  // Statuts Vivier
  const vivierStats = useMemo(() => [
    { label: "Glacé 🧊",          key: "Nouveau (Glacé)",         color: "#3b82f6" },
    { label: "Contact Digital 📱",key: "Premier Contact Digital", color: "#06b6d4" },
    { label: "Lien ☕",           key: "Création de Lien",        color: "#8b5cf6" },
    { label: "Confirmé ⛪",       key: "Confirmé Dimanche",       color: "#f59e0b" },
    { label: "Intégré FI 🟢",    key: "Transféré FI",            color: "#10b981" },
  ].map(s => ({ ...s, count: ames.filter(a => a.statut_confiance === s.key).length })), [ames]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-[0.25em] mb-1">Évangélisation · Pilier 3</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Radar & ROI</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Tableau de commandement · Données verrouillées uniquement</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Sorties effectuées",  value: actions.filter(a => a.statut === "Terminée").length, icon: Target, color: "text-zinc-400" },
          { label: "Personnes abordées",  value: kpis.totalAbordes, icon: Users, color: "text-blue-400" },
          { label: "Contacts pris",       value: kpis.totalContacts, icon: Zap, color: "text-cyan-400" },
          { label: "Prières du salut",    value: kpis.totalPrieresSalut, icon: Heart, color: "text-emerald-400" },
        ].map(({ label, value, icon: IconComp, color }) => (
          <GlassCard key={label}>
            <IconComp className={cn("w-5 h-5 mb-2", color)} />
            <p className={cn("text-3xl font-black", color)}>{value}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Funnel */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <p className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Entonnoir de Confiance — Le vrai ROI</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {funnelData.map((step, i) => (
            <React.Fragment key={step.name}>
              <div className="flex flex-col items-center gap-1">
                <div className="px-4 py-3 rounded-xl text-center min-w-[120px]"
                  style={{ background: `${step.fill}15`, border: `1px solid ${step.fill}30` }}>
                  <p className="text-2xl font-black" style={{ color: step.fill }}>{step.value}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{step.name}</p>
                </div>
                {i > 0 && funnelData[i - 1].value > 0 && (
                  <p className="text-[10px] text-zinc-700">
                    {((step.value / funnelData[i - 1].value) * 100).toFixed(0)}%
                  </p>
                )}
              </div>
              {i < funnelData.length - 1 && (
                <ArrowRight className="w-4 h-4 text-zinc-700 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly chart */}
        <GlassCard>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Évolution Mensuelle</p>
          {byMonth.length === 0 ? (
            <p className="text-sm text-zinc-600 py-12 text-center">Aucun CR verrouillé</p>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMonth} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px", color: "#fff" }} />
                  <Bar dataKey="abordes"  fill="rgba(255,255,255,0.08)" radius={[4,4,0,0]} name="Abordés" />
                  <Bar dataKey="contacts" fill="#3b82f6" radius={[4,4,0,0]} name="Contacts" />
                  <Bar dataKey="saluts"   fill="#10b981" radius={[4,4,0,0]} name="Saluts" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        {/* Vivier breakdown */}
        <GlassCard>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">État du Vivier</p>
          <div className="space-y-3">
            {vivierStats.map(s => (
              <div key={s.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-400">{s.label}</span>
                  <span className="text-xs font-bold text-white">{s.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${ames.length > 0 ? (s.count / ames.length) * 100 : 0}%`, backgroundColor: s.color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/[0.05] flex items-center justify-between">
            <span className="text-xs text-zinc-600">Taux d'intégration FI</span>
            <span className="text-sm font-bold text-emerald-400">
              {ames.length > 0 ? ((kpis.transferesFI / ames.length) * 100).toFixed(1) : "0"}%
            </span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}