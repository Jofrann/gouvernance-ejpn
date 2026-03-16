import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

const POLES = [{ value: "familles_impact", label: "Familles d'Impact" }, { value: "formation", label: "Formation" }, { value: "evangelisation", label: "Évangélisation" }, { value: "communication", label: "Communication" }];
const STATUTS = [{ value: "en_cours", label: "En cours" }, { value: "atteint", label: "Atteint ✓" }, { value: "en_retard", label: "En retard ⚠" }, { value: "abandonne", label: "Abandonné" }];
const POLE_COLORS_DARK = {
  familles_impact: "border-emerald-500/20 bg-emerald-500/5",
  formation: "border-violet-500/20 bg-violet-500/5",
  evangelisation: "border-rose-500/20 bg-rose-500/5",
  communication: "border-orange-500/20 bg-orange-500/5",
};
const POLE_LABEL_COLORS = {
  familles_impact: "text-emerald-400",
  formation: "text-violet-400",
  evangelisation: "text-rose-400",
  communication: "text-orange-400",
};
const STATUT_COLORS = {
  en_cours: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  atteint: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  en_retard: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  abandonne: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

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
    if (editOkr) { await base44.entities.OKR.update(editOkr.id, data); toast.success("OKR mis à jour"); }
    else { await base44.entities.OKR.create(data); toast.success("OKR créé !"); }
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
    <div className="px-6 py-10 max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Gouvernance</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Appropriation & OKR</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Objectives & Key Results — 4 Pôles</p>
        </div>
        <button className="btn-glow-blue flex items-center gap-2 px-4 py-2.5" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Nouvel OKR
        </button>
      </motion.div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: "En cours", v: okrs.filter((o) => o.statut === "en_cours").length, c: "text-blue-400" },
          { l: "Atteints", v: okrs.filter((o) => o.statut === "atteint").length, c: "text-emerald-400" },
          { l: "En retard", v: okrs.filter((o) => o.statut === "en_retard").length, c: "text-amber-400" },
          { l: "Total", v: okrs.length, c: "text-white" },
        ].map(({ l, v, c }) => (
          <div key={l} className="p-3 rounded-xl border border-white/[0.07] bg-white/[0.025] text-center">
            <p className={cn("text-2xl font-bold", c)}>{v}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* OKRs by pole */}
      {POLES.map((pole) => (
        <div key={pole.value}>
          <h2 className={cn("text-xs font-bold uppercase tracking-wider mb-3", POLE_LABEL_COLORS[pole.value])}>{pole.label}</h2>
          {byPole[pole.value].length === 0 ? (
            <p className="text-sm text-zinc-600 py-4 text-center border border-dashed border-white/[0.07] rounded-lg">Aucun OKR défini</p>
          ) : (
            <div className="space-y-2">
              {byPole[pole.value].map((okr) => {
                const progress = okr.objectif_cible > 0 ? Math.min(100, Math.round((okr.valeur_actuelle / okr.objectif_cible) * 100)) : 0;
                return (
                  <div key={okr.id} className={cn("rounded-xl border p-4", POLE_COLORS_DARK[okr.pole])}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-white">{okr.titre}</p>
                          <Badge className={cn("text-[10px] border", STATUT_COLORS[okr.statut])}>{STATUTS.find((s) => s.value === okr.statut)?.label}</Badge>
                        </div>
                        {okr.description && <p className="text-xs text-zinc-500">{okr.description}</p>}
                        <p className="text-xs text-zinc-600 mt-0.5">{okr.cycle} {okr.date_echeance ? `· Échéance: ${okr.date_echeance}` : ""}</p>
                      </div>
                      <div className="flex gap-1">
                        <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-white/10 transition-all" onClick={() => openEdit(okr)}><Pencil className="w-3.5 h-3.5 text-zinc-500" /></button>
                        <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-500/10 transition-all" onClick={() => handleDelete(okr.id)}><Trash2 className="w-3.5 h-3.5 text-red-500/70" /></button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">{okr.valeur_actuelle} / {okr.objectif_cible} {okr.unite}</span>
                        <span className={cn("font-bold", progress >= 80 ? "text-emerald-400" : progress >= 50 ? "text-blue-400" : "text-amber-400")}>{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", progress >= 80 ? "bg-emerald-500/60" : progress >= 50 ? "bg-blue-500/60" : "bg-amber-500/60")} style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-[#0d1018] border-white/10 text-white">
          <SheetHeader className="pb-4 border-b border-white/10">
            <SheetTitle className="text-white">{editOkr ? "Modifier l'OKR" : "Nouvel OKR"}</SheetTitle>
          </SheetHeader>
          <div className="py-5 space-y-4">
            {[["Titre *", "titre", "text", "Ex: 80% des pilotes actifs au S1"], ["Description", "description", "text", "Contexte et détails..."], ["Valeur cible", "objectif_cible", "number", "Ex: 80"], ["Valeur actuelle", "valeur_actuelle", "number", "Ex: 45"], ["Unité", "unite", "text", "%, nombre, heures..."], ["Cycle", "cycle", "text", "Ex: Q1 2026"], ["Date d'échéance", "date_echeance", "date", ""]].map(([l, k, t, p]) => (
              <div key={k}>
                <label className="text-xs font-medium text-zinc-500">{l}</label>
                <input type={t} className="input-glass mt-1" placeholder={p} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-zinc-500">Pôle</label>
              <Select value={form.pole} onValueChange={(v) => setForm({ ...form, pole: v })}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{POLES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Statut</label>
              <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <button className="btn-glow-blue w-full py-2.5" disabled={saving} onClick={handleSave}>{saving ? "Sauvegarde..." : editOkr ? "Enregistrer" : "Créer l'OKR"}</button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}