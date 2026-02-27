import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function EventFormModal({ isOpen, onClose, fiId, selectedDate, user }) {
  const queryClient = useQueryClient();
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("temps_fort");
  const [lieu, setLieu] = useState("");
  const [heureDebut, setHeureDebut] = useState("09:00");
  const [heureFin, setHeureFin] = useState("10:00");
  const [syncEvang, setSyncEvang] = useState(false);

  const createEventMutation = useMutation({
    mutationFn: async () => {
      const dateDebut = new Date(selectedDate);
      const [h, m] = heureDebut.split(":");
      dateDebut.setHours(parseInt(h), parseInt(m));

      const dateFin = new Date(selectedDate);
      const [hf, mf] = heureFin.split(":");
      dateFin.setHours(parseInt(hf), parseInt(mf));

      await base44.entities.EvenementFI.create({
        famille_impact_id: fiId,
        titre,
        description,
        type,
        lieu,
        date_debut: dateDebut.toISOString(),
        date_fin: dateFin.toISOString(),
        sync_evangelisation: syncEvang,
        createur_email: user.email,
        createur_nom: user.full_name,
        statut: "planifie",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", fiId] });
      handleClose();
    },
  });

  const handleClose = () => {
    setTitre("");
    setDescription("");
    setType("temps_fort");
    setLieu("");
    setHeureDebut("09:00");
    setHeureFin("10:00");
    setSyncEvang(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer un événement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Titre de l'événement"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            className="bg-white/5 border-white/10"
          />

          <Textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-white/5 border-white/10 min-h-24"
          />

          <div className="grid grid-cols-2 gap-2">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="temps_fort">Temps Fort</SelectItem>
                <SelectItem value="reunion">Réunion</SelectItem>
                <SelectItem value="formation">Formation</SelectItem>
                <SelectItem value="evangelisation">Évangélisation</SelectItem>
                <SelectItem value="celebiration">Célébration</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Lieu"
              value={lieu}
              onChange={(e) => setLieu(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              type="time"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
              className="bg-white/5 border-white/10"
            />
            <Input
              type="time"
              value={heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={syncEvang}
              onChange={(e) => setSyncEvang(e.target.checked)}
              className="w-4 h-4 rounded border-white/10"
            />
            <span className="text-sm text-zinc-300">Synchroniser avec Pôle Évangélisation</span>
          </label>

          <Button
            onClick={() => createEventMutation.mutate()}
            disabled={!titre.trim() || createEventMutation.isPending}
            className="w-full"
          >
            Créer l'événement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}