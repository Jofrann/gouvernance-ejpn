import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const POLES = [{ value: "familles_impact", label: "Familles d'Impact" }, { value: "formation", label: "Formation" }, { value: "evangelisation", label: "Évangélisation" }, { value: "communication", label: "Communication" }];
const STATUTS = [{ value: "en_cours", label: "En cours" }, { value: "atteint", label: "Atteint ✓" }, { value: "en_retard", label: "En retard ⚠" }, { value: "abandonne", label: "Abandonné" }];
const POLE_COLORS = { familles_impact: "border-emerald-200 bg-emerald-50/30", formation: "border-violet-200 bg-violet-50/30", evangelisation: "border-rose-200 bg-rose-50/30", communication: "border-orange-200 bg-orange-50/30" };
const STATUT_COLORS = { en_cours: "bg-blue-50 text-blue-700 border-blue-200", atteint: "bg-emerald-50 text-emerald-700 border-emerald-200", en_retard: "bg-amber-50 text-amber-700 border-amber-200", abandonne: "bg-zinc-50 text-zinc-500 border-zinc-200" };

export default function GouvMasterPlanPage() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editOkr, setEditOkr] = useState(null);
  const [form, setForm] = useState({ titre: "", description: "", pole: "familles_impact", objectif_cible: "", valeur_actuelle: "0", unite: "%", cycle: "", statut: "en_cours", date_echeance: "" });
  const [saving, setSaving] = useState(false);

  const { data: okrs = [] } = useQuery({ queryKey: ["okrs"], queryFn: () => base44.entities.OKR.list() });

  const openCreate = () => { setEditOkr(null); setForm({ titre: "", description: "", pole: "familles_impact", objectif_cible: "", valeur_actuelle: "0", unite: "%", cycle: "", statut: "en_cours", date_echeance: "" }); setSheetOpen(true); };
  const openEdit = (okr) => { setEditOkr(okr); setForm({ titre: okr.titre, description: okr.description || "", pole: okr.pole, objectif_cible: okr.objectif_cible?.toString() || "", valeur_actuelle: okr.valeur_actuelle?.toString() || "0", unite: okr.unite || "%", cycle: okr.cycle || "", statut: okr.statut, date_echeance: okr.date_echeance || "" }); setSheetOpen(true); };

  const handleSave = async () => {
    if (!form.titre || !form.pole) { toast.error("Titre et pôle requis"); return; }
    setSaving(true);
    const data = { ...form, objectif_cible: parseFloat(form.objectif_cible) || 0, valeur_actuelle: parseFloat(form.valeur_actuelle) || 0 };
    if (editOkr) {
      await base44.entities.OKR.update(editOkr.id, data);
      toast.success("OKR mis à jour");
    } else {
      await base44.entities.OKR.create(data);
      toast.success("OKR créé !");
    }
    queryClient.invalidateQueries({ queryKey: ["okrs"] });
    setSheetOpen(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.OKR.delete(id);
    queryClient.invalidateQueries({ queryKey: ["okrs"] });
    toast.success("OKR supprimé");
  };

  const byPole = POLES.reduce((acc, p) => { acc[p.value] = okrs.filter((o) => o.pole === p.value); return acc; }, {});

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Appropriation & OKR</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Objectives & Key Results — 4 Pôles</p>
        </div>
        <Button className="bg-zinc-900 hover:bg-zinc-800 gap-2" onClick={openCreate}><Plus className="w-4 h-4" /> Nouvel OKR</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[["En cours", okrs.filter((o) => o.statut === "en_cours").length, "text-blue-700"], ["Atteints", okrs.filter((o) => o.statut === "atteint").length, "text-emerald-700"], ["En retard", okrs.filter((o) => o.statut === "en_retard").length, "text-amber-700"], ["Total", okrs.length, "text-zinc-900"]].map(([l, v, c]) => (
          <div key={l} className="p-3 rounded-xl border border-zinc-200 bg-white text-center">
            <p className={cn("text-2xl font-bold", c)}>{v}</p>
            <p className="text-xs text-zinc-400">{l}</p>
          </div>
        ))}
      </div>

      {/* OKRs by pole */}
      {POLES.map((pole) => (
        <div key={pole.value}>
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-3">{pole.label}</h2>
          {byPole[pole.value].length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center border border-dashed border-zinc-200 rounded-lg">Aucun OKR défini</p>
          ) : (
            <div className="space-y-2">
              {byPole[pole.value].map((okr) => {
                const progress = okr.objectif_cible > 0 ? Math.min(100, Math.round((okr.valeur_actuelle / okr.objectif_cible) * 100)) : 0;
                return (
                  <Card key={okr.id} className={cn("border", POLE_COLORS[okr.pole])}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-zinc-900">{okr.titre}</p>
                            <Badge className={cn("text-[10px] border", STATUT_COLORS[okr.statut])}>{STATUTS.find((s) => s.value === okr.statut)?.label}</Badge>
                          </div>
                          {okr.description && <p className="text-xs text-zinc-500">{okr.description}</p>}
                          <p className="text-xs text-zinc-400 mt-0.5">{okr.cycle} {okr.date_echeance ? `· Échéance: ${okr.date_echeance}` : ""}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(okr)}><Pencil className="w-3.5 h-3.5 text-zinc-400" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(okr.id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400">{okr.valeur_actuelle} / {okr.objectif_cible} {okr.unite}</span>
                          <span className={cn("font-bold", progress >= 80 ? "text-emerald-600" : progress >= 50 ? "text-blue-600" : "text-amber-600")}>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b"><SheetTitle>{editOkr ? "Modifier l'OKR" : "Nouvel OKR"}</SheetTitle></SheetHeader>
          <div className="py-5 space-y-4">
            {[["Titre *", "titre", "text", "Ex: 80% des pilotes actifs au S1"], ["Description", "description", "text", "Contexte et détails..."], ["Valeur cible", "objectif_cible", "number", "Ex: 80"], ["Valeur actuelle", "valeur_actuelle", "number", "Ex: 45"], ["Unité", "unite", "text", "%, nombre, heures..."], ["Cycle", "cycle", "text", "Ex: Q1 2026"], ["Date d'échéance", "date_echeance", "date", ""]].map(([l, k, t, p]) => (
              <div key={k}>
                <label className="text-xs font-medium text-zinc-500">{l}</label>
                <Input type={t} className="mt-1 bg-white border-zinc-200" placeholder={p} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-zinc-500">Pôle</label>
              <Select value={form.pole} onValueChange={(v) => setForm({ ...form, pole: v })}>
                <SelectTrigger className="mt-1 bg-white border-zinc-200"><SelectValue /></SelectTrigger>
                <SelectContent>{POLES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Statut</label>
              <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                <SelectTrigger className="mt-1 bg-white border-zinc-200"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-zinc-900 hover:bg-zinc-800" disabled={saving} onClick={handleSave}>{saving ? "Sauvegarde..." : editOkr ? "Enregistrer" : "Créer l'OKR"}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}