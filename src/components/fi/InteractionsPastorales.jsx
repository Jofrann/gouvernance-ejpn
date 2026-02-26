import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Phone, Users, Heart, MessageSquare, Home, Tag, CheckCircle2, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const TYPE_CONFIG = {
  appel:     { label: "Appel",     icon: Phone,        color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
  rencontre: { label: "Rencontre", icon: Users,         color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  priere:    { label: "Prière",    icon: Heart,         color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20" },
  message:   { label: "Message",   icon: MessageSquare, color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/20" },
  visite:    { label: "Visite",    icon: Home,          color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  autre:     { label: "Autre",     icon: Tag,           color: "text-zinc-400",    bg: "bg-zinc-500/10 border-zinc-500/20" },
};

const EMPTY_FORM = {
  type_interaction: "appel",
  date_interaction: new Date().toISOString().split("T")[0],
  titre: "",
  notes: "",
  suivi_requis: false,
};

export default function InteractionsPastorales({ membre, famillId, user, canWrite }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: interactions = [] } = useQuery({
    queryKey: ["interactions", membre.id],
    queryFn: () => base44.entities.InteractionPastorale.filter({ membre_id: membre.id }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InteractionPastorale.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interactions", membre.id] });
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const toggleSuiviMutation = useMutation({
    mutationFn: ({ id, suivi_fait }) => base44.entities.InteractionPastorale.update(id, { suivi_fait }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["interactions", membre.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InteractionPastorale.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["interactions", membre.id] }),
  });

  const handleSubmit = () => {
    if (!form.titre || !form.type_interaction || !form.date_interaction) return;
    createMutation.mutate({
      ...form,
      membre_id: membre.id,
      famille_impact_id: famillId,
      auteur_nom: user?.full_name || "",
      auteur_email: user?.email || "",
    });
  };

  const sorted = [...interactions].sort((a, b) => new Date(b.date_interaction) - new Date(a.date_interaction));
  const pendingSuivi = sorted.filter(i => i.suivi_requis && !i.suivi_fait).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-zinc-300">Journal Pastoral</p>
          {pendingSuivi > 0 && (
            <p className="text-[10px] text-amber-400">{pendingSuivi} suivi(s) en attente</p>
          )}
        </div>
        {canWrite && (
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="h-7 px-3 text-xs bg-violet-600/60 hover:bg-violet-600 border border-violet-500/30 text-white"
          >
            <Plus className="w-3 h-3 mr-1" /> Ajouter
          </Button>
        )}
      </div>

      {/* Add form */}
      {showForm && canWrite && (
        <div
          className="rounded-xl border border-violet-500/20 p-4 space-y-3"
          style={{ background: "rgba(139,92,246,0.05)", backdropFilter: "blur(20px)" }}
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-zinc-500 mb-1">Type</p>
              <Select value={form.type_interaction} onValueChange={v => setForm(f => ({ ...f, type_interaction: v }))}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 mb-1">Date</p>
              <Input
                type="date"
                value={form.date_interaction}
                onChange={e => setForm(f => ({ ...f, date_interaction: e.target.value }))}
                className="h-8 text-xs bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 mb-1">Titre *</p>
            <Input
              value={form.titre}
              onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
              placeholder="Ex: Appel de soutien suite à la clinique..."
              className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
            />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 mb-1">Notes pastorales</p>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Observations, points abordés, état du membre..."
              className="text-xs bg-white/5 border-white/10 text-white placeholder:text-zinc-600 resize-none h-20"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.suivi_requis}
                onCheckedChange={v => setForm(f => ({ ...f, suivi_requis: v }))}
                className="scale-75"
              />
              <span className="text-xs text-zinc-400">Suivi requis</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-7 px-3 text-xs text-zinc-500 hover:text-white" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="h-7 px-3 text-xs bg-violet-600 hover:bg-violet-500 text-white"
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {sorted.length === 0 ? (
        <div className="py-6 text-center">
          <Heart className="w-6 h-6 text-zinc-700 mx-auto mb-1.5" />
          <p className="text-xs text-zinc-600">Aucune interaction enregistrée</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {sorted.map(interaction => {
            const cfg = TYPE_CONFIG[interaction.type_interaction] || TYPE_CONFIG.autre;
            const Icon = cfg.icon;
            return (
              <div
                key={interaction.id}
                className={cn(
                  "rounded-xl border p-3 space-y-1.5 group relative",
                  interaction.suivi_requis && !interaction.suivi_fait
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-white/[0.06] bg-white/[0.02]"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1 rounded-md border", cfg.bg)}>
                      <Icon className={cn("w-3 h-3", cfg.color)} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-200">{interaction.titre}</p>
                      <p className="text-[10px] text-zinc-500">
                        {cfg.label} · {format(new Date(interaction.date_interaction), "d MMM yyyy", { locale: fr })}
                        {interaction.auteur_nom && <span> · {interaction.auteur_nom}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canWrite && interaction.suivi_requis && (
                      <button
                        onClick={() => toggleSuiviMutation.mutate({ id: interaction.id, suivi_fait: !interaction.suivi_fait })}
                        className="p-1 rounded hover:bg-white/10"
                        title={interaction.suivi_fait ? "Marquer non suivi" : "Marquer suivi fait"}
                      >
                        {interaction.suivi_fait
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          : <Circle className="w-3.5 h-3.5 text-amber-400" />
                        }
                      </button>
                    )}
                    {canWrite && (user?.email === interaction.auteur_email || ["admin", "responsable_fi"].includes(user?.role)) && (
                      <button
                        onClick={() => deleteMutation.mutate(interaction.id)}
                        className="p-1 rounded hover:bg-red-500/10 text-zinc-600 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {interaction.notes && (
                  <p className="text-[11px] text-zinc-400 leading-relaxed pl-7">{interaction.notes}</p>
                )}

                {interaction.suivi_requis && (
                  <div className="flex items-center gap-1.5 pl-7">
                    {interaction.suivi_fait
                      ? <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Suivi effectué</span>
                      : <span className="text-[10px] text-amber-400 flex items-center gap-1"><Circle className="w-3 h-3" /> Suivi requis</span>
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}