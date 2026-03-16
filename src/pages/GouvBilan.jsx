import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Download, Send, CheckCircle2, XCircle, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function GouvBilanPage() {
  const queryClient = useQueryClient();
  const [bilan, setBilan] = useState({
    titre: `Bilan — ${format(new Date(), "MMMM yyyy", { locale: fr })}`,
    bilan_general: "", observations: "", axes_performants: "", axes_defaillants: "", elements_reconsiderer: "",
  });
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: membres = [] } = useQuery({ queryKey: ["membres-all"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: okrs = [] } = useQuery({ queryKey: ["okrs"], queryFn: () => base44.entities.OKR.list() });
  const { data: actions = [] } = useQuery({ queryKey: ["actions"], queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 100) });
  const { data: livrables = [] } = useQuery({ queryKey: ["all-livrables-bilan"], queryFn: () => base44.entities.FormationLivrable.list("-date_soumission", 100) });

  // Real-time subscriptions
  React.useEffect(() => {
    const unsub1 = base44.entities.Membre.subscribe(() => queryClient.invalidateQueries({ queryKey: ["membres-all"] }));
    const unsub2 = base44.entities.FamilleImpact.subscribe(() => queryClient.invalidateQueries({ queryKey: ["familles"] }));
    const unsub3 = base44.entities.OKR.subscribe(() => queryClient.invalidateQueries({ queryKey: ["okrs"] }));
    const unsub4 = base44.entities.ActionEvangelisation.subscribe(() => queryClient.invalidateQueries({ queryKey: ["actions"] }));
    const unsub5 = base44.entities.FormationLivrable.subscribe(() => queryClient.invalidateQueries({ queryKey: ["all-livrables-bilan"] }));
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, [queryClient]);

  const stats = useMemo(() => ({
    membres: membres.length, fiActives: familles.filter((f) => f.status === "active").length,
    okrAtteints: okrs.filter((o) => o.statut === "atteint").length, okrTotal: okrs.length,
    actionsDebriefees: actions.filter((a) => a.debrief_complete).length,
    totalConversions: actions.reduce((s, a) => s + (a.conversions || 0), 0),
    livrableValides: livrables.filter((l) => l.statut === "valide").length,
  }), [membres, familles, okrs, actions, livrables]);

  const handleGenerate = async () => {
    setGenerating(true);
    const prompt = `Tu es l'Analyste Stratégique d'une organisation de jeunesse chrétienne (EJPN). Génère un bilan structuré en JSON avec ces données réelles du cycle ${format(new Date(), "MMMM yyyy", { locale: fr })} : ${stats.membres} membres suivis dans ${stats.fiActives} FI actives, ${stats.okrAtteints}/${stats.okrTotal} OKR atteints, ${stats.actionsDebriefees} actions debriefées · ${stats.totalConversions} conversions totales, ${stats.livrableValides} livrables validés.`;
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: { type: "object", properties: { bilan_general: { type: "string" }, observations: { type: "string" }, axes_performants: { type: "string" }, axes_defaillants: { type: "string" }, elements_reconsiderer: { type: "string" } } }
    });
    setBilan((prev) => ({ ...prev, ...result }));
    toast.success("Bilan généré par l'IA !");
    setGenerating(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Recommandation.create({ titre: bilan.titre, contenu: JSON.stringify(bilan), pole_concerne: "general", statut: "soumise", auteur_email: (await base44.auth.me())?.email, date_soumission: format(new Date(), "yyyy-MM-dd") });
    queryClient.invalidateQueries();
    toast.success("Bilan soumis au Niveau I !");
    setSaving(false);
  };

  const handleExport = () => {
    const content = `BILAN GÉNÉRAL — ${bilan.titre}\n\nI. BILAN GÉNÉRAL\n${bilan.bilan_general}\n\nOBSERVATIONS\n${bilan.observations}\n\nII. AXES PERFORMANTS\n${bilan.axes_performants}\n\nIII. AXES DÉFAILLANTS\n${bilan.axes_defaillants}\n\nIV. À RECONSIDÉRER\n${bilan.elements_reconsiderer}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${bilan.titre}.txt`; a.click(); URL.revokeObjectURL(url);
  };

  const SECTIONS = [
    { key: "bilan_general", label: "I. Bilan Général", icon: FileText, placeholder: "Synthèse globale du cycle...", border: "border-white/[0.07]" },
    { key: "observations", label: "Observations", icon: TrendingUp, placeholder: "Observations clés...", border: "border-white/[0.07]" },
    { key: "axes_performants", label: "II. Axes Performants ✓", icon: CheckCircle2, placeholder: "Ce qui a bien fonctionné...", border: "border-emerald-500/20" },
    { key: "axes_defaillants", label: "III. Axes Défaillants ✗", icon: XCircle, placeholder: "Ce qui n'a pas fonctionné...", border: "border-red-500/20" },
    { key: "elements_reconsiderer", label: "IV. Éléments à Reconsidérer", icon: AlertTriangle, placeholder: "Ce qu'il faut revoir...", border: "border-amber-500/20" },
  ];

  return (
    <div className="px-6 py-10 max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Gouvernance</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Générateur de Bilan</h1>
          <p className="text-sm text-zinc-500 mt-0.5">4 sections réglementaires · IA-assisté · Export</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-ghost-glass flex items-center gap-2 px-3 py-2 text-sm" onClick={handleExport}>
            <Download className="w-4 h-4" /> Exporter
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 text-sm transition-all" onClick={handleGenerate} disabled={generating}>
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Génération...</> : <>✨ Générer avec l'IA</>}
          </button>
          <button className="btn-glow-blue flex items-center gap-2 px-3 py-2 text-sm" onClick={handleSave} disabled={saving}>
            <Send className="w-4 h-4" />{saving ? "Envoi..." : "Soumettre au N.I"}
          </button>
        </div>
      </div>

      {/* Data snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.07]">
        {[["Membres", stats.membres], ["FI Actives", stats.fiActives], ["OKR Atteints", `${stats.okrAtteints}/${stats.okrTotal}`], ["Conversions", stats.totalConversions]].map(([l, v]) => (
          <div key={l} className="text-center">
            <p className="text-lg font-bold text-white">{v}</p>
            <p className="text-[10px] text-zinc-500">{l}</p>
          </div>
        ))}
      </div>

      {/* Title */}
      <div>
        <label className="text-xs font-medium text-zinc-500">Titre du Bilan</label>
        <input className="input-glass mt-1 font-semibold" value={bilan.titre} onChange={(e) => setBilan({ ...bilan, titre: e.target.value })} />
      </div>

      {/* Sections */}
      {SECTIONS.map(({ key, label, icon: Icon, placeholder, border }) => (
        <div key={key} className={cn("p-4 rounded-xl border bg-white/[0.02]", border)}>
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-4 h-4 text-zinc-500" />
            <p className="text-sm font-semibold text-zinc-300">{label}</p>
          </div>
          <textarea className="input-glass h-32 resize-none" placeholder={placeholder} value={bilan[key]} onChange={(e) => setBilan({ ...bilan, [key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}