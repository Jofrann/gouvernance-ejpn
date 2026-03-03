import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Coffee, Heart, Plus, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import AssiduitéMatrix from "@/components/fi/AssiduitéMatrix";
import { detectChuteLivre } from "@/components/fi/ChuteLivreAlert";

const PIPELINE_STEPS = ["passif", "regulier", "disciple", "serviteur", "reproducteur"];
const PIPELINE_COLORS = {
  passif: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  regulier: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  disciple: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  serviteur: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  reproducteur: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const TYPE_INTERACTION = [
  { key: "appel", label: "Appel", icon: Phone },
  { key: "rencontre", label: "Rencontre", icon: Coffee },
  { key: "priere", label: "Prière", icon: Heart },
];

export default function FISlideOver({ membre, saisies = [], famillId, user, onClose }) {
  const queryClient = useQueryClient();
  const [newObjectif, setNewObjectif] = useState("");
  const [showObjectifInput, setShowObjectifInput] = useState(false);
  const [noteType, setNoteType] = useState("appel");
  const [noteContent, setNoteContent] = useState("");
  const [pipelineEdit, setPipelineEdit] = useState(false);

  const canWrite = ["admin", "responsable_fi", "pilote_fi", "copilote_fi"].includes(user?.role);

  const { data: objectifs = [] } = useQuery({
    queryKey: ["objectifs", membre?.id],
    queryFn: () => base44.entities.ObjectifPersonnel.filter({ membre_id: membre.id }),
    enabled: !!membre?.id,
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["interactions", membre?.id],
    queryFn: () => base44.entities.InteractionPastorale.filter({ membre_id: membre.id }),
    enabled: !!membre?.id,
  });

  const createObjectif = useMutation({
    mutationFn: (titre) => base44.entities.ObjectifPersonnel.create({ membre_id: membre.id, titre, auteur_email: user?.email }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["objectifs", membre.id] }); setNewObjectif(""); setShowObjectifInput(false); },
  });

  const toggleObjectif = useMutation({
    mutationFn: ({ id, accompli }) => base44.entities.ObjectifPersonnel.update(id, { accompli }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["objectifs", membre.id] }),
  });

  const deleteObjectif = useMutation({
    mutationFn: (id) => base44.entities.ObjectifPersonnel.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["objectifs", membre.id] }),
  });

  const createNote = useMutation({
    mutationFn: () => base44.entities.InteractionPastorale.create({
      membre_id: membre.id,
      famille_impact_id: famillId,
      type_interaction: noteType,
      date_interaction: format(new Date(), "yyyy-MM-dd"),
      titre: `${noteType} — ${format(new Date(), "d MMM", { locale: fr })}`,
      notes: noteContent,
      auteur_email: user?.email,
      auteur_nom: user?.full_name,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["interactions", membre.id] }); setNoteContent(""); },
  });

  const updatePipeline = useMutation({
    mutationFn: (statut_pipeline) => base44.entities.Membre.update(membre.id, { statut_pipeline }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["membres", famillId] }); setPipelineEdit(false); },
  });

  if (!membre) return null;
  const alerte = detectChuteLivre(membre.id, saisies);
  const memberSaisies = saisies.filter(s => s.membre_id === membre.id).sort((a, b) => new Date(b.semaine) - new Date(a.semaine));

  return (
    <Sheet open={!!membre} onOpenChange={onClose}>
      <SheetContent
        className="w-full sm:max-w-lg overflow-y-auto border-l border-white/[0.07]"
        style={{ background: "rgba(6,8,16,0.97)", backdropFilter: "blur(40px)" }}
      >
        {/* Header */}
        <SheetHeader className="pb-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-lg font-bold">
              {membre.nom_complet?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <SheetTitle className="text-lg font-bold text-white">{membre.nom_complet}</SheetTitle>
              <div className="flex items-center gap-2 mt-0.5">
                {pipelineEdit && canWrite ? (
                  <Select defaultValue={membre.statut_pipeline} onValueChange={(v) => updatePipeline.mutate(v)}>
                    <SelectTrigger className="h-6 text-xs bg-white/5 border-white/10 text-white w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STEPS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    className={cn("text-[10px] border cursor-pointer", PIPELINE_COLORS[membre.statut_pipeline])}
                    onClick={() => canWrite && setPipelineEdit(true)}
                  >
                    {membre.statut_pipeline}
                  </Badge>
                )}
                {alerte && <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px]">⚠ Chute Libre</Badge>}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="py-5 space-y-6">

          {/* Tunnel de croissance */}
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Tunnel de Croissance</p>
            <div className="flex items-center gap-1">
              {PIPELINE_STEPS.map((step, i) => {
                const currentIdx = PIPELINE_STEPS.indexOf(membre.statut_pipeline);
                const isDone = i <= currentIdx;
                return (
                  <React.Fragment key={step}>
                    <div className={cn("flex-1 h-1.5 rounded-full transition-all", isDone ? "bg-blue-500" : "bg-white/10")} />
                    {i < PIPELINE_STEPS.length - 1 && <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", isDone ? "bg-blue-500" : "bg-white/10")} />}
                  </React.Fragment>
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              {PIPELINE_STEPS.map((s, i) => (
                <span key={s} className={cn("text-[9px] capitalize", i <= PIPELINE_STEPS.indexOf(membre.statut_pipeline) ? "text-blue-400" : "text-zinc-600")}>{s}</span>
              ))}
            </div>
          </div>

          {/* Infos de base */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Ville", value: membre.ville || "—" },
              { label: "Âge", value: membre.age ? `${membre.age} ans` : "—" },
              { label: "Téléphone", value: membre.telephone || "—" },
              { label: "Potentiel", value: membre.potentiel_formation ? "✦ Formation" : "Non sélectionné", highlight: membre.potentiel_formation },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="p-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
                <p className={cn("font-medium mt-0.5 text-xs", highlight ? "text-violet-400" : "text-zinc-300")}>{value}</p>
              </div>
            ))}
          </div>

          {/* Assiduité */}
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Assiduité · 13 semaines</p>
            <AssiduitéMatrix membreId={membre.id} saisies={saisies} nbWeeks={13} />
          </div>

          {/* Objectifs Personnels */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Objectifs Personnels</p>
              {canWrite && (
                <button onClick={() => setShowObjectifInput(true)} className="p-1 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-all">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {showObjectifInput && (
              <div className="flex gap-2 mb-2">
                <Input
                  value={newObjectif}
                  onChange={e => setNewObjectif(e.target.value)}
                  placeholder="Titre de l'objectif..."
                  className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
                  onKeyDown={e => e.key === "Enter" && newObjectif && createObjectif.mutate(newObjectif)}
                />
                <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-500 text-white px-3" onClick={() => newObjectif && createObjectif.mutate(newObjectif)}>
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            <div className="space-y-1.5">
              {objectifs.length === 0 && <p className="text-xs text-zinc-600 py-2">Aucun objectif défini</p>}
              {objectifs.map(obj => (
                <div key={obj.id} className="flex items-center gap-2 p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] group">
                  <button onClick={() => toggleObjectif.mutate({ id: obj.id, accompli: !obj.accompli })}
                    className={cn("w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all",
                      obj.accompli ? "bg-emerald-500 border-emerald-500" : "border-white/20 hover:border-white/40")}>
                    {obj.accompli && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>
                  <span className={cn("text-xs flex-1", obj.accompli ? "line-through text-zinc-600" : "text-zinc-300")}>{obj.titre}</span>
                  {canWrite && (
                    <button onClick={() => deleteObjectif.mutate(obj.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes Pastorales */}
          {canWrite && (
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Ajouter un Suivi Pastoral</p>
              <div className="flex gap-1 mb-2">
                {TYPE_INTERACTION.map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setNoteType(key)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                      noteType === key ? "bg-blue-500/20 border-blue-500/30 text-blue-400" : "border-white/10 text-zinc-500 hover:text-white hover:bg-white/5")}>
                    <Icon className="w-3 h-3" />{label}
                  </button>
                ))}
              </div>
              <textarea
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Notes sur l'interaction..."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-zinc-600 text-xs p-3 resize-none focus:outline-none focus:border-blue-500/50"
              />
              <Button size="sm" className="mt-2 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs"
                onClick={() => noteContent && createNote.mutate()} disabled={!noteContent || createNote.isPending}>
                Enregistrer la note
              </Button>
            </div>
          )}

          {/* Historique interactions */}
          {interactions.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Historique Pastoral</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {interactions.sort((a, b) => new Date(b.date_interaction) - new Date(a.date_interaction)).map(i => {
                  const TypeIcon = TYPE_INTERACTION.find(t => t.key === i.type_interaction)?.icon || Heart;
                  return (
                    <div key={i.id} className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                      <div className="flex items-center gap-2 mb-1">
                        <TypeIcon className="w-3 h-3 text-zinc-500" />
                        <span className="text-[10px] text-zinc-500 capitalize">{i.type_interaction}</span>
                        <span className="text-[10px] text-zinc-600 ml-auto">{i.date_interaction}</span>
                      </div>
                      {i.notes && <p className="text-xs text-zinc-400">{i.notes}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Historique clinique */}
          {memberSaisies.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Historique Clinique</p>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {memberSaisies.slice(0, 8).map(s => {
                  const notes = [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter(n => n != null);
                  const avg = notes.length > 0 ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : null;
                  return (
                    <div key={s.id} className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-xs">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", s.presence ? "bg-emerald-400" : "bg-red-400")} />
                        <span className="text-zinc-500">{s.semaine}</span>
                        {s.flag_retard && <Badge className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/20 py-0 px-1">retard</Badge>}
                      </div>
                      <div className="flex gap-2 text-zinc-500">
                        <span>⏰{s.note_temps ?? "—"}</span>
                        <span>💰{s.note_finances ?? "—"}</span>
                        <span>💭{s.note_emotions ?? "—"}</span>
                        <span>🙏{s.note_spirituel ?? "—"}</span>
                        {avg && <span className={cn("font-bold", parseFloat(avg) >= 7 ? "text-emerald-400" : parseFloat(avg) >= 5 ? "text-amber-400" : "text-red-400")}>{avg}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}