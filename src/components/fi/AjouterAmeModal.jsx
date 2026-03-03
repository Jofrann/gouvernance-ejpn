import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PIPELINE_COLORS = {
  passif: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  regulier: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  disciple: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  serviteur: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  reproducteur: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const EMPTY_FORM = { nom_complet: "", telephone: "", email: "", age: "", ville: "", genre: "", statut_pipeline: "passif" };

export default function AjouterAmeModal({ open, onClose, familleImpactId, familleNom }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("vivier"); // "vivier" | "nouveau"
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Vivier = membres sans FI assignée
  const { data: tousLesMembres = [] } = useQuery({
    queryKey: ["membres-all-modal"],
    queryFn: () => base44.entities.Membre.list("-created_date", 500),
    enabled: open,
  });

  const vivier = tousLesMembres.filter(m => !m.famille_impact_id);
  const filteredVivier = vivier.filter(m => m.nom_complet?.toLowerCase().includes(search.toLowerCase()));

  const affecterMutation = useMutation({
    mutationFn: (membreId) => base44.entities.Membre.update(membreId, { famille_impact_id: familleImpactId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membres", familleImpactId] });
      queryClient.invalidateQueries({ queryKey: ["membres-all-modal"] });
      toast.success("Âme affectée à la FI !");
      onClose();
    },
  });

  const creerMutation = useMutation({
    mutationFn: (data) => base44.entities.Membre.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membres", familleImpactId] });
      toast.success("Âme créée et affectée !");
      setForm(EMPTY_FORM);
      onClose();
    },
  });

  const handleCreer = () => {
    if (!form.nom_complet) return;
    creerMutation.mutate({
      ...form,
      age: form.age ? parseInt(form.age) : undefined,
      famille_impact_id: familleImpactId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0d14] border border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Ajouter une Âme — {familleNom}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-1">
          {[{ key: "vivier", label: "Vivier Global" }, { key: "nouveau", label: "Nouveau Contact" }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                tab === t.key ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Vivier */}
        {tab === "vivier" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Rechercher dans le vivier..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {filteredVivier.length === 0 && (
                <p className="text-center text-sm text-zinc-600 py-8">Vivier vide</p>
              )}
              {filteredVivier.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                      {m.nom_complet?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{m.nom_complet}</p>
                      <p className="text-xs text-zinc-500">{m.ville || "—"} · {m.age ? `${m.age} ans` : "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-[10px] border", PIPELINE_COLORS[m.statut_pipeline])}>{m.statut_pipeline}</Badge>
                    <Button size="sm" className="h-7 px-2 bg-blue-600/80 hover:bg-blue-600 text-white gap-1 text-xs"
                      onClick={() => affecterMutation.mutate(m.id)} disabled={affecterMutation.isPending}>
                      <ArrowRight className="w-3 h-3" /> Affecter
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nouveau */}
        {tab === "nouveau" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <p className="text-xs text-zinc-400 mb-1.5">Nom complet *</p>
                <Input value={form.nom_complet} onChange={e => setForm(f => ({ ...f, nom_complet: e.target.value }))}
                  placeholder="Jean Dupont" className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
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
                  placeholder="25" className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1.5">Ville</p>
                <Input value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                  placeholder="Paris" className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1.5">Genre</p>
                <Select value={form.genre} onValueChange={v => setForm(f => ({ ...f, genre: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent><SelectItem value="homme">Homme</SelectItem><SelectItem value="femme">Femme</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1.5">Statut Pipeline</p>
                <Select value={form.statut_pipeline} onValueChange={v => setForm(f => ({ ...f, statut_pipeline: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["passif", "regulier", "disciple", "serviteur", "reproducteur"].map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white">Annuler</Button>
              <Button onClick={handleCreer} disabled={!form.nom_complet || creerMutation.isPending}
                className="bg-blue-600 hover:bg-blue-500 text-white gap-2">
                <UserPlus className="w-4 h-4" /> Créer & Affecter
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}