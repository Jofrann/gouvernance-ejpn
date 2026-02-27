import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function HubSuiviTab({ familleImpactId }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);

  const { data: membres = [] } = useQuery({
    queryKey: ["membres", familleImpactId],
    queryFn: () => base44.entities.AmeCRM.filter({ famille_impact_id: familleImpactId })
  });

  const { data: suivi = [] } = useQuery({
    queryKey: ["suivi", familleImpactId],
    queryFn: () => base44.entities.SuiviHebdomadaire.filter({ famille_impact_id: familleImpactId })
  });

  const updateSuiviMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SuiviHebdomadaire.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suivi", familleImpactId] });
      setEditingId(null);
    }
  });

  // Group suivi by semaine and membre
  const getSuiviForMembre = (membreId) => {
    return suivi
      .filter(s => s.ame_crm_id === membreId)
      .sort((a, b) => new Date(b.semaine_date) - new Date(a.semaine_date));
  };

  const handleUpdateNote = (suiviId, field, value) => {
    updateSuiviMutation.mutate({
      id: suiviId,
      data: { [field]: value }
    });
  };

  return (
    <div className="space-y-6">
      <div className="ai-card p-6 bg-blue-500/10 border-blue-400/20">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground text-sm">Aucun verrouillage</p>
            <p className="text-xs text-muted-foreground mt-1">
              Vous pouvez compléter le suivi en retard. Un tag "Saisi en retard" apparaîtra.
            </p>
          </div>
        </div>
      </div>

      {/* Grid de suivi par membre */}
      <div className="space-y-4">
        {membres.map((membre) => {
          const suiviList = getSuiviForMembre(membre.id);
          const lastSuivi = suiviList[0];

          return (
            <motion.div
              key={membre.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="ai-card p-4 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-foreground">{membre.nom_complet}</h3>
              </div>

              {lastSuivi ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {/* Présence */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Présence</label>
                    <input
                      type="checkbox"
                      checked={lastSuivi.presence || false}
                      onChange={(e) => handleUpdateNote(lastSuivi.id, "presence", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                  </div>

                  {/* Gestion du temps */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Temps</label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={lastSuivi.note_gestion_temps || ""}
                      onChange={(e) => handleUpdateNote(lastSuivi.id, "note_gestion_temps", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="-"
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Finances */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Finances</label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={lastSuivi.note_finances || ""}
                      onChange={(e) => handleUpdateNote(lastSuivi.id, "note_finances", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="-"
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Émotions */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Émotions</label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={lastSuivi.note_sante_emotionnelle || ""}
                      onChange={(e) => handleUpdateNote(lastSuivi.id, "note_sante_emotionnelle", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="-"
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Spirituel */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Spirituel</label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={lastSuivi.note_maturite_spirituelle || ""}
                      onChange={(e) => handleUpdateNote(lastSuivi.id, "note_maturite_spirituelle", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="-"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">Aucun suivi cette semaine</div>
              )}

              {lastSuivi?.saisi_en_retard && (
                <Badge variant="outline" className="bg-amber-500/10 border-amber-400/20 text-amber-400">
                  Saisi en retard
                </Badge>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}