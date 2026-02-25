import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PenTool, Send, CheckCircle2, XCircle, Clock, Crown, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUT_CONFIG = {
  brouillon: { label: "Brouillon", class: "bg-zinc-100 text-zinc-600 border-zinc-200", icon: Clock },
  soumise: { label: "Soumise au N.I", class: "bg-blue-50 text-blue-700 border-blue-200", icon: Send },
  approuvee: { label: "Approuvée ✓", class: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  rejetee: { label: "Rejetée", class: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
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
    if (!form.contenu.length < 50) { toast.error("Ajoutez d'abord le contexte de votre recommandation"); return; }
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es l'Analyste Stratégique d'EJPN. Améliore et structure cette recommandation pour le Niveau I (Direction Souveraine). Elle doit être concise, précise, et actionnable. Contexte: ${form.contenu}. Retourne uniquement le texte amélioré de la recommandation.`,
    });
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
    toast.success(statut === "approuvee" ? "Recommandation approuvée !" : "Recommandation rejetée");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Recommandations → Niveau I</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Rédaction · Validation · Décrets du Trône</p>
        </div>
        {!isN1 && <Button className="bg-zinc-900 hover:bg-zinc-800 gap-2" onClick={openCreate}><Plus className="w-4 h-4" /> Nouvelle Recommandation</Button>}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[["all", "Toutes"], ["brouillon", "Brouillons"], ["soumise", "Soumises"], ["approuvee", "Approuvées"], ["rejetee", "Rejetées"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatut(v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", filterStatut === v ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50")}>
            {l} {v !== "all" && `(${recos.filter((r) => r.statut === v).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && <Card className="border-zinc-200 bg-white"><CardContent className="py-12 text-center text-sm text-zinc-400"><PenTool className="w-8 h-8 mx-auto mb-2 text-zinc-200" />Aucune recommandation</CardContent></Card>}
        {filtered.map((r) => {
          const cfg = STATUT_CONFIG[r.statut] || STATUT_CONFIG.brouillon;
          const Icon = cfg.icon;
          return (
            <Card key={r.id} className={cn("border hover:shadow-sm transition", r.statut === "soumise" ? "border-blue-200 bg-blue-50/10" : r.statut === "approuvee" ? "border-emerald-200 bg-emerald-50/10" : "border-zinc-200 bg-white")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-zinc-900">{r.titre}</p>
                      <Badge className={cn("text-[10px] border", cfg.class)}><Icon className="w-3 h-3 mr-0.5" />{cfg.label}</Badge>
                    </div>
                    <p className="text-xs text-zinc-400">{POLES.find((p) => p.value === r.pole_concerne)?.label} · {r.auteur_email} {r.date_soumission ? `· soumise ${r.date_soumission}` : ""}</p>
                  </div>
                  <div className="flex gap-1">
                    {!isN1 && (r.statut === "brouillon") && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(r)}>Modifier</Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">{r.contenu}</p>
                {r.commentaire_trone && (
                  <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-[10px] font-bold text-amber-700 flex items-center gap-1"><Crown className="w-3 h-3" /> Réponse du Trône</p>
                    <p className="text-xs text-amber-800 mt-0.5">{r.commentaire_trone}</p>
                  </div>
                )}
                {/* N1 decision buttons */}
                {isN1 && r.statut === "soumise" && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1 text-xs h-7" onClick={() => handleDecision(r, "approuvee")}>
                      <CheckCircle2 className="w-3 h-3" /> Approuver
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-1 text-xs h-7" onClick={() => { const c = window.prompt("Commentaire de rejet :"); if (c !== null) handleDecision(r, "rejetee", c); }}>
                      <XCircle className="w-3 h-3" /> Rejeter
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4 border-b"><SheetTitle>{editReco ? "Modifier la Recommandation" : "Nouvelle Recommandation"}</SheetTitle></SheetHeader>
          <div className="py-5 space-y-4">
            <div><label className="text-xs font-medium text-zinc-500">Titre *</label><Input className="mt-1 bg-white border-zinc-200" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Ex: Recommandation — Ouverture de 2 FI" /></div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Pôle concerné</label>
              <Select value={form.pole_concerne} onValueChange={(v) => setForm({ ...form, pole_concerne: v })}>
                <SelectTrigger className="mt-1 bg-white border-zinc-200"><SelectValue /></SelectTrigger>
                <SelectContent>{POLES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-zinc-500">Contenu *</label>
                <Button size="sm" variant="ghost" className="h-6 text-xs text-blue-600" onClick={handleGenerate} disabled={generating}>
                  {generating ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />...</> : "✨ Améliorer avec IA"}
                </Button>
              </div>
              <Textarea className="bg-white border-zinc-200 h-48" value={form.contenu} onChange={(e) => setForm({ ...form, contenu: e.target.value })} placeholder="Décrivez votre recommandation stratégique avec le contexte, les données observées et les actions proposées..." />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={saving} onClick={() => handleSave(false)}>Sauvegarder brouillon</Button>
              <Button className="flex-1 bg-zinc-900 hover:bg-zinc-800 gap-2" disabled={saving} onClick={() => handleSave(true)}>
                <Send className="w-4 h-4" />{saving ? "Envoi..." : "Envoyer au Niveau I"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}