import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, Plus, CheckCircle2, XCircle, Clock, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

export default function FITransfertsPage() {
  useTrackActivity("FITransferts");
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selectedMembre, setSelectedMembre] = useState(null);
  const [targetFI, setTargetFI] = useState("");
  const [type, setType] = useState("formation");
  const [saving, setSaving] = useState(false);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isResponsable = user?.role === "admin" || user?.role === "responsable_fi";

  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres-all"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });

  const enFormation = membres.filter(m => m.potentiel_formation);
  const transMembers = membres.filter(m => m.notes?.startsWith("TRANSFERT:"));

  const getFI = (id) => familles.find(f => f.id === id);

  const handleRequest = async () => {
    if (!selectedMembre) return;
    setSaving(true);
    if (type === "formation") {
      await base44.entities.Membre.update(selectedMembre, { potentiel_formation: true });
      toast.success("Membre identifié pour la Formation !");
    } else if (type === "fi" && targetFI) {
      const targetName = getFI(targetFI)?.name || targetFI;
      await base44.entities.Membre.update(selectedMembre, { notes: `TRANSFERT: vers ${targetName} (en attente)` });
      toast.success("Demande de transfert enregistrée !");
    }
    qc.invalidateQueries({ queryKey: ["membres-all"] });
    setShowNew(false);
    setSaving(false);
    setSelectedMembre(null);
    setTargetFI("");
  };

  const handleApprove = async (m) => {
    const match = (m.notes || "").match(/vers (.+) \(en attente\)/);
    const targetFIObj = familles.find(f => f.name === match?.[1]);
    if (targetFIObj) await base44.entities.Membre.update(m.id, { famille_impact_id: targetFIObj.id, notes: `Transféré vers ${targetFIObj.name}` });
    else await base44.entities.Membre.update(m.id, { notes: m.notes?.replace("en attente", "approuvé") });
    qc.invalidateQueries({ queryKey: ["membres-all"] });
    toast.success("Transfert approuvé !");
  };

  const handleReject = async (m) => {
    await base44.entities.Membre.update(m.id, { notes: "" });
    qc.invalidateQueries({ queryKey: ["membres-all"] });
    toast.success("Demande annulée");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Familles d'Impact</p>
          <h1 className="text-lg font-bold text-white">Demandes de Transfert</h1>
          <p className="text-xs text-zinc-600">Identifications Formation · Mobilités inter-FI</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all">
          <Plus className="w-4 h-4" /> Nouvelle Demande
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Formation track */}
        <div>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
            Identifiés pour la Formation ({enFormation.length})
          </h2>
          {enFormation.length === 0 ? (
            <div className="ai-card rounded-xl border border-white/5 p-8 text-center">
              <p className="text-sm text-zinc-600">Aucun membre identifié pour la formation</p>
            </div>
          ) : (
            <div className="space-y-2">
              {enFormation.map(m => (
                <div key={m.id} className="ai-card flex items-center justify-between p-4 rounded-xl border border-violet-500/20 bg-violet-900/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">
                      {m.nom_complet?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{m.nom_complet}</p>
                      <p className="text-xs text-zinc-500">{getFI(m.famille_impact_id)?.name || "—"} · {m.statut_pipeline}</p>
                    </div>
                  </div>
                  <span className="text-[10px] border px-2 py-0.5 rounded-md text-violet-400 bg-violet-900/30 border-violet-500/30">✦ Formation</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inter-FI transfers */}
        {transMembers.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
              Transferts Inter-FI ({transMembers.length})
            </h2>
            <div className="space-y-2">
              {transMembers.map(m => (
                <div key={m.id} className="ai-card flex items-center justify-between gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-900/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">
                      {m.nom_complet?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{m.nom_complet}</p>
                      <p className="text-xs text-zinc-500">{m.notes?.replace("TRANSFERT: ", "")}</p>
                    </div>
                  </div>
                  {isResponsable ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(m)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs text-white transition-all">
                        <CheckCircle2 className="w-3 h-3" /> Approuver
                      </button>
                      <button onClick={() => handleReject(m)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 text-xs text-red-400 hover:bg-red-900/20 transition-all">
                        <XCircle className="w-3 h-3" /> Rejeter
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] border px-2 py-0.5 rounded-md text-amber-400 bg-amber-900/30 border-amber-500/30 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> En attente
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {enFormation.length === 0 && transMembers.length === 0 && (
          <div className="ai-card rounded-xl border border-white/5 p-12 text-center">
            <ArrowRightLeft className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-600">Aucune demande en cours</p>
          </div>
        )}
      </div>

      <Sheet open={showNew} onOpenChange={setShowNew}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-[#0d1018] border-l border-white/10 overflow-y-auto p-5">
          <SheetHeader className="pb-4 border-b border-white/10">
            <SheetTitle className="text-white">Nouvelle Demande</SheetTitle>
          </SheetHeader>
          <div className="py-5 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5">Type de demande</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="formation">✦ Identifier pour la Formation</SelectItem>
                  <SelectItem value="fi">↔ Transfert vers une autre FI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5">Membre</label>
              <Select value={selectedMembre || ""} onValueChange={setSelectedMembre}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Sélectionner un membre" /></SelectTrigger>
                <SelectContent>
                  {membres.filter(m => !m.potentiel_formation).map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nom_complet} — {getFI(m.famille_impact_id)?.name || "?"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {type === "fi" && (
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1.5">FI de destination</label>
                <Select value={targetFI} onValueChange={setTargetFI}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Choisir une FI" /></SelectTrigger>
                  <SelectContent>{familles.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <button onClick={handleRequest} disabled={saving || !selectedMembre}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-semibold text-white transition-all">
              {saving ? "Envoi..." : "Soumettre la Demande"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}