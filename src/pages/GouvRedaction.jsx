import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PenTool, Send, CheckCircle2, XCircle, Clock, Crown, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

const STATUT_CONFIG = {
  brouillon: { label: "Brouillon", class: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", icon: Clock },
  soumise: { label: "Soumise au N.I", class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Send },
  approuvee: { label: "Approuvée ✓", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  rejetee: { label: "Rejetée", class: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
};

const POLES = [{ value: "general", label: "Général" }, { value: "familles_impact", label: "Familles d'Impact" }, { value: "formation", label: "Formation" }, { value: "evangelisation", label: "Évangélisation" }, { value: "communication", label: "Communication" }];

export default function GouvRedactionPage() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editReco, setEditReco] = useState(null);
  const [form, setForm] = useState({ titre: "", contenu: "", pole_concerne: "general" });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filterStatut, setFilterStatut] = useState("all");

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isN1 = user?.role === "admin" || user?.role === "responsable_general";
  const { data: recos = [] } = useQuery({ queryKey: ["recos"], queryFn: () => base44.entities.Recommandation.list("-date_soumission", 100) });

  const filtered = recos.filter((r) => filterStatut === "all" || r.statut === filterStatut);

  const openCreate = () => { setEditReco(null); setForm({ titre: "", contenu: "", pole_concerne: "general" }); setSheetOpen(true); };
  const openEdit = (r) => { setEditReco(r); setForm({ titre: r.titre, contenu: r.contenu, pole_concerne: r.pole_concerne }); setSheetOpen(true); };

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({ prompt: `Tu es l'Analyste Stratégique d'EJPN. Améliore et structure cette recommandation pour le Niveau I. Contexte: ${form.contenu}. Retourne uniquement le texte amélioré.` });
    setForm((prev) => ({ ...prev, contenu: result }));
    setGenerating(false);
    toast.success("Recommandation améliorée par l'IA !");
  };

  const handleSave = async (soumit = false) => {
    if (!form.titre || !form.contenu) { toast.error("Titre et contenu requis"); return; }
    setSaving(true);
    const data = { ...form, auteur_email: user?.email, statut: soumit ? "soumise" : "brouillon", date_soumission: soumit ? format(new Date(), "yyyy-MM-dd") : undefined };
    if (editReco) await base44.entities.Recommandation.update(editReco.id, data);
    else await base44.entities.Recommandation.create(data);
    queryClient.invalidateQueries({ queryKey: ["recos"] });
    toast.success(soumit ? "Recommandation envoyée au Niveau I !" : "Brouillon sauvegardé");
    setSheetOpen(false);
    setSaving(false);
  };

  const handleDecision = async (reco, statut, commentaire = "") => {
    await base44.entities.Recommandation.update(reco.id, { statut, commentaire_trone: commentaire, date_decision: format(new Date(), "yyyy-MM-dd") });
    queryClient.invalidateQueries({ queryKey: ["recos"] });
    toast.success(statut === "approuvee" ? "Approuvée !" : "Rejetée");
  };

  return (
    <div className="px-6 py-10 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Gouvernance</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Recommandations → Niveau I</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Rédaction · Validation · Décrets du Trône</p>
        </div>
        {!isN1 && (
          <button className="btn-glow-blue flex items-center gap-2 px-4 py-2.5" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nouvelle Recommandation
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[["all", "Toutes"], ["brouillon", "Brouillons"], ["soumise", "Soumises"], ["approuvee", "Approuvées"], ["rejetee", "Rejetées"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatut(v)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              filterStatut === v ? "bg-white/10 text-white border-white/20" : "bg-white/[0.03] text-zinc-500 border-white/[0.07] hover:bg-white/[0.06]")}>
            {l} {v !== "all" && `(${recos.filter((r) => r.statut === v).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] py-12 text-center text-sm text-zinc-600">
            <PenTool className="w-8 h-8 mx-auto mb-2 text-zinc-700" />Aucune recommandation
          </div>
        )}
        {filtered.map((r) => {
          const cfg = STATUT_CONFIG[r.statut] || STATUT_CONFIG.brouillon;
          const Icon = cfg.icon;
          return (
            <div key={r.id} className={cn("rounded-xl border p-4 hover:border-white/[0.14] transition-all",
              r.statut === "soumise" ? "border-blue-500/20 bg-blue-500/5" : r.statut === "approuvee" ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/[0.07] bg-white/[0.025]")}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-white">{r.titre}</p>
                    <Badge className={cn("text-[10px] border", cfg.class)}><Icon className="w-3 h-3 mr-0.5" />{cfg.label}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500">{POLES.find((p) => p.value === r.pole_concerne)?.label} · {r.auteur_email} {r.date_soumission ? `· soumise ${r.date_soumission}` : ""}</p>
                </div>
                {!isN1 && r.statut === "brouillon" && (
                  <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-all" onClick={() => openEdit(r)}>Modifier</button>
                )}
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{r.contenu}</p>
              {r.commentaire_trone && (
                <div className="mt-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <p className="text-[10px] font-bold text-amber-400 flex items-center gap-1"><Crown className="w-3 h-3" /> Réponse du Trône</p>
                  <p className="text-xs text-amber-200/70 mt-0.5">{r.commentaire_trone}</p>
                </div>
              )}
              {isN1 && r.statut === "soumise" && (
                <div className="flex gap-2 mt-3">
                  <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300 hover:bg-emerald-500/30 transition-all" onClick={() => handleDecision(r, "approuvee")}>
                    <CheckCircle2 className="w-3 h-3" /> Approuver
                  </button>
                  <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 hover:bg-red-500/20 transition-all" onClick={() => { const c = window.prompt("Commentaire de rejet :"); if (c !== null) handleDecision(r, "rejetee", c); }}>
                    <XCircle className="w-3 h-3" /> Rejeter
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-[#0d1018] border-white/10 text-white">
          <SheetHeader className="pb-4 border-b border-white/10">
            <SheetTitle className="text-white">{editReco ? "Modifier la Recommandation" : "Nouvelle Recommandation"}</SheetTitle>
          </SheetHeader>
          <div className="py-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-500">Titre *</label>
              <input className="input-glass mt-1" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Ex: Recommandation — Ouverture de 2 FI" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Pôle concerné</label>
              <Select value={form.pole_concerne} onValueChange={(v) => setForm({ ...form, pole_concerne: v })}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{POLES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-zinc-500">Contenu *</label>
                <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1" onClick={handleGenerate} disabled={generating}>
                  {generating ? <><Loader2 className="w-3 h-3 animate-spin" />...</> : "✨ Améliorer avec IA"}
                </button>
              </div>
              <textarea className="input-glass h-48 resize-none" value={form.contenu} onChange={(e) => setForm({ ...form, contenu: e.target.value })} placeholder="Décrivez votre recommandation stratégique..." />
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 text-sm transition-all" disabled={saving} onClick={() => handleSave(false)}>Sauvegarder brouillon</button>
              <button className="flex-1 btn-glow-blue flex items-center justify-center gap-2 py-2.5" disabled={saving} onClick={() => handleSave(true)}>
                <Send className="w-4 h-4" />{saving ? "Envoi..." : "Envoyer au Niveau I"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}