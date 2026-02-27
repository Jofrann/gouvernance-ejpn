import React, { useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2, AlertTriangle, Eye, Users, Clock, Zap } from "lucide-react";
import { format, setDay, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";
import { motion } from "framer-motion";

function getThisThursday() {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  return format(setDay(start, 4, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export default function FITourControlePage() {
  useTrackActivity("FITourControle");
  const qc = useQueryClient();
  const [nudging, setNudging] = React.useState({});
  const thisThursday = getThisThursday();
  const lastThursday = format(setDay(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), 4, { weekStartsOn: 1 }), "yyyy-MM-dd");

  useEffect(() => {
    const u1 = base44.entities.FamilleImpact.subscribe(() => qc.invalidateQueries({ queryKey: ["familles"] }));
    const u2 = base44.entities.Membre.subscribe(() => qc.invalidateQueries({ queryKey: ["membres-all"] }));
    const u3 = base44.entities.CliniqueSaisie.subscribe(() => qc.invalidateQueries({ queryKey: ["all-saisies"] }));
    return () => { u1(); u2(); u3(); };
  }, [qc]);

  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres-all"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: saisies = [] } = useQuery({ queryKey: ["all-saisies"], queryFn: () => base44.entities.CliniqueSaisie.list("-created_date", 1000) });

  const fiStats = useMemo(() => familles.map(fi => {
    const fiMembres = membres.filter(m => m.famille_impact_id === fi.id);
    const thisSaisies = saisies.filter(s => s.famille_impact_id === fi.id && s.semaine === thisThursday);
    const allFiSaisies = saisies.filter(s => s.famille_impact_id === fi.id);
    const presenceRate = thisSaisies.length > 0 ? thisSaisies.filter(s => s.presence).length / Math.max(fiMembres.length, 1) : null;
    const alertCount = fiMembres.filter(m => detectChuteLivre(m.id, allFiSaisies)).length;
    const saisieComplete = thisSaisies.length >= fiMembres.length && fiMembres.length > 0;
    return { fi, fiMembres, thisSaisies, presenceRate, alertCount, saisieComplete };
  }), [familles, membres, saisies, thisThursday]);

  const handleNudge = async (fi) => {
    setNudging(p => ({ ...p, [fi.id]: true }));
    await base44.integrations.Core.SendEmail({
      to: fi.pilote_email,
      subject: `🔔 Rappel : Suivi hebdomadaire de ${fi.name}`,
      body: `Bonjour,\n\nN'oublie pas de faire le suivi clinique de ta Famille d'Impact "${fi.name}" pour le jeudi ${thisThursday}.\n\nChaque âme compte. Sois fidèle.\n\n— Gouvernance EJPN`,
    }).catch(() => {});
    toast.success(`Relance envoyée au Pilote de ${fi.name}`);
    setNudging(p => ({ ...p, [fi.id]: false }));
  };

  const missingSaisie = fiStats.filter(s => !s.saisieComplete).length;
  const totalAlerts = fiStats.reduce((a, s) => a + s.alertCount, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Familles d'Impact</p>
          <h1 className="text-lg font-bold text-white">Tour de Contrôle</h1>
          <p className="text-xs text-zinc-600">Supervision des Pilotes · Relances en 1 clic</p>
        </div>
        <div className="flex items-center gap-2">
          {totalAlerts > 0 && (
            <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> {totalAlerts} alerte{totalAlerts > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Familles suivies", value: familles.length, icon: Eye, color: "text-white", bg: "border-white/8" },
            { label: "Saisies manquantes", value: missingSaisie, icon: Clock, color: "text-amber-400", bg: "border-amber-500/20 bg-amber-900/10" },
            { label: "Alertes Chute Libre", value: totalAlerts, icon: AlertTriangle, color: totalAlerts > 0 ? "text-red-400" : "text-emerald-400", bg: totalAlerts > 0 ? "border-red-500/20 bg-red-900/10" : "border-emerald-500/20 bg-emerald-900/10" },
          ].map(k => (
            <div key={k.label} className={cn("ai-card rounded-xl border p-4 flex items-center gap-3", k.bg)}>
              <k.icon className={cn("w-5 h-5 flex-shrink-0", k.color)} />
              <div>
                <p className={cn("text-2xl font-bold", k.color)}>{k.value}</p>
                <p className="text-xs text-zinc-600">{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FI Rows */}
        <div className="space-y-2">
          {fiStats.map(({ fi, fiMembres, thisSaisies, presenceRate, alertCount, saisieComplete }, i) => (
            <motion.div key={fi.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className={cn("ai-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all",
                !saisieComplete ? "border-amber-500/20 bg-amber-900/10" :
                alertCount > 0 ? "border-red-500/20 bg-red-900/10" : "border-white/8")}>
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-xl border flex-shrink-0",
                    !saisieComplete ? "bg-amber-500/10 border-amber-500/20" :
                    alertCount > 0 ? "bg-red-500/10 border-red-500/20" : "bg-emerald-500/10 border-emerald-500/20")}>
                    <Users className={cn("w-4 h-4",
                      !saisieComplete ? "text-amber-400" :
                      alertCount > 0 ? "text-red-400" : "text-emerald-400")} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{fi.name}</p>
                    <p className="text-xs text-zinc-500">{fi.campus} · {fi.pilote_email}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {saisieComplete ? (
                        <span className="text-[10px] border px-2 py-0.5 rounded-md text-emerald-400 bg-emerald-900/30 border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Suivi complet
                        </span>
                      ) : (
                        <span className="text-[10px] border px-2 py-0.5 rounded-md text-amber-400 bg-amber-900/30 border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {thisSaisies.length}/{fiMembres.length} saisies
                        </span>
                      )}
                      {alertCount > 0 && (
                        <span className="text-[10px] border px-2 py-0.5 rounded-md text-red-400 bg-red-900/30 border-red-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {alertCount} alerte{alertCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {presenceRate !== null && (
                        <span className="text-[10px] border px-2 py-0.5 rounded-md text-zinc-400 bg-zinc-800 border-zinc-700">
                          {Math.round(presenceRate * 100)}% présence
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {!saisieComplete && (
                  <button onClick={() => handleNudge(fi)} disabled={nudging[fi.id]}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/30 text-xs text-amber-400 hover:bg-amber-900/30 disabled:opacity-50 transition-all whitespace-nowrap">
                    <Bell className="w-3.5 h-3.5" />
                    {nudging[fi.id] ? "Envoi..." : "Relancer le Pilote"}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {fiStats.length === 0 && (
            <div className="ai-card rounded-xl border border-white/5 p-12 text-center">
              <Zap className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
              <p className="text-sm text-zinc-600">Aucune Famille d'Impact créée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}