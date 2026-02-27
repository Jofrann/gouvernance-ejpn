import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function FIMembersTab({ fiId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [form, setForm] = useState({ nom_complet: "", email: "", telephone: "", age: "", ville: "", genre: "" });

  const { data: membres = [] } = useQuery({
    queryKey: ["membres", fiId],
    queryFn: () => base44.entities.Membre.filter({ famille_impact_id: fiId }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Membre.create({ ...data, famille_impact_id: fiId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membres", fiId] });
      setShowForm(false);
      setForm({ nom_complet: "", email: "", telephone: "", age: "", ville: "", genre: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Membre.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membres", fiId] });
      setShowForm(false);
      setEditMember(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Membre.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["membres", fiId] }),
  });

  const handleSubmit = () => {
    if (!form.nom_complet) return;
    if (editMember) {
      updateMutation.mutate({ id: editMember.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEdit = (membre) => {
    setForm({ ...membre });
    setEditMember(membre);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Membres ({membres.length})</h3>
        <Button onClick={() => { setForm({ nom_complet: "", email: "", telephone: "", age: "", ville: "", genre: "" }); setEditMember(null); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-500 gap-2">
          <Plus className="w-4 h-4" /> Ajouter
        </Button>
      </div>

      <div className="grid gap-3">
        {membres.map((m) => (
          <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">{m.nom_complet}</p>
              <p className="text-xs text-zinc-500">{m.email} • {m.telephone}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => openEdit(m)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-500/60 hover:text-red-400" onClick={() => deleteMutation.mutate(m.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {membres.length === 0 && (
        <div className="py-12 text-center">
          <Users className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Aucun membre — ajoutez-en un !</p>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[#0f1117] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editMember ? "Modifier le membre" : "Ajouter un membre"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={form.nom_complet} onChange={(e) => setForm({ ...form, nom_complet: e.target.value })} placeholder="Nom complet *" className="bg-white/5 border-white/10" />
            <Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" type="email" className="bg-white/5 border-white/10" />
            <Input value={form.telephone || ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="Téléphone" className="bg-white/5 border-white/10" />
            <Input value={form.age || ""} onChange={(e) => setForm({ ...form, age: parseInt(e.target.value) || "" })} placeholder="Âge" type="number" className="bg-white/5 border-white/10" />
            <Input value={form.ville || ""} onChange={(e) => setForm({ ...form, ville: e.target.value })} placeholder="Ville" className="bg-white/5 border-white/10" />
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