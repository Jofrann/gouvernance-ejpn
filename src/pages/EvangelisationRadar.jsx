import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Calendar, Clock, Users, Target, FileText, Globe, MapPin, Wifi, Zap, TrendingUp, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

const TYPE_OPTIONS = [{ value: "rue", label: "🚶 Rue" }, { value: "campus", label: "🎓 Campus" }, { value: "zoom", label: "💻 Zoom" }, { value: "porte_a_porte", label: "🚪 Porte-à-porte" }, { value: "evenement", label: "🎉 Événement" }];

function getYieldBadge(action) {
  if (!action.debrief_complete || !action.temps_investi_heures) return null;
  const ratio = action.conversions / action.temps_investi_heures;
  if (ratio >= 0.8) return { label: "🔥 Haut Rendement", class: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (ratio >= 0.3) return { label: "✓ Correct", class: "bg-blue-50 text-blue-700 border-blue-200" };
  return { label: "⚠ Faible Impact", class: "bg-amber-50 text-amber-700 border-amber-200" };
}

const STATUT_COLORS = { planifie: "bg-blue-50 text-blue-700", en_cours: "bg-amber-50 text-amber-700", termine: "bg-zinc-50 text-zinc-600", annule: "bg-red-50 text-red-700" };

export default function EvangelisationRadarPage() {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selectedBriefing, setSelectedBriefing] = useState(null);
  const [form, setForm] = useState({ titre: "", type_action: "rue", date_action: "", heure_debut: "", heure_fin: "", fi_assignees: [] });

  const { data: actions = [] } = useQuery({
    queryKey: ["actions"],
    queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 100),
  });

  const { data: familles = [] } = useQuery({
    queryKey: ["familles"],
    queryFn: () => base44.entities.FamilleImpact.list(),
  });

  const handleCreate = async () => {
    if (!form.titre || !form.date_action) { toast.error("Titre et date requis"); return; }
    await base44.entities.ActionEvangelisation.create({ ...form, statut: "planifie", personnes_touchees: 0, conversions: 0, temps_investi_heures: 0, debrief_complete: false });
    queryClient.invalidateQueries({ queryKey: ["actions"] });
    toast.success("Action planifiée !");
    setShowNew(false);
    setForm({ titre: "", type_action: "rue", date_action: "", heure_debut: "", heure_fin: "", fi_assignees: [] });
  };

  const upcoming = actions.filter((a) => a.statut === "planifie" || a.statut === "en_cours");
  const past = actions.filter((a) => a.statut === "termine" && a.debrief_complete);

  const toggleFI = (fiId) => {
    setForm((prev) => ({
      ...prev,
      fi_assignees: prev.fi_assignees.includes(fiId) ? prev.fi_assignees.filter((id) => id !== fiId) : [...prev.fi_assignees, fiId],
    }));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Radar Ops</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Planning · Fiches de Mission · Classement Rendement</p>
        </div>
        <Button className="bg-zinc-900 hover:bg-zinc-800 gap-2" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4" /> Planifier une Action
        </Button>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-3">Opérations à venir</h2>
          <div className="space-y-2">
            {upcoming.map((action) => {
              const assignedFI = familles.filter((fi) => action.fi_assignees?.includes(fi.id));
              return (
                <Card key={action.id} className="border-zinc-200 bg-white hover:shadow-sm transition cursor-pointer" onClick={() => setSelectedBriefing(action)}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={cn("px-2 py-1 rounded text-xs font-medium", STATUT_COLORS[action.statut])}>
                        {action.statut}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{action.titre}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-zinc-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(action.date_action), "d MMM", { locale: fr })}</span>
                          {action.heure_debut && <span className="text-xs text-zinc-400 flex items-center gap-1"><Clock className="w-3 h-3" />{action.heure_debut}</span>}
                          {assignedFI.length > 0 && <span className="text-xs text-zinc-400 flex items-center gap-1"><Users className="w-3 h-3" />{assignedFI.length} FI</span>}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs gap-1 border-zinc-200">
                      <FileText className="w-3.5 h-3.5" /> Briefing
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Past - Ranked */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-3">Classement des Actions — Rendement</h2>
        {past.length === 0 ? (
          <Card className="border-zinc-200 bg-white">
            <CardContent className="py-12 text-center text-sm text-zinc-400">Aucune action debriefée</CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {[...past].sort((a, b) => (b.conversions / Math.max(b.temps_investi_heures, 0.1)) - (a.conversions / Math.max(a.temps_investi_heures, 0.1))).map((action, i) => {
              const badge = getYieldBadge(action);
              const ratio = action.temps_investi_heures > 0 ? (action.conversions / action.temps_investi_heures).toFixed(2) : "—";
              return (
                <div key={action.id} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50">
                  <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0", i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-zinc-200 text-zinc-600" : "bg-zinc-100 text-zinc-500")}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{action.titre}</p>
                    <p className="text-xs text-zinc-400">{format(new Date(action.date_action), "d MMM", { locale: fr })} · {action.personnes_touchees} touchées · {action.conversions} acceptations</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700">{ratio} acc/h</span>
                    {badge && <Badge className={cn("text-[10px] border", badge.class)}>{badge.label}</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Action Sheet */}
      <Sheet open={showNew} onOpenChange={setShowNew}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle>Planifier une Action</SheetTitle>
          </SheetHeader>
          <div className="py-5 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 font-medium">Titre de l'action *</label>
              <Input className="mt-1 bg-white border-zinc-200" placeholder="Ex: Sortie Campus Jussieu" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium">Type d'action</label>
              <Select value={form.type_action} onValueChange={(v) => setForm({ ...form, type_action: v })}>
                <SelectTrigger className="mt-1 bg-white border-zinc-200"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3">
                <label className="text-xs text-zinc-500 font-medium">Date *</label>
                <Input type="date" className="mt-1 bg-white border-zinc-200" value={form.date_action} onChange={(e) => setForm({ ...form, date_action: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium">Début</label>
                <Input type="time" className="mt-1 bg-white border-zinc-200" value={form.heure_debut} onChange={(e) => setForm({ ...form, heure_debut: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium">Fin</label>
                <Input type="time" className="mt-1 bg-white border-zinc-200" value={form.heure_fin} onChange={(e) => setForm({ ...form, heure_fin: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium mb-2 block">FI mobilisées</label>
              <div className="space-y-1.5">
                {familles.map((fi) => (
                  <label key={fi.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-zinc-50">
                    <Checkbox checked={form.fi_assignees.includes(fi.id)} onCheckedChange={() => toggleFI(fi.id)} />
                    <span className="text-sm text-zinc-700">{fi.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button className="w-full bg-zinc-900 hover:bg-zinc-800" onClick={handleCreate}>Créer la Fiche de Mission</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Briefing Sheet */}
      <Sheet open={!!selectedBriefing} onOpenChange={() => setSelectedBriefing(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedBriefing && (
            <>
              <SheetHeader className="pb-4 border-b">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-zinc-500" />
                  <SheetTitle>Fiche de Mission</SheetTitle>
                </div>
              </SheetHeader>
              <div className="py-5 space-y-4">
                <div className="p-4 rounded-xl border-2 border-zinc-900 bg-zinc-50">
                  <h3 className="text-lg font-bold text-zinc-900">{selectedBriefing.titre}</h3>
                  <Badge className="mt-1 text-xs bg-zinc-900 text-white">{selectedBriefing.type_action?.toUpperCase()}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                    <p className="text-[10px] text-zinc-400 uppercase">Date</p>
                    <p className="text-sm font-medium mt-0.5">{format(new Date(selectedBriefing.date_action), "EEEE d MMMM", { locale: fr })}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                    <p className="text-[10px] text-zinc-400 uppercase">Horaire</p>
                    <p className="text-sm font-medium mt-0.5">{selectedBriefing.heure_debut || "—"} → {selectedBriefing.heure_fin || "—"}</p>
                  </div>
                </div>
                {(selectedBriefing.fi_assignees?.length > 0) && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> FI Mobilisées</p>
                    <div className="space-y-1">
                      {familles.filter((fi) => selectedBriefing.fi_assignees.includes(fi.id)).map((fi) => (
                        <div key={fi.id} className="flex items-center gap-2 p-2 rounded border border-zinc-100 bg-zinc-50 text-sm">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="font-medium text-zinc-700">{fi.name}</span>
                          <span className="text-zinc-400 text-xs">· {fi.campus}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Objectif</p>
                  <p className="text-sm text-blue-900 mt-1">Toucher un maximum de personnes. Parler clairement de la vision EJPN. Relever les contacts intéressés.</p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}