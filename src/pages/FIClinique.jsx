import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Save, Lock, AlertTriangle, CheckCircle2, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks, isAfter, isBefore, setDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import CliniqueGrid from "@/components/fi/CliniqueGrid";
import AIPastoralInsights from "@/components/ai/AIPastoralInsights";

function getThursdayOfWeek(date) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return setDay(start, 4, { weekStartsOn: 1 });
}

function isLocked(thursdayDate) {
  const lockTime = endOfDay(thursdayDate);
  return isAfter(new Date(), lockTime);
}

export default function FICliniquePage() {
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(getThursdayOfWeek(new Date()));
  const [localSaisies, setLocalSaisies] = useState({});
  const [saving, setSaving] = useState(false);
  const [selectedFI, setSelectedFI] = useState(null);

  const locked = isLocked(currentWeek);
  const weekLabel = format(currentWeek, "EEEE d MMMM yyyy", { locale: fr });

  const { data: familles = [] } = useQuery({
    queryKey: ["familles"],
    queryFn: () => base44.entities.FamilleImpact.list(),
  });

  useEffect(() => {
    if (familles.length > 0 && !selectedFI) {
      setSelectedFI(familles[0].id);
    }
  }, [familles, selectedFI]);

  const { data: membres = [] } = useQuery({
    queryKey: ["membres", selectedFI],
    queryFn: () => selectedFI ? base44.entities.Membre.filter({ famille_impact_id: selectedFI }) : Promise.resolve([]),
    enabled: !!selectedFI,
  });

  const semaineStr = format(currentWeek, "yyyy-MM-dd");

  const { data: saisies = [], isLoading: loadingSaisies } = useQuery({
    queryKey: ["saisies", selectedFI, semaineStr],
    queryFn: () => selectedFI ? base44.entities.CliniqueSaisie.filter({ famille_impact_id: selectedFI, semaine: semaineStr }) : Promise.resolve([]),
    enabled: !!selectedFI,
  });

  useEffect(() => {
    const map = {};
    saisies.forEach((s) => {
      map[s.membre_id] = s;
    });
    setLocalSaisies(map);
  }, [saisies]);

  const handleUpdateSaisie = (membreId, field, value) => {
    if (locked) return;
    setLocalSaisies((prev) => ({
      ...prev,
      [membreId]: {
        ...prev[membreId],
        [field]: value,
      },
    }));
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Clinique du Jeudi</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Saisie hebdomadaire des 4 dimensions de vie</p>
        </div>
        <div className="flex items-center gap-2">
          {!locked && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Enregistrement..." : "Sauvegarder"}
            </Button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* FI Selector */}
        <Select value={selectedFI || ""} onValueChange={setSelectedFI}>
          <SelectTrigger className="w-64 bg-white border-zinc-200">
            <SelectValue placeholder="Sélectionner une FI" />
          </SelectTrigger>
          <SelectContent>
            {familles.map((fi) => (
              <SelectItem key={fi.id} value={fi.id}>
                {fi.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Week Navigation */}
        <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-3">
            <CalendarDays className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-700 capitalize whitespace-nowrap">{weekLabel}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            disabled={isAfter(addWeeks(currentWeek, 1), new Date())}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2">
          {locked ? (
            <Badge variant="secondary" className="bg-red-50 text-red-700 border border-red-200 gap-1">
              <Lock className="w-3 h-3" /> Verrouillé
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-200 gap-1">
              <CheckCircle2 className="w-3 h-3" /> Ouvert
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 text-zinc-500">
            <Clock className="w-3 h-3" />
            {completionCount}/{membres.length} complétés
          </Badge>
        </div>
      </div>

      {/* Completion Warning */}
      {!locked && completionCount < membres.length && membres.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            <span className="font-semibold">{membres.length - completionCount} membre(s)</span> n'ont pas encore été évalués cette semaine.
            Le formulaire se verrouillera automatiquement jeudi soir.
          </p>
        </div>
      )}

      {/* AI Pastoral Insights — for pilote_fi (uses current week's saisies) */}
      {membres.length > 0 && saisies.length > 0 && (
        <AIPastoralInsights
          membres={membres}
          saisies={saisies}
          fiName={familles.find((f) => f.id === selectedFI)?.name || "FI"}
        />
      )}

      {/* Data Grid */}
      {loadingSaisies ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <CliniqueGrid
          membres={membres}
          saisies={localSaisies}
          onUpdateSaisie={handleUpdateSaisie}
          locked={locked}
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-50 border border-emerald-200" />
          <span className="text-xs text-zinc-500">8-10 : Excellent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-200" />
          <span className="text-xs text-zinc-500">5-7 : Moyen</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-50 border border-red-200" />
          <span className="text-xs text-zinc-500">0-4 : Critique</span>
        </div>
      </div>
    </div>
  );
}