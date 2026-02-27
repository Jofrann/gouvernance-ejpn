import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const typeColors = {
  temps_fort: "bg-red-100 text-red-800",
  reunion: "bg-blue-100 text-blue-800",
  formation: "bg-purple-100 text-purple-800",
  evangelisation: "bg-green-100 text-green-800",
  celebration: "bg-yellow-100 text-yellow-800",
  autre: "bg-zinc-100 text-zinc-800"
};

export default function HubAgendaTab({ familleImpactId, canEdit = true }) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    date_debut: "",
    date_fin: "",
    lieu: "",
    type: "reunion"
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events", familleImpactId],
    queryFn: () => base44.entities.EvenementAgenda.filter({ famille_impact_id: familleImpactId })
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.EvenementAgenda.create({
      ...data,
      famille_impact_id: familleImpactId
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", familleImpactId] });
      setFormData({ titre: "", description: "", date_debut: "", date_fin: "", lieu: "", type: "reunion" });
      setIsDialogOpen(false);
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => base44.entities.EvenementAgenda.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", familleImpactId] });
    }
  });

  const sortedEvents = [...events].sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut));

  return (
    <div className="space-y-6">
      {canEdit && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter un événement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel événement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Titre"
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
              />
              <Textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <Input
                placeholder="Lieu"
                value={formData.lieu}
                onChange={(e) => setFormData({ ...formData, lieu: e.target.value })}
              />
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background"
              >
                <option value="reunion">Réunion</option>
                <option value="temps_fort">Temps fort</option>
                <option value="formation">Formation</option>
                <option value="evangelisation">Évangélisation</option>
                <option value="celebration">Célébration</option>
                <option value="autre">Autre</option>
              </select>
              <Input
                type="datetime-local"
                value={formData.date_debut}
                onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
              />
              <Input
                type="datetime-local"
                value={formData.date_fin}
                onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
              />
              <Button
                onClick={() => createEventMutation.mutate(formData)}
                disabled={!formData.titre || !formData.date_debut}
              >
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Events List */}
      <div className="space-y-3">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun événement prévu
          </div>
        ) : (
          sortedEvents.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="ai-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">{event.titre}</h3>
                    <Badge className={typeColors[event.type]}>
                      {event.type}
                    </Badge>
                    {event.source === "mobilisation_evangelisation" && (
                      <Badge variant="outline" className="bg-emerald-500/10 border-emerald-400/20">
                        Évangélisation
                      </Badge>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(event.date_debut), "PPP à HH:mm", { locale: fr })}
                    {event.date_fin && ` → ${format(new Date(event.date_fin), "HH:mm", { locale: fr })}`}
                  </div>
                  {event.lieu && (
                    <p className="text-xs text-muted-foreground mt-1">📍 {event.lieu}</p>
                  )}
                </div>
                {canEdit && (
                  <button
                    onClick={() => deleteEventMutation.mutate(event.id)}
                    className="p-2 hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}