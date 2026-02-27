import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Edit, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function FIFollowupTab({ fiId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editClinic, setEditClinic] = useState(null);
  const [form, setForm] = useState({ note_temps: 0, note_finances: 0, note_emotions: 0, note_spirituel: 0, commentaire: "" });

  const { data: membres = [] } = useQuery({
    queryKey: ["membres", fiId],
    queryFn: () => base44.entities.Membre.filter({ famille_impact_id: fiId }),
  });

  const { data: cliniques = [] } = useQuery({
    queryKey: ["cliniques", fiId],
    queryFn: () => base44.entities.CliniqueSaisie.filter({ famille_impact_id: fiId }, "-semaine"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CliniqueSaisie.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cliniques", fiId] });
      setShowForm(false);
      setEditClinic(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CliniqueSaisie.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cliniques", fiId] }),
  });

  const openEdit = (clinic) => {
    setForm({
      note_temps: clinic.note_temps || 0,
      note_finances: clinic.note_finances || 0,
      note_emotions: clinic.note_emotions || 0,
      note_spirituel: clinic.note_spirituel || 0,
      commentaire: clinic.commentaire || "",
    });
    setEditClinic(clinic);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!editClinic) return;
    updateMutation.mutate({ id: editClinic.id, data: form });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">Grille d'évaluation hebdomadaire des membres. Les données peuvent être modifiées à tout moment.</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-zinc-400 font-semibold">Membre</th>
              <th className="text-center py-3 px-4 text-zinc-400 font-semibold">Semaine</th>
              <th className="text-center py-3 px-4 text-zinc-400 font-semibold">Temps</th>
              <th className="text-center py-3 px-4 text-zinc-400 font-semibold">Finances</th>
              <th className="text-center py-3 px-4 text-zinc-400 font-semibold">Émotions</th>
              <th className="text-center py-3 px-4 text-zinc-400 font-semibold">Spirituel</th>
              <th className="text-center py-3 px-4 text-zinc-400 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cliniques.map((clinic) => {
              const membre = membres.find((m) => m.id === clinic.membre_id);
              return (
                <tr key={clinic.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-4 text-white">{membre?.nom_complet}</td>
                  <td className="py-3 px-4 text-center text-zinc-400 text-xs">{clinic.semaine}</td>
                  <td className="py-3 px-4 text-center text-white font-semibold">{clinic.note_temps}/10</td>
                  <td className="py-3 px-4 text-center text-white font-semibold">{clinic.note_finances}/10</td>
                  <td className="py-3 px-4 text-center text-white font-semibold">{clinic.note_emotions}/10</td>
                  <td className="py-3 px-4 text-center text-white font-semibold">{clinic.note_spirituel}/10</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center gap-2">
                      <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => openEdit(clinic)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500/60 hover:text-red-400" onClick={() => deleteMutation.mutate(clinic.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {cliniques.length === 0 && (
        <div className="py-12 text-center">
          <Calendar className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Aucune évaluation enregistrée</p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[#0f1117] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Modifier l'évaluation — {editClinic && membres.find((m) => m.id === editClinic.membre_id)?.nom_complet}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-400">Gestion du temps (0-10)</label>
              <Input type="number" min="0" max="10" value={form.note_temps} onChange={(e) => setForm({ ...form, note_temps: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 mt-1" />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Finances (0-10)</label>
              <Input type="number" min="0" max="10" value={form.note_finances} onChange={(e) => setForm({ ...form, note_finances: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 mt-1" />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Émotions (0-10)</label>
              <Input type="number" min="0" max="10" value={form.note_emotions} onChange={(e) => setForm({ ...form, note_emotions: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 mt-1" />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Spirituel (0-10)</label>
              <Input type="number" min="0" max="10" value={form.note_spirituel} onChange={(e) => setForm({ ...form, note_spirituel: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 mt-1" />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Commentaire</label>
              <Input value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} placeholder="Observations..." className="bg-white/5 border-white/10 mt-1" />
            </div>
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