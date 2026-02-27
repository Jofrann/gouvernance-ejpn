import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Plus, CheckCircle2, Clock, AlertTriangle, Flag } from "lucide-react";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const POLES = [
  { value: "familles_impact", label: "Familles d'Impact", dot: "bg-emerald-500", light: "text-emerald-400" },
  { value: "formation",       label: "Formation",          dot: "bg-violet-500",  light: "text-violet-400" },
  { value: "evangelisation",  label: "Évangélisation",     dot: "bg-rose-500",    light: "text-rose-400" },
  { value: "communication",   label: "Communication",      dot: "bg-orange-500",  light: "text-orange-400" },
];

export default function GouvRoadmapPage() {
  useTrackActivity("GouvRoadmap");
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({ titre: "", pole: "familles_impact", cycle: "", date_echeance: "", objectif_cible: "100", valeur_actuelle: "0", unite: "%" });
  const [saving, setSaving] = useState(false);

  const { data: okrs = [] } = useQuery({ queryKey: ["okrs"], queryFn: () => base44.entities.OKR.list(), refetchInterval: 30000 });

  const milestones = okrs.filter(o => o.date_echeance).sort((a, b) => new Date(a.date_echeance) - new Date(b.date_echeance));
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
    qc.invalidateQueries({ queryKey: ["okrs"] });
    toast.success("Jalon ajouté !");
    setSheetOpen(false);
    setSaving(false);
  };

  const handleToggle = async (okr) => {
    await base44.entities.OKR.update(okr.id, { statut: okr.statut === "atteint" ? "en_cours" : "atteint" });
    qc.invalidateQueries({ queryKey: ["okrs"] });
  };

  const byMonth = {};
  milestones.forEach(m => {
    const key = m.date_echeance.slice(0, 7);
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(m);
  });

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Gouvernance</p>
          <h1 className="text-lg font-bold text-white">Roadmap & Jalons</h1>
          <p className="text-xs text-zinc-600">Feuille de route du cycle · OKR avec échéances</p>
        </div>
        <button onClick={() => setSheetOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all">
          <Plus className="w-4 h-4" /> Ajouter un Jalon
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Legend */}
        <div className="flex gap-4 flex-wrap">
          {POLES.map(p => (
            <div key={p.value} className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full", p.dot)} />
              <span className="text-xs text-zinc-500">{p.label}</span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        {milestones.length === 0 ? (
          <div className="ai-card rounded-xl border border-white/5 p-14 text-center">
            <MapPin className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-600">Ajoutez des OKR avec des dates d'échéance pour construire la roadmap</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(byMonth).map(([month, items]) => {
              const monthDate = new Date(month + "-01");
              const isPast = isBefore(monthDate, today);
              return (
                <div key={month}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("px-3 py-1 rounded-full text-xs font-bold",
                      isPast ? "bg-white/8 text-zinc-500" : "bg-blue-600/20 border border-blue-500/30 text-blue-400")}>
                      {format(monthDate, "MMMM yyyy", { locale: fr })}
                    </div>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  <div className="space-y-2 ml-3">
                    {items.map(okr => {
                      const status = getStatus(okr);
                      const poleConf = POLES.find(p => p.value === okr.pole);
                      const progress = okr.objectif_cible > 0 ? Math.min(100, Math.round((okr.valeur_actuelle / okr.objectif_cible) * 100)) : 0;
                      return (
                        <div key={okr.id} className="ai-card flex items-start gap-3 p-4 rounded-xl border border-white/8 hover:border-white/15 transition-all">
                          <div className={cn("w-3 h-3 rounded-full mt-1 flex-shrink-0", poleConf?.dot || "bg-zinc-500")} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn("text-sm font-semibold", status === "atteint" ? "line-through text-zinc-500" : "text-white")}>{okr.titre}</p>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {status === "atteint" && <span className="text-[10px] border px-2 py-0.5 rounded-md text-emerald-400 bg-emerald-900/30 border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Atteint</span>}
                                {status === "depasse" && <span className="text-[10px] border px-2 py-0.5 rounded-md text-red-400 bg-red-900/30 border-red-500/30 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Dépassé</span>}
                                {status === "en_cours" && <span className="text-[10px] border px-2 py-0.5 rounded-md text-blue-400 bg-blue-900/30 border-blue-500/30 flex items-center gap-1"><Clock className="w-3 h-3" />En cours</span>}
                                {status === "en_retard" && <span className="text-[10px] border px-2 py-0.5 rounded-md text-amber-400 bg-amber-900/30 border-amber-500/30">En retard</span>}
                              </div>
                            </div>
                            <p className={cn("text-xs mt-0.5", poleConf?.light || "text-zinc-500")}>{poleConf?.label} · {okr.valeur_actuelle}/{okr.objectif_cible} {okr.unite} ({progress}%)</p>
                            <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                              <div className={cn("h-full rounded-full", poleConf?.dot || "bg-zinc-500")} style={{ width: `${progress}%`, opacity: 0.8 }} />
                            </div>
                          </div>
                          <button onClick={() => handleToggle(okr)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
                            {okr.statut === "atteint"
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              : <Flag className="w-4 h-4 text-zinc-600" />}
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
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-[#0d1018] border-l border-white/10 overflow-y-auto p-5">
          <SheetHeader className="pb-4 border-b border-white/10">
            <SheetTitle className="text-white">Nouveau Jalon</SheetTitle>
          </SheetHeader>
          <div className="py-5 space-y-4">
            {[
              { label: "Titre *", key: "titre", type: "text", placeholder: "Ex: 80% pilotes actifs" },
              { label: "Date d'échéance", key: "date_echeance", type: "date", placeholder: "" },
              { label: "Cycle", key: "cycle", type: "text", placeholder: "Ex: Q1 2026" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-zinc-500 font-medium block mb-1.5">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 transition-colors" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1.5">Cible</label>
                <input type="number" value={form.objectif_cible} onChange={e => setForm({ ...form, objectif_cible: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1.5">Unité</label>
                <input type="text" value={form.unite} onChange={e => setForm({ ...form, unite: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5">Pôle</label>
              <Select value={form.pole} onValueChange={v => setForm({ ...form, pole: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{POLES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <button onClick={handleCreate} disabled={saving}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-semibold text-white transition-all">
              {saving ? "Ajout..." : "Ajouter à la Roadmap"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}