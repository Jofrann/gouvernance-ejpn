import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

const STATUTS = ["passif", "regulier", "disciple", "reproducteur"];

export default function ManageMembersModal({ isOpen, onClose, fiId, fiName }) {
  const queryClient = useQueryClient();
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberStatut, setNewMemberStatut] = useState("passif");

  const { data: membres = [] } = useQuery({
    queryKey: ["membres", fiId],
    queryFn: () => fiId ? base44.entities.Membre.filter({ famille_impact_id: fiId }) : Promise.resolve([]),
    enabled: isOpen && !!fiId,
  });

  const createMemberMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Membre.create({
        nom_complet: newMemberName,
        famille_impact_id: fiId,
        telephone: newMemberPhone,
        email: newMemberEmail,
        statut_pipeline: newMemberStatut,
        date_entree: new Date().toISOString().split("T")[0],
      });
    },
    onSuccess: () => {
      setNewMemberName("");
      setNewMemberPhone("");
      setNewMemberEmail("");
      setNewMemberStatut("passif");
      queryClient.invalidateQueries({ queryKey: ["membres", fiId] });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ membreId, data }) => {
      await base44.entities.Membre.update(membreId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membres", fiId] });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (membreId) => {
      await base44.entities.Membre.delete(membreId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membres", fiId] });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer les membres · {fiName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Add new member */}
          <div className="p-4 rounded-xl border border-white/[0.07] bg-white/[0.02] space-y-3">
            <h4 className="text-sm font-bold text-white">Ajouter un membre</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Nom complet"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <Input
                placeholder="Email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <Input
                placeholder="Téléphone"
                value={newMemberPhone}
                onChange={(e) => setNewMemberPhone(e.target.value)}
                className="bg-white/5 border-white/10"
              />
              <Select value={newMemberStatut} onValueChange={setNewMemberStatut}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => createMemberMutation.mutate()}
              disabled={!newMemberName.trim() || createMemberMutation.isPending}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </Button>
          </div>

          {/* Members list */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white">Membres ({membres.length})</h4>
            {membres.length === 0 ? (
              <p className="text-xs text-zinc-500">Aucun membre pour le moment</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {membres.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-3 rounded-lg border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{m.nom_complet}</p>
                      <p className="text-xs text-zinc-500">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={m.statut_pipeline}
                        onValueChange={(value) =>
                          updateMemberMutation.mutate({
                            membreId: m.id,
                            data: { statut_pipeline: value },
                          })
                        }
                      >
                        <SelectTrigger className="w-32 h-7 text-xs bg-white/5 border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-500 hover:text-red-400"
                        onClick={() => deleteMemberMutation.mutate(m.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}