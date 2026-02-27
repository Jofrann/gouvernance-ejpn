import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";
import { createPageUrl } from "@/utils";

const STATUS_COLORS = {
  active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  en_pause: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  fermee: "bg-red-500/20 text-red-300 border-red-500/30",
};

export default function FIManagerPage() {
  useTrackActivity("FIManager");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingFI, setEditingFI] = useState(null);
  const [formData, setFormData] = useState({ name: "", pilote_email: "", pilote_nom: "", campus: "", status: "active" });

  const { data: familles = [] } = useQuery({
    queryKey: ["familles"],
    queryFn: () => base44.entities.FamilleImpact.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const res = await base44.functions.invoke("listUsers", {});
      return res.data?.users || [];
    },
  });

  // Real-time subscription
  React.useEffect(() => {
    const unsub = base44.entities.FamilleImpact.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["familles"] });
    });
    return unsub;
  }, [queryClient]);

  const createFIMutation = useMutation({
    mutationFn: async () => {
      if (editingFI) {
        await base44.entities.FamilleImpact.update(editingFI.id, formData);
      } else {
        await base44.entities.FamilleImpact.create({
          ...formData,
          date_ouverture: new Date().toISOString().split("T")[0],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familles"] });
      handleCloseForm();
    },
  });

  const deleteFIMutation = useMutation({
    mutationFn: (fiId) => base44.entities.FamilleImpact.delete(fiId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familles"] });
    },
  });

  const handleOpenForm = (fi = null) => {
    if (fi) {
      setEditingFI(fi);
      setFormData({
        name: fi.name,
        pilote_email: fi.pilote_email,
        pilote_nom: fi.pilote_nom,
        campus: fi.campus,
        status: fi.status,
      });
    } else {
      setEditingFI(null);
      setFormData({ name: "", pilote_email: "", pilote_nom: "", campus: "", status: "active" });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingFI(null);
    setFormData({ name: "", pilote_email: "", pilote_nom: "", campus: "", status: "active" });
  };

  const filtered = familles.filter((fi) =>
    fi.name?.toLowerCase().includes(search.toLowerCase()) ||
    fi.pilote_nom?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Gouvernance</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Gestion des Familles d'Impact</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Créer · Modifier · Supprimer des FI</p>
      </motion.div>

      {/* Controls */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
          />
        </div>
        <Button onClick={() => handleOpenForm()} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nouvelle FI
        </Button>
      </motion.div>

      {/* FI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((fi, i) => (
          <motion.div key={fi.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 space-y-4 hover:border-white/[0.14] transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{fi.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{fi.campus}</p>
                </div>
                <Badge className={`text-[10px] border ${STATUS_COLORS[fi.status]}`}>
                  {fi.status}
                </Badge>
              </div>

              <div className="space-y-2 border-t border-white/[0.05] pt-3">
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase">Pilote</p>
                  <p className="text-sm font-semibold text-white">{fi.pilote_nom}</p>
                  <p className="text-xs text-zinc-500">{fi.pilote_email}</p>
                </div>
                {fi.co_pilote_nom && (
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase">Co-Pilote</p>
                    <p className="text-sm text-white">{fi.co_pilote_nom}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/[0.05]">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => handleOpenForm(fi)}
                >
                  <Edit2 className="w-3.5 h-3.5" /> Modifier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => window.location.href = createPageUrl("FIHub") + `?fiId=${fi.id}`}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Hub
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => deleteFIMutation.mutate(fi.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-sm text-zinc-600">
          Aucune FI trouvée
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFI ? "Modifier" : "Créer"} une FI</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Nom de la FI"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-white/5 border-white/10"
            />

            <Input
              placeholder="Campus"
              value={formData.campus}
              onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
              className="bg-white/5 border-white/10"
            />

            <Select value={formData.pilote_email} onValueChange={(email) => {
              const user = allUsers.find(u => u.email === email);
              setFormData({
                ...formData,
                pilote_email: email,
                pilote_nom: user?.full_name || "",
              });
            }}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Sélectionner un pilote" />
              </SelectTrigger>
              <SelectContent>
                {allUsers.map((u) => (
                  <SelectItem key={u.id} value={u.email}>
                    {u.full_name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={formData.status} onValueChange={(status) => setFormData({ ...formData, status })}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="en_pause">En pause</SelectItem>
                <SelectItem value="fermee">Fermée</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => createFIMutation.mutate()}
              disabled={!formData.name.trim() || !formData.pilote_email || createFIMutation.isPending}
              className="w-full"
            >
              {editingFI ? "Modifier" : "Créer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}