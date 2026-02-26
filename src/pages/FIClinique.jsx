import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Save, Lock, AlertTriangle, CheckCircle2, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks, isAfter, setDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import CliniqueGrid from "@/components/fi/CliniqueGrid";
import AIPastoralInsights from "@/components/ai/AIPastoralInsights";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function getThursdayOfWeek(date) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return setDay(start, 4, { weekStartsOn: 1 });
}

function isLocked(thursdayDate) {
  return isAfter(new Date(), endOfDay(thursdayDate));
}

export default function FICliniquePage() {
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(getThursdayOfWeek(new Date()));
  const [localSaisies, setLocalSaisies] = useState({});
  const [saving, setSaving] = useState(false);
  const [selectedFI, setSelectedFI] = useState(null);

  const locked = isLocked(currentWeek);
  const weekLabel = format(currentWeek, "EEEE d MMMM yyyy", { locale: fr });
  const semaineStr = format(currentWeek, "yyyy-MM-dd");

  const { data: familles = [] } = useQuery({
    queryKey: ["familles"],
    queryFn: () => base44.entities.FamilleImpact.list(),
  });

  useEffect(() => {
    if (familles.length > 0 && !selectedFI) setSelectedFI(familles[0].id);
  }, [familles, selectedFI]);

  const { data: membres = [] } = useQuery({
    queryKey: ["membres", selectedFI],
    queryFn: () => selectedFI ? base44.entities.Membre.filter({ famille_impact_id: selectedFI }) : Promise.resolve([]),
    enabled: !!selectedFI,
  });

  const { data: saisies = [], isLoading: loadingSaisies } = useQuery({
    queryKey: ["saisies", selectedFI, semaineStr],
    queryFn: () => selectedFI ? base44.entities.CliniqueSaisie.filter({ famille_impact_id: selectedFI, semaine: semaineStr }) : Promise.resolve([]),
    enabled: !!selectedFI,
  });

  useEffect(() => {
    const map = {};
    saisies.forEach((s) => { map[s.membre_id] = s; });
    setLocalSaisies(map);
  }, [saisies]);

  const handleUpdateSaisie = (membreId, field, value) => {
    if (locked) return;
    setLocalSaisies((prev) => ({ ...prev, [membreId]: { ...prev[membreId], [field]: value } }));
  };

  const handleSave = async () => {
    if (locked) return;
    setSaving(true);
    for (const membre of membres) {
      const local = localSaisies[membre.id];
      if (!local) continue;
      const existing = saisies.find((s) => s.membre_id === membre.id);
      const data = {
        membre_id: membre.id,
        famille_impact_id: selectedFI,
        semaine: semaineStr,
        presence: local.presence || false,
        note_temps: local.note_temps,
        note_finances: local.note_finances,
        note_emotions: local.note_emotions,
        note_spirituel: local.note_spirituel,
        commentaire: local.commentaire || "",
      };
      if (existing) {
        await base44.entities.CliniqueSaisie.update(existing.id, data);
      } else {
        await base44.entities.CliniqueSaisie.create(data);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["saisies", selectedFI, semaineStr] });
    setSaving(false);
  };

  const completionCount = membres.filter((m) => {
    const s = localSaisies[m.id];
    return s && s.presence !== undefined && s.note_temps !== null && s.note_temps !== undefined;
  }).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Familles d'Impact</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Clinique du Jeudi</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Saisie hebdomadaire des 4 dimensions de vie</p>
        </div>
        {!locked && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600/80 hover:bg-blue-600 border border-blue-500/30 text-white gap-2 backdrop-blur-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? "Enregistrement..." : "Sauvegarder"}
          </Button>
        )}
      </motion.div>

      {/* Controls */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Select value={selectedFI || ""} onValueChange={setSelectedFI}>
          <SelectTrigger className="w-64 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Sélectionner une FI" />
          </SelectTrigger>
          <SelectContent>
            {familles.map((fi) => <SelectItem key={fi.id} value={fi.id}>{fi.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div
          className="flex items-center gap-1 rounded-xl border border-white/[0.08] p-1"
          style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)" }}
        >
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-3">
            <CalendarDays className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-300 capitalize whitespace-nowrap">{weekLabel}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} disabled={isAfter(addWeeks(currentWeek, 1), new Date())}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {locked ? (
            <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 gap-1">
              <Lock className="w-3 h-3" /> Verrouillé
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 gap-1">
              <CheckCircle2 className="w-3 h-3" /> Ouvert
            </Badge>
          )}
          <Badge className="bg-white/5 text-zinc-400 border border-white/10 gap-1">
            <Clock className="w-3 h-3" /> {completionCount}/{membres.length} complétés
          </Badge>
        </div>
      </motion.div>

      {/* Warning */}
      {!locked && completionCount < membres.length && membres.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-400">
            <span className="font-semibold">{membres.length - completionCount} membre(s)</span> n'ont pas encore été évalués cette semaine. Le formulaire se verrouillera automatiquement jeudi soir.
          </p>
        </motion.div>
      )}

      {/* AI Pastoral Insights */}
      {membres.length > 0 && saisies.length > 0 && (
        <AIPastoralInsights membres={membres} saisies={saisies} fiName={familles.find((f) => f.id === selectedFI)?.name || "FI"} />
      )}

      {/* Data Grid */}
      {loadingSaisies ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-500/60 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <CliniqueGrid membres={membres} saisies={localSaisies} onUpdateSaisie={handleUpdateSaisie} locked={locked} />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-1">
        {[
          ["bg-emerald-500/20 border-emerald-500/30", "8-10 : Excellent"],
          ["bg-amber-500/20 border-amber-500/30", "5-7 : Moyen"],
          ["bg-red-500/20 border-red-500/30", "0-4 : Critique"],
        ].map(([cls, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded-sm border", cls)} />
            <span className="text-xs text-zinc-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}