import React, { useMemo, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, AlertTriangle, Eye, Users, Clock } from "lucide-react";
import { format, setDay, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";

function getThisThursday() {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  return setDay(start, 4, { weekStartsOn: 1 });
}

export default function FITourControlePage() {
  const [nudging, setNudging] = useState({});
  const thisThursday = format(getThisThursday(), "yyyy-MM-dd");
  const lastThursday = format(setDay(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), 4, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: familles = [] } = useQuery({
    queryKey: ["familles"],
    queryFn: () => base44.entities.FamilleImpact.list(),
  });

  const { data: membres = [] } = useQuery({
    queryKey: ["membres-all"],
    queryFn: () => base44.entities.Membre.list("-created_date", 500),
  });

  const { data: saisies = [] } = useQuery({
    queryKey: ["all-saisies"],
    queryFn: () => base44.entities.CliniqueSaisie.list("-created_date", 1000),
  });

  const fiStats = useMemo(() => {
    return familles.map((fi) => {
      const fiMembres = membres.filter((m) => m.famille_impact_id === fi.id);
      const thisSaisies = saisies.filter((s) => s.famille_impact_id === fi.id && s.semaine === thisThursday);
      const lastSaisies = saisies.filter((s) => s.famille_impact_id === fi.id && s.semaine === lastThursday);
      const allFiSaisies = saisies.filter((s) => s.famille_impact_id === fi.id);

      const presenceRate = thisSaisies.length > 0
        ? thisSaisies.filter((s) => s.presence).length / Math.max(fiMembres.length, 1)
        : null;

      const alertCount = fiMembres.filter((m) => detectChuteLivre(m.id, allFiSaisies)).length;
      const saisieComplete = thisSaisies.length >= fiMembres.length && fiMembres.length > 0;

      return { fi, fiMembres, thisSaisies, presenceRate, alertCount, saisieComplete };
    });
  }, [familles, membres, saisies, thisThursday, lastThursday]);

  const handleNudge = async (fi) => {
    setNudging((prev) => ({ ...prev, [fi.id]: true }));
    // Simulate notification via email (replace with real notification when needed)
    await base44.integrations.Core.SendEmail({
      to: fi.pilote_email,
      subject: `🔔 Rappel : Suivi hebdomadaire de ${fi.name}`,
      body: `Bonjour,\n\nN'oublie pas de faire le suivi clinique de ta Famille d'Impact "${fi.name}" pour le jeudi ${thisThursday}.\n\nChaque âme compte. Sois fidèle.\n\n— Gouvernance EJPN`,
    }).catch(() => {});
    toast.success(`Relance envoyée au Pilote de ${fi.name}`);
    setNudging((prev) => ({ ...prev, [fi.id]: false }));
  };

  const fiWithAlerts = fiStats.filter((s) => s.alertCount > 0 || !s.saisieComplete);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Tour de Contrôle</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Supervision des Pilotes · Relances en 1 clic</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-zinc-200 bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
              <Eye className="w-5 h-5 text-zinc-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{familles.length}</p>
              <p className="text-xs text-zinc-500">Familles suivies</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-white border border-amber-100">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{fiStats.filter((s) => !s.saisieComplete).length}</p>
              <p className="text-xs text-amber-600">Saisies manquantes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-white border border-red-100">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{fiStats.reduce((a, s) => a + s.alertCount, 0)}</p>
              <p className="text-xs text-red-600">Alertes Chute Libre</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FI Rows */}
      <div className="space-y-3">
        {fiStats.map(({ fi, fiMembres, thisSaisies, presenceRate, alertCount, saisieComplete }) => (
          <Card key={fi.id} className={cn("border transition-all", !saisieComplete ? "border-amber-200 bg-amber-50/20" : alertCount > 0 ? "border-red-200 bg-red-50/20" : "border-zinc-200 bg-white")}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                    <Users className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{fi.name}</p>
                    <p className="text-xs text-zinc-400">{fi.campus} · Pilote: {fi.pilote_email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {saisieComplete ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Suivi complet
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] gap-1">
                          <Clock className="w-3 h-3" /> {thisSaisies.length}/{fiMembres.length} saisies
                        </Badge>
                      )}
                      {alertCount > 0 && (
                        <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px] gap-1">
                          <AlertTriangle className="w-3 h-3" /> {alertCount} alerte{alertCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                      {presenceRate !== null && (
                        <Badge variant="outline" className="text-[10px] text-zinc-500">
                          {Math.round(presenceRate * 100)}% présence
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {!saisieComplete && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50 gap-2 whitespace-nowrap"
                    onClick={() => handleNudge(fi)}
                    disabled={nudging[fi.id]}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    {nudging[fi.id] ? "Envoi..." : "Relancer le Pilote"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}