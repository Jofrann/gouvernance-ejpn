import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Download, Users, Home, Activity, Zap, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const TABS = [
  { key: "membres", label: "Membres", icon: Users },
  { key: "familles", label: "Familles d'Impact", icon: Home },
  { key: "saisies", label: "Clinique", icon: Activity },
  { key: "actions", label: "Évangélisation", icon: Zap },
];

export default function GouvDonneesPage() {
  const [tab, setTab] = useState("membres");
  const [search, setSearch] = useState("");

  const { data: membres = [] } = useQuery({ queryKey: ["membres-all"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: saisies = [] } = useQuery({ queryKey: ["all-saisies"], queryFn: () => base44.entities.CliniqueSaisie.list("-semaine", 1000) });
  const { data: actions = [] } = useQuery({ queryKey: ["actions"], queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 200) });

  const getFI = (id) => familles.find((f) => f.id === id);
  const q = search.toLowerCase();

  const filteredMembres = useMemo(() => membres.filter((m) => !search || m.nom_complet?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.ville?.toLowerCase().includes(q)), [membres, q]);
  const filteredFamilles = useMemo(() => familles.filter((f) => !search || f.name?.toLowerCase().includes(q) || f.campus?.toLowerCase().includes(q)), [familles, q]);
  const filteredSaisies = useMemo(() => saisies.filter((s) => !search || s.semaine?.includes(q)), [saisies, q]);
  const filteredActions = useMemo(() => actions.filter((a) => !search || a.titre?.toLowerCase().includes(q)), [actions, q]);

  const exportCSV = (data, name) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(","), ...data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const currentData = { membres: filteredMembres, familles: filteredFamilles, saisies: filteredSaisies, actions: filteredActions }[tab];

  return (
    <div className="px-6 py-10 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Gouvernance</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Données Brutes</h1>
          <p className="text-sm text-zinc-500 mt-0.5">DataGrid centralisé · Export CSV</p>
        </div>
        <button className="btn-ghost-glass flex items-center gap-2 px-3 py-2 text-sm" onClick={() => exportCSV(currentData, tab)}>
          <Download className="w-4 h-4" /> Exporter CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); }}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              tab === t.key ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
        <input className="input-glass pl-8 h-8 text-sm" placeholder="Filtrer..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
        <div className="overflow-x-auto">
          {tab === "membres" && (
            <table className="w-full text-xs">
              <thead className="border-b border-white/[0.07]"><tr>{["Nom", "Email", "Pipeline", "Genre", "Âge", "Ville", "FI", "Formation", "Entrée"].map((h) => <th key={h} className="text-left py-2 px-3 text-zinc-500 font-semibold uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody>{filteredMembres.map((m) => <tr key={m.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]"><td className="py-2 px-3 font-medium text-white">{m.nom_complet}</td><td className="py-2 px-3 text-zinc-500">{m.email || "—"}</td><td className="py-2 px-3"><Badge className="text-[9px] bg-white/5 text-zinc-400 border-white/10">{m.statut_pipeline}</Badge></td><td className="py-2 px-3 text-zinc-500">{m.genre || "—"}</td><td className="py-2 px-3 text-zinc-500">{m.age || "—"}</td><td className="py-2 px-3 text-zinc-500">{m.ville || "—"}</td><td className="py-2 px-3 text-zinc-500">{getFI(m.famille_impact_id)?.name || "—"}</td><td className="py-2 px-3">{m.potentiel_formation ? "✦ Oui" : "—"}</td><td className="py-2 px-3 text-zinc-600">{m.date_entree || "—"}</td></tr>)}</tbody>
            </table>
          )}
          {tab === "familles" && (
            <table className="w-full text-xs">
              <thead className="border-b border-white/[0.07]"><tr>{["Nom", "Campus", "Pilote", "Co-Pilote", "Statut", "Ouverture", "Objectif"].map((h) => <th key={h} className="text-left py-2 px-3 text-zinc-500 font-semibold uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody>{filteredFamilles.map((f) => <tr key={f.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]"><td className="py-2 px-3 font-medium text-white">{f.name}</td><td className="py-2 px-3 text-zinc-500">{f.campus || "—"}</td><td className="py-2 px-3 text-zinc-500">{f.pilote_email || "—"}</td><td className="py-2 px-3 text-zinc-500">{f.co_pilote_email || "—"}</td><td className="py-2 px-3"><Badge className={cn("text-[9px]", f.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-500")}>{f.status}</Badge></td><td className="py-2 px-3 text-zinc-600">{f.date_ouverture || "—"}</td><td className="py-2 px-3 text-zinc-500">{f.objectif_membres}</td></tr>)}</tbody>
            </table>
          )}
          {tab === "saisies" && (
            <table className="w-full text-xs">
              <thead className="border-b border-white/[0.07]"><tr>{["Semaine", "FI", "Présence", "Temps", "Finances", "Émotions", "Spirituel", "Commentaire"].map((h) => <th key={h} className="text-left py-2 px-3 text-zinc-500 font-semibold uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody>{filteredSaisies.slice(0, 200).map((s) => <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]"><td className="py-2 px-3 font-medium text-white">{s.semaine}</td><td className="py-2 px-3 text-zinc-500">{getFI(s.famille_impact_id)?.name || "—"}</td><td className="py-2 px-3">{s.presence ? "✓" : "✗"}</td><td className="py-2 px-3 text-zinc-400">{s.note_temps ?? "—"}</td><td className="py-2 px-3 text-zinc-400">{s.note_finances ?? "—"}</td><td className="py-2 px-3 text-zinc-400">{s.note_emotions ?? "—"}</td><td className="py-2 px-3 text-zinc-400">{s.note_spirituel ?? "—"}</td><td className="py-2 px-3 text-zinc-500 max-w-xs truncate">{s.commentaire || "—"}</td></tr>)}</tbody>
            </table>
          )}
          {tab === "actions" && (
            <table className="w-full text-xs">
              <thead className="border-b border-white/[0.07]"><tr>{["Titre", "Type", "Date", "Statut", "Touchées", "Conversions", "Heures", "Debrief"].map((h) => <th key={h} className="text-left py-2 px-3 text-zinc-500 font-semibold uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody>{filteredActions.map((a) => <tr key={a.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]"><td className="py-2 px-3 font-medium text-white">{a.titre}</td><td className="py-2 px-3 text-zinc-500">{a.type_action}</td><td className="py-2 px-3 text-zinc-600">{a.date_action}</td><td className="py-2 px-3"><Badge className="text-[9px] bg-white/5 text-zinc-400 border-white/10">{a.statut}</Badge></td><td className="py-2 px-3 text-zinc-400">{a.personnes_touchees}</td><td className="py-2 px-3 font-medium text-emerald-400">{a.conversions}</td><td className="py-2 px-3 text-zinc-400">{a.temps_investi_heures}h</td><td className="py-2 px-3">{a.debrief_complete ? "✓" : "—"}</td></tr>)}</tbody>
            </table>
          )}
        </div>
        <div className="px-4 py-2 border-t border-white/[0.05] text-xs text-zinc-600">{currentData.length} enregistrement{currentData.length !== 1 ? "s" : ""}</div>
      </div>
    </div>
  );
}