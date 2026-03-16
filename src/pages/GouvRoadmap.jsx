import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MapPin, Plus, CheckCircle2, Clock, AlertTriangle, Flag } from "lucide-react";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

const POLES = [{ value: "familles_impact", label: "Familles d'Impact" }, { value: "formation", label: "Formation" }, { value: "evangelisation", label: "Évangélisation" }, { value: "communication", label: "Communication" }];
const POLE_COLORS = { familles_impact: "bg-emerald-500", formation: "bg-violet-500", evangelisation: "bg-rose-500", communication: "bg-orange-500" };
const POLE_DARK = { familles_impact: "bg-emerald-500/5 border-emerald-500/20", formation: "bg-violet-500/5 border-violet-500/20", evangelisation: "bg-rose-500/5 border-rose-500/20", communication: "bg-orange-500/5 border-orange-500/20" };

export default function GouvRoadmapPage() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({ titre: "", pole: "familles_impact", cycle: "", date_echeance: "", objectif_cible: "100", valeur_actuelle: "0", unite: "%" });
  const [saving, setSaving] = useState(false);

  const { data: okrs = [] } = useQuery({ queryKey: ["okrs"], queryFn: () => base44.entities.OKR.list() });
  const milestones = okrs.filter((o) => o.date_echeance).sort((a, b) => new Date(a.date_echeance) - new Date(b.date_echeance));
  const today = new Date();

  const getStatus = (okr) => {
    if (okr.statut === "atteint") return "atteint";
    if (okr.date_echeance && isBefore(parseISO(okr.date_echeance), today)) return "depasse";
    return okr.statut;
  };

  const handleCreate = async () => {
    if (!form.titre) { toast.error("Titre requis"); return; }
    setSaving(true);
    await base44.entities.OKR.create({ ...form, statut: "en_cours", objectif_cible: parseFloat(form.objectif_cible) || 100, valeur_actuelle: parseFloat(form.valeur_actuelle) || 0 });
    queryClient.invalidateQueries({ queryKey: ["okrs"] });
    toast.success("Jalon ajouté à la roadmap !");
    setSheetOpen(false);
    setSaving(false);
  };

  const handleToggle = async (okr) => {
    const newStatut = okr.statut === "atteint" ? "en_cours" : "atteint";
    await base44.entities.OKR.update(okr.id, { statut: newStatut });
    queryClient.invalidateQueries({ queryKey: ["okrs"] });
  };

  const byMonth = {};
  milestones.forEach((m) => {
    const key = m.date_echeance.slice(0, 7);
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(m);
  });

  return (
    <div className="px-6 py-10 max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Gouvernance</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Roadmap & Jalons</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Feuille de route du cycle · OKR avec échéances</p>
        </div>
        <button className="btn-glow-blue flex items-center gap-2 px-4 py-2.5" onClick={() => setSheetOpen(true)}>
          <Plus className="w-4 h-4" /> Ajouter un Jalon
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(POLE_COLORS).map(([k, c]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className={cn("w-2.5 h-2.5 rounded-full", c)} />
            <span className="text-xs text-zinc-500">{POLES.find((p) => p.value === k)?.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      {milestones.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] py-16 text-center">
          <MapPin className="w-10 h-10 mx-auto mb-2 text-zinc-700" />
          <p className="text-sm text-zinc-500">Ajoutez des OKR avec des dates d'échéance pour construire la roadmap</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byMonth).map(([month, items]) => {
            const monthDate = new Date(month + "-01");
            const isPast = isBefore(monthDate, today);
            return (
              <div key={month}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("px-3 py-1 rounded-full text-xs font-bold", isPast ? "bg-white/5 text-zinc-500 border border-white/10" : "bg-white/10 text-white")}>
                    {format(monthDate, "MMMM yyyy", { locale: fr })}
                  </div>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
                <div className="space-y-2 ml-3">
                  {items.map((okr) => {
                    const status = getStatus(okr);
                    const progress = okr.objectif_cible > 0 ? Math.min(100, Math.round((okr.valeur_actuelle / okr.objectif_cible) * 100)) : 0;
                    return (
                      <div key={okr.id} className={cn("flex items-start gap-3 p-3 rounded-xl border", POLE_DARK[okr.pole] || "border-white/[0.07] bg-white/[0.02]")}>
                        <div className={cn("w-3 h-3 rounded-full mt-1 flex-shrink-0", POLE_COLORS[okr.pole])} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn("text-sm font-semibold text-white", status === "atteint" && "line-through text-zinc-500")}>{okr.titre}</p>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {status === "atteint" && <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-0.5" />Atteint</Badge>}
                              {status === "depasse" && <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px]"><AlertTriangle className="w-3 h-3 mr-0.5" />Dépassé</Badge>}
                              {status === "en_cours" && <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]"><Clock className="w-3 h-3 mr-0.5" />En cours</Badge>}
                              {status === "en_retard" && <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">En retard</Badge>}
                            </div>
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">{POLES.find((p) => p.value === okr.pole)?.label} · {okr.valeur_actuelle}/{okr.objectif_cible} {okr.unite} ({progress}%)</p>
                          <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                            <div className={cn("h-full rounded-full", POLE_COLORS[okr.pole])} style={{ width: `${progress}%`, opacity: 0.6 }} />
                          </div>
                        </div>
                        <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-white/10 transition-all flex-shrink-0" onClick={() => handleToggle(okr)}>
                          {okr.statut === "atteint" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Flag className="w-4 h-4 text-zinc-600" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-[#0d1018] border-white/10 text-white">
          <SheetHeader className="pb-4 border-b border-white/10"><SheetTitle className="text-white">Nouveau Jalon</SheetTitle></SheetHeader>
          <div className="py-5 space-y-4">
            <div><label className="text-xs font-medium text-zinc-500">Titre *</label><input className="input-glass mt-1" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Ex: 80% pilotes actifs" /></div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Pôle</label>
              <Select value={form.pole} onValueChange={(v) => setForm({ ...form, pole: v })}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{POLES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs font-medium text-zinc-500">Cible</label><input type="number" className="input-glass mt-1" value={form.objectif_cible} onChange={(e) => setForm({ ...form, objectif_cible: e.target.value })} /></div>
              <div><label className="text-xs font-medium text-zinc-500">Unité</label><input className="input-glass mt-1" value={form.unite} onChange={(e) => setForm({ ...form, unite: e.target.value })} /></div>
            </div>
            <div><label className="text-xs font-medium text-zinc-500">Date d'échéance</label><input type="date" className="input-glass mt-1" value={form.date_echeance} onChange={(e) => setForm({ ...form, date_echeance: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-zinc-500">Cycle</label><input className="input-glass mt-1" placeholder="Ex: Q1 2026" value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value })} /></div>
            <button className="btn-glow-blue w-full py-2.5" disabled={saving} onClick={handleCreate}>{saving ? "Ajout..." : "Ajouter à la Roadmap"}</button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}