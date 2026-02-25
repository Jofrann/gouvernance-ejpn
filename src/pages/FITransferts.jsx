import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowRightLeft, Plus, CheckCircle2, XCircle, Clock, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// We'll use the OKR entity as a workaround — but actually we'll track transfers via Membre updates
// This page: pilote can request to transfer a member to Formation (mark potentiel_formation=true)
// or to another FI (via notes). Responsable can approve.

export default function FITransfertsPage() {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selectedMembre, setSelectedMembre] = useState(null);
  const [targetFI, setTargetFI] = useState("");
  const [type, setType] = useState("formation");
  const [saving, setSaving] = useState(false);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isResponsable = user?.role === "admin" || user?.role === "responsable_fi";

  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: membres = [] } = useQuery({ queryKey: ["membres-all"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });

  // Members flagged for transfer: potentiel_formation OR notes containing "TRANSFERT:"
  const enFormation = membres.filter((m) => m.potentiel_formation);
  const transMembers = membres.filter((m) => m.notes?.startsWith("TRANSFERT:"));

  const getFI = (id) => familles.find((f) => f.id === id);

  const handleRequest = async () => {
    if (!selectedMembre) return;
    setSaving(true);
    if (type === "formation") {
      await base44.entities.Membre.update(selectedMembre, { potentiel_formation: true });
      toast.success("Membre identifié pour la Formation !");
    } else if (type === "fi" && targetFI) {
      const m = membres.find((x) => x.id === selectedMembre);
      const targetName = getFI(targetFI)?.name || targetFI;
      await base44.entities.Membre.update(selectedMembre, { notes: `TRANSFERT: vers ${targetName} (en attente)` });
      toast.success("Demande de transfert enregistrée !");
    }
    queryClient.invalidateQueries({ queryKey: ["membres-all"] });
    setShowNew(false);
    setSaving(false);
    setSelectedMembre(null);
    setTargetFI("");
  };

  const handleApproveTransfer = async (m) => {
    const note = m.notes || "";
    const match = note.match(/vers (.+) \(en attente\)/);
    const targetFIName = match?.[1];
    const targetFIObj = familles.find((f) => f.name === targetFIName);
    if (targetFIObj) {
      await base44.entities.Membre.update(m.id, { famille_impact_id: targetFIObj.id, notes: `Transféré vers ${targetFIObj.name}` });
    } else {
      await base44.entities.Membre.update(m.id, { notes: note.replace("en attente", "approuvé") });
    }
    queryClient.invalidateQueries({ queryKey: ["membres-all"] });
    toast.success("Transfert approuvé !");
  };

  const handleRejectTransfer = async (m) => {
    await base44.entities.Membre.update(m.id, { notes: "" });
    queryClient.invalidateQueries({ queryKey: ["membres-all"] });
    toast.success("Demande annulée");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Demandes de Transfert</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Identifications Formation · Mobilités inter-FI</p>
        </div>
        <Button className="bg-zinc-900 hover:bg-zinc-800 gap-2" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4" /> Nouvelle Demande
        </Button>
      </div>

      {/* Formation track */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="w-4 h-4 text-violet-600" />
          <h2 className="text-sm font-semibold text-violet-700 uppercase tracking-wider">Identifiés pour la Formation ({enFormation.length})</h2>
        </div>
        {enFormation.length === 0 ? (
          <Card className="border-zinc-200 bg-white"><CardContent className="py-10 text-center text-sm text-zinc-400">Aucun membre identifié pour la formation</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {enFormation.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-violet-200 bg-violet-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">{m.nom_complet?.[0]?.toUpperCase()}</div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{m.nom_complet}</p>
                    <p className="text-xs text-zinc-400">{getFI(m.famille_impact_id)?.name || "—"} · {m.statut_pipeline}</p>
                  </div>
                </div>
                <Badge className="bg-violet-100 text-violet-700 border border-violet-200 text-[10px]">✦ Formation</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inter-FI transfers */}
      {transMembers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ArrowRightLeft className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wider">Transferts Inter-FI ({transMembers.length})</h2>
          </div>
          <div className="space-y-2">
            {transMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">{m.nom_complet?.[0]?.toUpperCase()}</div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{m.nom_complet}</p>
                    <p className="text-xs text-zinc-400">{m.notes?.replace("TRANSFERT: ", "")}</p>
                  </div>
                </div>
                {isResponsable ? (
                  <div className="flex gap-1">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-7 px-2 gap-1 text-xs" onClick={() => handleApproveTransfer(m)}>
                      <CheckCircle2 className="w-3 h-3" /> Approuver
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleRejectTransfer(m)}>
                      <XCircle className="w-3 h-3" /> Rejeter
                    </Button>
                  </div>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px] gap-1"><Clock className="w-3 h-3" /> En attente</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Request Sheet */}
      <Sheet open={showNew} onOpenChange={setShowNew}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b"><SheetTitle>Nouvelle Demande</SheetTitle></SheetHeader>
          <div className="py-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-500">Type de demande</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1 bg-white border-zinc-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="formation">✦ Identifier pour la Formation</SelectItem>
                  <SelectItem value="fi">↔ Transfert vers une autre FI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Membre</label>
              <Select value={selectedMembre || ""} onValueChange={setSelectedMembre}>
                <SelectTrigger className="mt-1 bg-white border-zinc-200"><SelectValue placeholder="Sélectionner un membre" /></SelectTrigger>
                <SelectContent>{membres.filter((m) => !m.potentiel_formation).map((m) => <SelectItem key={m.id} value={m.id}>{m.nom_complet} — {getFI(m.famille_impact_id)?.name || "?"}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {type === "fi" && (
              <div>
                <label className="text-xs font-medium text-zinc-500">FI de destination</label>
                <Select value={targetFI} onValueChange={setTargetFI}>
                  <SelectTrigger className="mt-1 bg-white border-zinc-200"><SelectValue placeholder="Choisir une FI" /></SelectTrigger>
                  <SelectContent>{familles.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full bg-zinc-900 hover:bg-zinc-800" disabled={saving || !selectedMembre} onClick={handleRequest}>
              {saving ? "Envoi..." : "Soumettre la Demande"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}