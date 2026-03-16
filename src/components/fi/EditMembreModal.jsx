import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil } from "lucide-react";

export default function EditMembreModal({ membre, onClose, onSave }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (membre) {
      setForm({
        nom_complet: membre.nom_complet || "",
        telephone: membre.telephone || "",
        email: membre.email || "",
        age: membre.age || "",
        ville: membre.ville || "",
        genre: membre.genre || "",
        statut_pipeline: membre.statut_pipeline || "passif",
      });
    }
  }, [membre]);

  const handleSave = () => {
    onSave(membre.id, { ...form, age: form.age ? parseInt(form.age) : undefined });
  };

  return (
    <Dialog open={!!membre} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0d14] border border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Pencil className="w-4 h-4 text-amber-400" />
            Modifier — {membre?.nom_complet}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <p className="text-xs text-zinc-400 mb-1.5">Nom complet *</p>
            <Input value={form.nom_complet} onChange={e => setForm(f => ({ ...f, nom_complet: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1.5">Téléphone</p>
            <Input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
              placeholder="06..." className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1.5">Email</p>
            <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="jean@..." className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1.5">Âge</p>
            <Input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1.5">Ville</p>
            <Input value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
              placeholder="Paris" className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1.5">Genre</p>
            <Select value={form.genre} onValueChange={v => setForm(f => ({ ...f, genre: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="homme">Homme</SelectItem>
                <SelectItem value="femme">Femme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1.5">Statut Pipeline</p>
            <Select value={form.statut_pipeline} onValueChange={v => setForm(f => ({ ...f, statut_pipeline: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["passif", "regulier", "disciple", "serviteur", "reproducteur"].map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white btn-ghost-glass">Annuler</Button>
          <Button onClick={handleSave} disabled={!form.nom_complet} className="btn-glow-blue px-5">
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}