import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PenTool, Send, CheckCircle2, XCircle, Clock, Crown, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const STATUT_CONFIG = {
  brouillon: { label: "Brouillon",       cls: "text-zinc-400 bg-zinc-800 border-zinc-700",                 icon: Clock },
  soumise:   { label: "Soumise au N.I",  cls: "text-blue-400 bg-blue-500/10 border-blue-500/20",           icon: Send },
  approuvee: { label: "Approuvée ✓",     cls: "text-emerald-400 bg-emerald-900/30 border-emerald-500/20",  icon: CheckCircle2 },
  rejetee:   { label: "Rejetée",         cls: "text-red-400 bg-red-900/30 border-red-500/20",              icon: XCircle },
};

const POLES = [
  { value: "general", label: "Général" },
  { value: "familles_impact", label: "Familles d'Impact" },
  { value: "formation", label: "Formation" },
  { value: "evangelisation", label: "Évangélisation" },
  { value: "communication", label: "Communication" },
];

export default function GouvRedactionPage() {
  useTrackActivity("GouvRedaction");
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editReco, setEditReco] = useState(null);
  const [form, setForm] = useState({ titre: "", contenu: "", pole_concerne: "general" });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filterStatut, setFilterStatut] = useState("all");
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectComment, setRejectComment] = useState("");

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isN1 = user?.role === "admin" || user?.role === "responsable_general";
  const { data: recos = [] } = useQuery({ queryKey: ["recos"], queryFn: () => base44.entities.Recommandation.list("-date_soumission", 100), refetchInterval: 30000 });

  const filtered = recos.filter(r => filterStatut === "all" || r.statut === filterStatut);

  const openCreate = () => { setEditReco(null); setForm({ titre: "", contenu: "", pole_concerne: "general" }); setSheetOpen(true); };
  const openEdit = (r) => { setEditReco(r); setForm({ titre: r.titre, contenu: r.contenu, pole_concerne: r.pole_concerne }); setSheetOpen(true); };

  const handleGenerate = async () => {
    if (form.contenu.length < 20) { toast.error("Ajoutez d'abord le contexte de votre recommandation"); return; }
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es l'Analyste Stratégique d'EJPN. Améliore et structure cette recommandation pour le Niveau I (Direction Souveraine). Elle doit être concise, précise, et actionnable. Contexte: ${form.contenu}. Retourne uniquement le texte amélioré.`,
    });
    setForm(p => ({ ...p, contenu: result }));
    setGenerating(false);
    toast.success("Recommandation améliorée par l'IA !");
  };

  const handleSave = async (soumit = false) => {
    if (!form.titre || !form.contenu) { toast.error("Titre et contenu requis"); return; }
    setSaving(true);
    const data = { ...form, auteur_email: user?.email, statut: soumit ? "soumise" : "brouillon", date_soumission: soumit ? format(new Date(), "yyyy-MM-dd") : undefined };
    if (editReco) await base44.entities.Recommandation.update(editReco.id, data);
    else await base44.entities.Recommandation.create(data);
    qc.invalidateQueries({ queryKey: ["recos"] });
    toast.success(soumit ? "Recommandation envoyée au Niveau I !" : "Brouillon sauvegardé");
    setSheetOpen(false);
    setSaving(false);
  };

  const handleDecision = async (reco, statut, commentaire = "") => {
    await base44.entities.Recommandation.update(reco.id, { statut, commentaire_trone: commentaire, date_decision: format(new Date(), "yyyy-MM-dd") });
    qc.invalidateQueries({ queryKey: ["recos"] });
    toast.success(statut === "approuvee" ? "Recommandation approuvée !" : "Recommandation rejetée");
    setRejectDialog(null);
    setRejectComment("");
  };

  const counts = { brouillon: recos.filter(r => r.statut === "brouillon").length, soumise: recos.filter(r => r.statut === "soumise").length, approuvee: recos.filter(r => r.statut === "approuvee").length, rejetee: recos.filter(r => r.statut === "rejetee").length };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Gouvernance</p>
          <h1 className="text-lg font-bold text-white">Recommandations → Niveau I</h1>
          <p className="text-xs text-zinc-600">Rédaction · Validation · Décrets du Trône</p>
        </div>
        {!isN1 && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all">
            <Plus className="w-4 h-4" /> Nouvelle Recommandation
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 flex items-center gap-2 px-6 py-3 border-b border-white/5 flex-wrap">
        {[["all", "Toutes"], ["brouillon", `Brouillons (${counts.brouillon})`], ["soumise", `Soumises (${counts.soumise})`], ["approuvee", `Approuvées (${counts.approuvee})`], ["rejetee", `Rejetées (${counts.rejetee})`]].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatut(v)}
            className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
              filterStatut === v ? "bg-white/10 text-white border-white/20" : "text-zinc-500 border-white/5 hover:bg-white/5 hover:text-zinc-300")}>
            {l}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {filtered.length === 0 && (
          <div className="ai-card rounded-xl border border-white/5 p-12 text-center">
            <PenTool className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-600">Aucune recommandation</p>
          </div>
        )}
        {filtered.map(r => {
          const cfg = STATUT_CONFIG[r.statut] || STATUT_CONFIG.brouillon;
          const Icon = cfg.icon;
          return (
            <div key={r.id} className={cn("ai-card p-4 rounded-xl border transition-all",
              r.statut === "soumise" ? "border-blue-500/20 bg-blue-900/10" :
              r.statut === "approuvee" ? "border-emerald-500/20 bg-emerald-900/10" : "border-white/8")}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-semibold text-white">{r.titre}</p>
                    <span className={cn("text-[10px] border px-1.5 py-0.5 rounded-md flex items-center gap-1", cfg.cls)}>
                      <Icon className="w-3 h-3" />{cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600">{POLES.find(p => p.value === r.pole_concerne)?.label} · {r.auteur_email}{r.date_soumission ? ` · soumise ${r.date_soumission}` : ""}</p>
                </div>
                {!isN1 && r.statut === "brouillon" && (
                  <button onClick={() => openEdit(r)} className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
                    Modifier
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{r.contenu}</p>
              {r.commentaire_trone && (
                <div className="mt-3 p-3 rounded-xl border border-amber-500/20 bg-amber-900/15">
                  <p className="text-[10px] font-bold text-amber-400 flex items-center gap-1 mb-1"><Crown className="w-3 h-3" /> Réponse du Trône</p>
                  <p className="text-xs text-amber-300/80">{r.commentaire_trone}</p>
                </div>
              )}
              {isN1 && r.statut === "soumise" && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleDecision(r, "approuvee")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs text-white transition-all">
                    <CheckCircle2 className="w-3 h-3" /> Approuver
                  </button>
                  <button onClick={() => { setRejectDialog(r); setRejectComment(""); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 text-xs text-red-400 hover:bg-red-900/20 transition-all">
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
        <SheetContent side="right" className="w-full sm:max-w-lg bg-[#0d1018] border-l border-white/10 overflow-y-auto p-5">
          <SheetHeader className="pb-4 border-b border-white/10">
            <SheetTitle className="text-white">{editReco ? "Modifier la Recommandation" : "Nouvelle Recommandation"}</SheetTitle>
          </SheetHeader>
          <div className="py-5 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5">Titre *</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 transition-colors"
                placeholder="Ex: Recommandation — Ouverture de 2 FI" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5">Pôle concerné</label>
              <Select value={form.pole_concerne} onValueChange={v => setForm({ ...form, pole_concerne: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{POLES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-zinc-500 font-medium">Contenu *</label>
                <button onClick={handleGenerate} disabled={generating}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-blue-400 hover:bg-blue-900/20 transition-colors disabled:opacity-50">
                  {generating ? <><Loader2 className="w-3 h-3 animate-spin" />...</> : "✨ Améliorer avec IA"}
                </button>
              </div>
              <textarea rows={8} value={form.contenu} onChange={e => setForm({ ...form, contenu: e.target.value })}
                placeholder="Décrivez votre recommandation stratégique avec le contexte, les données observées et les actions proposées..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 resize-none transition-colors" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleSave(false)} disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-300 hover:bg-white/10 disabled:opacity-40 transition-all">
                Brouillon
              </button>
              <button onClick={() => handleSave(true)} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white disabled:opacity-40 transition-all">
                <Send className="w-4 h-4" />{saving ? "Envoi..." : "Envoyer au Niveau I"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="bg-[#0f1117] border border-white/10 text-white max-w-sm">
          <DialogHeader><DialogTitle>Rejeter la recommandation</DialogTitle></DialogHeader>
          <div className="py-2">
            <label className="text-xs text-zinc-400 mb-1.5 block">Commentaire de rejet</label>
            <textarea rows={3} value={rejectComment} onChange={e => setRejectComment(e.target.value)} placeholder="Expliquez la raison du rejet..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-red-500/50 resize-none transition-colors" />
          </div>
          <DialogFooter>
            <button onClick={() => setRejectDialog(null)} className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 text-sm transition-all">Annuler</button>
            <button onClick={() => handleDecision(rejectDialog, "rejetee", rejectComment)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-sm text-white transition-all">Confirmer le rejet</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}