import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileText, Download, Send, CheckCircle2, XCircle, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function GouvBilanPage() {
  const queryClient = useQueryClient();
  const [bilan, setBilan] = useState({
    titre: `Bilan — ${format(new Date(), "MMMM yyyy", { locale: fr })}`,
    bilan_general: "",
    observations: "",
    axes_performants: "",
    axes_defaillants: "",
    elements_reconsiderer: "",
  });
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: membres = [] } = useQuery({ queryKey: ["membres-all"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: okrs = [] } = useQuery({ queryKey: ["okrs"], queryFn: () => base44.entities.OKR.list() });
  const { data: actions = [] } = useQuery({ queryKey: ["actions"], queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 100) });
  const { data: livrables = [] } = useQuery({ queryKey: ["all-livrables-bilan"], queryFn: () => base44.entities.FormationLivrable.list("-date_soumission", 100) });

  const stats = useMemo(() => ({
    membres: membres.length,
    fiActives: familles.filter((f) => f.status === "active").length,
    okrAtteints: okrs.filter((o) => o.statut === "atteint").length,
    okrTotal: okrs.length,
    actionsDebriefees: actions.filter((a) => a.debrief_complete).length,
    totalConversions: actions.reduce((s, a) => s + (a.conversions || 0), 0),
    livrableValides: livrables.filter((l) => l.statut === "valide").length,
  }), [membres, familles, okrs, actions, livrables]);

  const handleGenerate = async () => {
    setGenerating(true);
    const prompt = `Tu es l'Analyste Stratégique d'une organisation de jeunesse chrétienne (EJPN). 
Génère un bilan structuré en JSON avec ces données réelles du cycle ${format(new Date(), "MMMM yyyy", { locale: fr })} :
- ${stats.membres} membres suivis dans ${stats.fiActives} Familles d'Impact actives
- ${stats.okrAtteints}/${stats.okrTotal} OKR atteints
- ${stats.actionsDebriefees} actions d'évangélisation debriefées · ${stats.totalConversions} conversions totales
- ${stats.livrableValides} livrables de formation validés

Structure JSON:
{
  "bilan_general": "Synthèse en 2-3 phrases du bilan global du cycle",
  "observations": "3 observations clés sur les dynamiques observées",
  "axes_performants": "2-3 axes où les résultats sont excellents",
  "axes_defaillants": "2-3 axes à améliorer avec des raisons précises",
  "elements_reconsiderer": "1-2 éléments stratégiques à reconsidérer pour le prochain cycle"
}`;
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          bilan_general: { type: "string" },
          observations: { type: "string" },
          axes_performants: { type: "string" },
          axes_defaillants: { type: "string" },
          elements_reconsiderer: { type: "string" },
        }
      }
    });
    setBilan((prev) => ({ ...prev, ...result }));
    toast.success("Bilan généré par l'IA !");
    setGenerating(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Recommandation.create({
      titre: bilan.titre,
      contenu: JSON.stringify(bilan),
      pole_concerne: "general",
      statut: "soumise",
      auteur_email: (await base44.auth.me())?.email,
      date_soumission: format(new Date(), "yyyy-MM-dd"),
    });
    queryClient.invalidateQueries();
    toast.success("Bilan soumis au Niveau I !");
    setSaving(false);
  };

  const handleExport = () => {
    const content = `BILAN GÉNÉRAL — ${bilan.titre}\n\n` +
      `I. BILAN GÉNÉRAL & OBSERVATIONS\n${bilan.bilan_general}\n\n${bilan.observations}\n\n` +
      `II. AXES PERFORMANTS\n${bilan.axes_performants}\n\n` +
      `III. AXES DÉFAILLANTS\n${bilan.axes_defaillants}\n\n` +
      `IV. ÉLÉMENTS À RECONSIDÉRER\n${bilan.elements_reconsiderer}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${bilan.titre}.txt`; a.click(); URL.revokeObjectURL(url);
  };

  const SECTIONS = [
    { key: "bilan_general", label: "I. Bilan Général", icon: FileText, placeholder: "Synthèse globale du cycle...", color: "border-zinc-200" },
    { key: "observations", label: "Observations", icon: TrendingUp, placeholder: "Observations clés...", color: "border-zinc-200" },
    { key: "axes_performants", label: "II. Axes Performants ✓", icon: CheckCircle2, placeholder: "Ce qui a bien fonctionné...", color: "border-emerald-200 bg-emerald-50/20" },
    { key: "axes_defaillants", label: "III. Axes Défaillants ✗", icon: XCircle, placeholder: "Ce qui n'a pas fonctionné...", color: "border-red-200 bg-red-50/20" },
    { key: "elements_reconsiderer", label: "IV. Éléments à Reconsidérer", icon: AlertTriangle, placeholder: "Ce qu'il faut revoir pour le prochain cycle...", color: "border-amber-200 bg-amber-50/20" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Générateur de Bilan</h1>
          <p className="text-sm text-zinc-500 mt-0.5">4 sections réglementaires · IA-assisté · Export</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport}><Download className="w-4 h-4" /> Exporter</Button>
          <Button variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50" onClick={handleGenerate} disabled={generating}>
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Génération...</> : <>✨ Générer avec l'IA</>}
          </Button>
          <Button className="bg-zinc-900 hover:bg-zinc-800 gap-2" onClick={handleSave} disabled={saving}>
            <Send className="w-4 h-4" />{saving ? "Envoi..." : "Soumettre au N.I"}
          </Button>
        </div>
      </div>

      {/* Data snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
        {[["Membres", stats.membres], ["FI Actives", stats.fiActives], [" OKR Atteints", `${stats.okrAtteints}/${stats.okrTotal}`], ["Conversions", stats.totalConversions]].map(([l, v]) => (
          <div key={l} className="text-center">
            <p className="text-lg font-bold text-zinc-900">{v}</p>
            <p className="text-[10px] text-zinc-400">{l}</p>
          </div>
        ))}
      </div>

      {/* Title */}
      <div>
        <label className="text-xs font-medium text-zinc-500">Titre du Bilan</label>
        <Input className="mt-1 bg-white border-zinc-200 font-semibold" value={bilan.titre} onChange={(e) => setBilan({ ...bilan, titre: e.target.value })} />
      </div>

      {/* Sections */}
      {SECTIONS.map(({ key, label, icon: Icon, placeholder, color }) => (
        <div key={key} className={cn("p-4 rounded-xl border", color)}>
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-4 h-4 text-zinc-500" />
            <p className="text-sm font-semibold text-zinc-800">{label}</p>
          </div>
          <Textarea className="bg-white border-zinc-200 h-32 text-sm" placeholder={placeholder} value={bilan[key]} onChange={(e) => setBilan({ ...bilan, [key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}