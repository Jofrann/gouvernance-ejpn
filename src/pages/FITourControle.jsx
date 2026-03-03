import React, { useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, AlertTriangle, Users, Clock, Eye } from "lucide-react";
import { format, setDay, startOfWeek, subWeeks } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";
import { motion } from "framer-motion";

function getThisThursday() {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  return setDay(start, 4, { weekStartsOn: 1 });
}

const GlassCard = ({ children, className = "" }) => (
  <div className={cn("rounded-2xl border border-white/[0.09] p-4", className)}
    style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.018) 100%)",
      backdropFilter: "blur(40px) saturate(1.7) brightness(1.05)",
      WebkitBackdropFilter: "blur(40px) saturate(1.7) brightness(1.05)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.12), 0 8px 32px rgba(0,0,0,0.32)"
    }}>
    {children}
  </div>
);

export default function FITourControlePage() {
  const queryClient = useQueryClient();
  const [nudging, setNudging] = React.useState({});
  const thisThursday = format(getThisThursday(), "yyyy-MM-dd");

  useEffect(() => {
    const u1 = base44.entities.FamilleImpact.subscribe(() => queryClient.invalidateQueries({ queryKey: ["familles"] }));
    const u2 = base44.entities.Membre.subscribe(() => queryClient.invalidateQueries({ queryKey: ["membres-all"] }));
    const u3 = base44.entities.CliniqueSaisie.subscribe(() => queryClient.invalidateQueries({ queryKey: ["all-saisies"] }));
    return () => { u1(); u2(); u3(); };
  }, [queryClient]);

  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres-all"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: saisies = [] } = useQuery({ queryKey: ["all-saisies"], queryFn: () => base44.entities.CliniqueSaisie.list("-created_date", 1000) });

  const fiStats = useMemo(() => {
    return familles.map(fi => {
      const fiMembres = membres.filter(m => m.famille_impact_id === fi.id);
      const thisSaisies = saisies.filter(s => s.famille_impact_id === fi.id && s.semaine === thisThursday);
      const allFiSaisies = saisies.filter(s => s.famille_impact_id === fi.id);
      const presenceRate = thisSaisies.length > 0 ? thisSaisies.filter(s => s.presence).length / Math.max(fiMembres.length, 1) : null;
      const alertCount = fiMembres.filter(m => detectChuteLivre(m.id, allFiSaisies)).length;
      const saisieComplete = thisSaisies.length >= fiMembres.length && fiMembres.length > 0;
      const potentiels = fiMembres.filter(m => m.potentiel_formation).length;
      return { fi, fiMembres, thisSaisies, presenceRate, alertCount, saisieComplete, potentiels };
    });
  }, [familles, membres, saisies, thisThursday]);

  const handleNudge = async (fi) => {
    setNudging(prev => ({ ...prev, [fi.id]: true }));
    await base44.integrations.Core.SendEmail({
      to: fi.pilote_email,
      subject: `🔔 Rappel : Suivi hebdomadaire de ${fi.name}`,
      body: `Bonjour ${fi.pilote_nom || ""},\n\nN'oublie pas de faire le suivi clinique de ta Famille d'Impact "${fi.name}" pour le jeudi ${thisThursday}.\n\nChaque âme compte. Sois fidèle.\n\n— Gouvernance EJPN`,
    }).catch(() => {});
    toast.success(`Relance envoyée au Pilote de ${fi.name}`);
    setNudging(prev => ({ ...prev, [fi.id]: false }));
  };

  const totalFI = familles.length;
  const saisiesMissing = fiStats.filter(s => !s.saisieComplete).length;
  const totalAlertes = fiStats.reduce((a, s) => a + s.alertCount, 0);
  const totalPotentiels = fiStats.reduce((a, s) => a + s.potentiels, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="page-label text-blue-400/80">Familles d'Impact</p>
        <h1 className="text-2xl font-light text-white tracking-tight">Tour de <span className="font-black">Contrôle</span></h1>
        <p className="text-sm text-zinc-500 mt-0.5 font-light leading-relaxed">Supervision des Pilotes · Conformité clinique · Alertes</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "FI suivies", value: totalFI, icon: Eye, color: "text-blue-400" },
          { label: "Saisies manquantes", value: saisiesMissing, icon: Clock, color: saisiesMissing > 0 ? "text-amber-400" : "text-emerald-400" },
          { label: "Alertes Chute Libre", value: totalAlertes, icon: AlertTriangle, color: totalAlertes > 0 ? "text-red-400" : "text-emerald-400" },
          { label: "Potentiels Formation", value: totalPotentiels, icon: Users, color: "text-violet-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <GlassCard key={label}>
            <div className="flex items-center gap-3">
              <Icon className={cn("w-5 h-5", color)} />
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
                <p className={cn("text-2xl font-black", color)}>{value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-white/[0.09] overflow-hidden" style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
        backdropFilter: "blur(40px)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.28)"
      }}>
        <div className="px-5 py-3 border-b border-white/[0.07]">
          <p className="section-title">Toutes les Familles d'Impact</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07]">
              {["Famille d'Impact", "Pilote", "Membres", "Statut Clinique", "Présence", "Alertes", "Potentiels", "Action"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.15em]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fiStats.map(({ fi, fiMembres, thisSaisies, presenceRate, alertCount, saisieComplete, potentiels }, i) => (
              <motion.tr key={fi.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                className={cn("table-row-glass group",
                  !saisieComplete ? "bg-amber-500/[0.03]" : alertCount > 0 ? "bg-red-500/[0.03]" : "")}>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-white">{fi.name}</p>
                  <p className="text-xs text-zinc-600">{fi.campus}</p>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">{fi.pilote_nom || fi.pilote_email}</td>
                <td className="px-4 py-3 text-sm font-bold text-zinc-300">{fiMembres.length}</td>
                <td className="px-4 py-3">
                  {saisieComplete ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Complet
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] gap-1">
                      <Clock className="w-3 h-3" /> {thisSaisies.length}/{fiMembres.length}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-bold">
                  {presenceRate !== null ? (
                    <span className={cn(presenceRate >= 0.7 ? "text-emerald-400" : presenceRate >= 0.5 ? "text-amber-400" : "text-red-400")}>
                      {Math.round(presenceRate * 100)}%
                    </span>
                  ) : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  {alertCount > 0 ? (
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px] gap-1">
                      <AlertTriangle className="w-3 h-3" /> {alertCount}
                    </Badge>
                  ) : <span className="text-xs text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-violet-400">{potentiels > 0 ? potentiels : <span className="text-zinc-600">—</span>}</td>
                <td className="px-4 py-3">
                  {!saisieComplete && fi.pilote_email && (
                    <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs text-amber-400 hover:bg-amber-500/10 border border-amber-500/20"
                      onClick={() => handleNudge(fi)} disabled={nudging[fi.id]}>
                      <Bell className="w-3 h-3" />
                      {nudging[fi.id] ? "Envoi..." : "Relancer"}
                    </Button>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}