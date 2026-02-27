import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { motion } from "framer-motion";

export default function FIAgendaTab({ fiId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [form, setForm] = useState({ titre: "", date: "", duree_minutes: "", description: "" });

  const { data: events = [] } = useQuery({
    queryKey: ["fi-events", fiId],
    queryFn: () => base44.entities.FIEvent.filter({ famille_impact_id: fiId }, "-date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FIEvent.create({ ...data, famille_impact_id: fiId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fi-events", fiId] });
      setShowForm(false);
      setForm({ titre: "", date: "", duree_minutes: "", description: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FIEvent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fi-events", fiId] });
      setShowForm(false);
      setEditEvent(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FIEvent.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fi-events", fiId] }),
  });

  const handleSubmit = () => {
    if (!form.titre || !form.date || !form.duree_minutes) return;
    if (editEvent) {
      updateMutation.mutate({ id: editEvent.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEdit = (event) => {
    setForm({ ...event });
    setEditEvent(event);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Événements de la FI</h3>
        <Button onClick={() => { setForm({ titre: "", date: "", duree_minutes: "", description: "" }); setEditEvent(null); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-500 gap-2">
          <Plus className="w-4 h-4" /> Ajouter un événement
        </Button>
      </div>

      <div className="grid gap-3">
        {events.map((event, i) => (
          <motion.div key={event.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="text-white font-semibold">{event.titre}</h4>
                <p className="text-sm text-zinc-400 mt-1">
                  <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
                  {event.date} • {event.duree_minutes} min
                </p>
                {event.description && <p className="text-sm text-zinc-500 mt-2">{event.description}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => openEdit(event)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500/60 hover:text-red-400" onClick={() => deleteMutation.mutate(event.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="py-12 text-center">
          <Calendar className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Aucun événement — créez-en un !</p>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[#0f1117] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editEvent ? "Modifier l'événement" : "Créer un événement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Titre de l'événement *" className="bg-white/5 border-white/10" />
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="bg-white/5 border-white/10" />
            <Input type="number" min="1" value={form.duree_minutes} onChange={(e) => setForm({ ...form, duree_minutes: parseInt(e.target.value) || "" })} placeholder="Durée en minutes *" className="bg-white/5 border-white/10" />
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description..." className="bg-white/5 border-white/10" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-500">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}