import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";
import { motion } from "framer-motion";

const POLES = [
  { value: "familles_impact", label: "Familles d'Impact", color: "text-emerald-400 border-emerald-500/30 bg-emerald-900/10", bar: "bg-emerald-500" },
  { value: "formation",       label: "Formation",          color: "text-violet-400 border-violet-500/30 bg-violet-900/10",   bar: "bg-violet-500" },
  { value: "evangelisation",  label: "Évangélisation",     color: "text-rose-400 border-rose-500/30 bg-rose-900/10",         bar: "bg-rose-500" },
  { value: "communication",   label: "Communication",      color: "text-orange-400 border-orange-500/30 bg-orange-900/10",   bar: "bg-orange-500" },
];

const STATUTS = [
  { value: "en_cours", label: "En cours",   cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { value: "atteint",  label: "Atteint ✓",  cls: "text-emerald-400 bg-emerald-900/30 border-emerald-500/20" },
  { value: "en_retard",label: "En retard ⚠",cls: "text-amber-400 bg-amber-900/30 border-amber-500/20" },
  { value: "abandonne",label: "Abandonné",   cls: "text-zinc-400 bg-zinc-800 border-zinc-700" },
];

const EMPTY = { titre: "", description: "", pole: "familles_impact", objectif_cible: "", valeur_actuelle: "0", unite: "%", cycle: "", statut: "en_cours", date_echeance: "" };

export default function GouvMasterPlanPage() {
  useTrackActivity("GouvMasterPlan");
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editOkr, setEditOkr] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data: okrs = [] } = useQuery({ queryKey: ["okrs"], queryFn: () => base44.entities.OKR.list(), refetchInterval: 30000 });

  const openCreate = () => { setEditOkr(null); setForm(EMPTY); setSheetOpen(true); };
  const openEdit = (okr) => { setEditOkr(okr); setForm({ titre: okr.titre, description: okr.description || "", pole: okr.pole, objectif_cible: okr.objectif_cible?.toString() || "", valeur_actuelle: okr.valeur_actuelle?.toString() || "0", unite: okr.unite || "%", cycle: okr.cycle || "", statut: okr.statut, date_echeance: okr.date_echeance || "" }); setSheetOpen(true); };

  const handleSave = async () => {
    if (!form.titre) { toast.error("Titre requis"); return; }
    setSaving(true);
    const data = { ...form, objectif_cible: parseFloat(form.objectif_cible) || 0, valeur_actuelle: parseFloat(form.valeur_actuelle) || 0 };
    if (editOkr) { await base44.entities.OKR.update(editOkr.id, data); toast.success("OKR mis à jour"); }
    else { await base44.entities.OKR.create(data); toast.success("OKR créé !"); }
    qc.invalidateQueries({ queryKey: ["okrs"] });
    setSheetOpen(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.OKR.delete(id);
    qc.invalidateQueries({ queryKey: ["okrs"] });
    toast.success("OKR supprimé");
  };

  const byPole = POLES.reduce((acc, p) => { acc[p.value] = okrs.filter(o => o.pole === p.value); return acc; }, {});

  const counts = {
    en_cours: okrs.filter(o => o.statut === "en_cours").length,
    atteint: okrs.filter(o => o.statut === "atteint").length,
    en_retard: okrs.filter(o => o.statut === "en_retard").length,
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Gouvernance</p>
          <h1 className="text-lg font-bold text-white">Appropriation & OKR</h1>
          <p className="text-xs text-zinc-600">Objectives & Key Results — 4 Pôles</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all">
          <Plus className="w-4 h-4" /> Nouvel OKR
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "En cours",  value: counts.en_cours,  color: "text-blue-400" },
            { label: "Atteints",  value: counts.atteint,   color: "text-emerald-400" },
            { label: "En retard", value: counts.en_retard, color: "text-amber-400" },
            { label: "Total",     value: okrs.length,       color: "text-white" },
          ].map(k => (
            <div key={k.label} className="ai-card rounded-xl border border-white/8 p-3 text-center">
              <p className={cn("text-2xl font-bold", k.color)}>{k.value}</p>
              <p className="text-[10px] text-zinc-600">{k.label}</p>
            </div>
          ))}
        </div>

        {/* OKRs by pole */}
        {POLES.map((pole, pi) => (
          <motion.div key={pole.value} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pi * 0.06 }}>
            <h2 className={cn("text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2", pole.color.split(" ")[0])}>
              <div className={cn("w-2 h-2 rounded-full", pole.bar)} />
              {pole.label}
            </h2>
            {byPole[pole.value].length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/8 p-6 text-center">
                <p className="text-xs text-zinc-600">Aucun OKR défini pour ce pôle</p>
              </div>
            ) : (
              <div className="space-y-2">
                {byPole[pole.value].map(okr => {
                  const prog = okr.objectif_cible > 0 ? Math.min(100, Math.round((okr.valeur_actuelle / okr.objectif_cible) * 100)) : 0;
                  const statutCfg = STATUTS.find(s => s.value === okr.statut) || STATUTS[0];
                  return (
                    <div key={okr.id} className={cn("ai-card p-4 rounded-xl border", pole.color)}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="text-sm font-semibold text-white">{okr.titre}</p>
                            <span className={cn("text-[10px] border px-1.5 py-0.5 rounded-md", statutCfg.cls)}>{statutCfg.label}</span>
                          </div>
                          {okr.description && <p className="text-xs text-zinc-500 mt-0.5">{okr.description}</p>}
                          <p className="text-[10px] text-zinc-600 mt-0.5">{okr.cycle}{okr.date_echeance ? ` · Échéance: ${okr.date_echeance}` : ""}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(okr)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                            <Pencil className="w-3.5 h-3.5 text-zinc-500" />
                          </button>
                          <button onClick={() => handleDelete(okr.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-red-500/60" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-600">{okr.valeur_actuelle} / {okr.objectif_cible} {okr.unite}</span>
                          <span className={cn("font-bold", prog >= 80 ? "text-emerald-400" : prog >= 50 ? "text-blue-400" : "text-amber-400")}>{prog}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all duration-700", pole.bar)} style={{ width: `${prog}%`, opacity: 0.7 }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-[#0d1018] border-l border-white/10 overflow-y-auto p-5">
          <SheetHeader className="pb-4 border-b border-white/10">
            <SheetTitle className="text-white">{editOkr ? "Modifier l'OKR" : "Nouvel OKR"}</SheetTitle>
          </SheetHeader>
          <div className="py-5 space-y-4">
            {[
              { label: "Titre *", key: "titre", type: "text", placeholder: "Ex: 80% des pilotes actifs" },
              { label: "Description", key: "description", type: "text", placeholder: "Contexte et détails..." },
              { label: "Valeur cible", key: "objectif_cible", type: "number", placeholder: "Ex: 80" },
              { label: "Valeur actuelle", key: "valeur_actuelle", type: "number", placeholder: "Ex: 45" },
              { label: "Unité", key: "unite", type: "text", placeholder: "%, nombre..." },
              { label: "Cycle", key: "cycle", type: "text", placeholder: "Ex: Q1 2026" },
              { label: "Date d'échéance", key: "date_echeance", type: "date", placeholder: "" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-zinc-500 font-medium block mb-1.5">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 transition-colors" />
              </div>
            ))}
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5">Pôle</label>
              <Select value={form.pole} onValueChange={v => setForm({ ...form, pole: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{POLES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5">Statut</label>
              <Select value={form.statut} onValueChange={v => setForm({ ...form, statut: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-semibold text-white transition-all">
              {saving ? "Sauvegarde..." : editOkr ? "Enregistrer" : "Créer l'OKR"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}