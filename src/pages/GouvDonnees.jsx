import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Database, Search, Download, Users, Home, Activity, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const TABS = [
  { key: "membres", label: "Membres", icon: Users },
  { key: "familles", label: "Familles FI", icon: Home },
  { key: "saisies", label: "Clinique", icon: Activity },
  { key: "actions", label: "Évangélisation", icon: Zap },
];

export default function GouvDonneesPage() {
  useTrackActivity("GouvDonnees");
  const [tab, setTab] = useState("membres");
  const [search, setSearch] = useState("");

  const { data: membres = [] } = useQuery({ queryKey: ["membres-all"], queryFn: () => base44.entities.Membre.list("-created_date", 500) });
  const { data: familles = [] } = useQuery({ queryKey: ["familles"], queryFn: () => base44.entities.FamilleImpact.list() });
  const { data: saisies = [] } = useQuery({ queryKey: ["all-saisies"], queryFn: () => base44.entities.CliniqueSaisie.list("-semaine", 1000) });
  const { data: actions = [] } = useQuery({ queryKey: ["evang-actions"], queryFn: () => base44.entities.ActionEvangelisation.list("-date_action", 200) });

  const getFI = (id) => familles.find(f => f.id === id);
  const q = search.toLowerCase();

  const filteredMembres = useMemo(() => membres.filter(m => !search || m.nom_complet?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.ville?.toLowerCase().includes(q)), [membres, q]);
  const filteredFamilles = useMemo(() => familles.filter(f => !search || f.name?.toLowerCase().includes(q) || f.campus?.toLowerCase().includes(q)), [familles, q]);
  const filteredSaisies = useMemo(() => saisies.filter(s => !search || s.semaine?.includes(q)), [saisies, q]);
  const filteredActions = useMemo(() => actions.filter(a => !search || a.titre?.toLowerCase().includes(q) || a.type_action?.includes(q)), [actions, q]);

  const exportCSV = (data, name) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(","), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const currentData = { membres: filteredMembres, familles: filteredFamilles, saisies: filteredSaisies, actions: filteredActions }[tab];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Gouvernance</p>
          <h1 className="text-lg font-bold text-white">Données Brutes</h1>
          <p className="text-xs text-zinc-600">DataGrid centralisé · Export CSV</p>
        </div>
        <button onClick={() => exportCSV(currentData, tab)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-xs text-zinc-400 hover:bg-white/5 transition-all">
          <Download className="w-3.5 h-3.5" /> Exporter
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 md:px-6 py-3 border-b border-white/5">
        <div className="flex gap-1 flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); }}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                tab === t.key ? "bg-white/10 text-white border-white/20" : "text-zinc-500 border-white/5 hover:bg-white/5 hover:text-zinc-300")}>
              <t.icon className="w-3 h-3" />{t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrer..."
            className="pl-8 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50 transition-colors w-48" />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 border-b border-white/8 bg-[#060810]/95 backdrop-blur-sm">
            {tab === "membres" && (
              <tr>{["Nom", "Email", "Pipeline", "Genre", "Âge", "Ville", "FI", "Formation", "Entrée"].map(h => (
                <th key={h} className="text-left py-2.5 px-4 text-zinc-600 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            )}
            {tab === "familles" && (
              <tr>{["Nom", "Campus", "Pilote", "Co-Pilote", "Statut", "Ouverture", "Objectif"].map(h => (
                <th key={h} className="text-left py-2.5 px-4 text-zinc-600 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            )}
            {tab === "saisies" && (
              <tr>{["Semaine", "FI", "Présence", "Temps", "Finances", "Émotions", "Spirituel", "Commentaire"].map(h => (
                <th key={h} className="text-left py-2.5 px-4 text-zinc-600 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            )}
            {tab === "actions" && (
              <tr>{["Titre", "Type", "Date", "Statut", "Touchées", "Conversions", "Heures", "Debrief"].map(h => (
                <th key={h} className="text-left py-2.5 px-4 text-zinc-600 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            )}
          </thead>
          <tbody className="divide-y divide-white/3">
            {tab === "membres" && filteredMembres.map(m => (
              <tr key={m.id} className="hover:bg-white/3 transition-colors">
                <td className="py-2.5 px-4 font-medium text-white whitespace-nowrap">{m.nom_complet}</td>
                <td className="py-2.5 px-4 text-zinc-500">{m.email || "—"}</td>
                <td className="py-2.5 px-4"><span className="text-[10px] border px-1.5 py-0.5 rounded-md text-zinc-400 border-white/10">{m.statut_pipeline}</span></td>
                <td className="py-2.5 px-4 text-zinc-500">{m.genre || "—"}</td>
                <td className="py-2.5 px-4 text-zinc-500">{m.age || "—"}</td>
                <td className="py-2.5 px-4 text-zinc-500">{m.ville || "—"}</td>
                <td className="py-2.5 px-4 text-zinc-500">{getFI(m.famille_impact_id)?.name || "—"}</td>
                <td className="py-2.5 px-4 text-violet-400">{m.potentiel_formation ? "✦ Oui" : "—"}</td>
                <td className="py-2.5 px-4 text-zinc-600">{m.date_entree || "—"}</td>
              </tr>
            ))}
            {tab === "familles" && filteredFamilles.map(f => (
              <tr key={f.id} className="hover:bg-white/3 transition-colors">
                <td className="py-2.5 px-4 font-medium text-white whitespace-nowrap">{f.name}</td>
                <td className="py-2.5 px-4 text-zinc-500">{f.campus || "—"}</td>
                <td className="py-2.5 px-4 text-zinc-500 text-[11px]">{f.pilote_email || "—"}</td>
                <td className="py-2.5 px-4 text-zinc-500 text-[11px]">{f.co_pilote_email || "—"}</td>
                <td className="py-2.5 px-4"><span className={cn("text-[10px] border px-1.5 py-0.5 rounded-md", f.status === "active" ? "text-emerald-400 border-emerald-500/30" : "text-zinc-500 border-white/10")}>{f.status}</span></td>
                <td className="py-2.5 px-4 text-zinc-600">{f.date_ouverture || "—"}</td>
                <td className="py-2.5 px-4 text-zinc-500">{f.objectif_membres}</td>
              </tr>
            ))}
            {tab === "saisies" && filteredSaisies.slice(0, 200).map(s => (
              <tr key={s.id} className="hover:bg-white/3 transition-colors">
                <td className="py-2.5 px-4 font-medium text-white">{s.semaine}</td>
                <td className="py-2.5 px-4 text-zinc-500">{getFI(s.famille_impact_id)?.name || "—"}</td>
                <td className="py-2.5 px-4">{s.presence ? <span className="text-emerald-400">✓</span> : <span className="text-red-400">✗</span>}</td>
                <td className="py-2.5 px-4 text-zinc-400">{s.note_temps ?? "—"}</td>
                <td className="py-2.5 px-4 text-zinc-400">{s.note_finances ?? "—"}</td>
                <td className="py-2.5 px-4 text-zinc-400">{s.note_emotions ?? "—"}</td>
                <td className="py-2.5 px-4 text-zinc-400">{s.note_spirituel ?? "—"}</td>
                <td className="py-2.5 px-4 text-zinc-600 max-w-xs truncate">{s.commentaire || "—"}</td>
              </tr>
            ))}
            {tab === "actions" && filteredActions.map(a => (
              <tr key={a.id} className="hover:bg-white/3 transition-colors">
                <td className="py-2.5 px-4 font-medium text-white max-w-xs truncate">{a.titre}</td>
                <td className="py-2.5 px-4 text-zinc-500">{a.type_action}</td>
                <td className="py-2.5 px-4 text-zinc-600">{a.date_action}</td>
                <td className="py-2.5 px-4"><span className="text-[10px] border px-1.5 py-0.5 rounded-md text-zinc-400 border-white/10">{a.statut}</span></td>
                <td className="py-2.5 px-4 text-zinc-400">{a.personnes_touchees}</td>
                <td className="py-2.5 px-4 font-medium text-emerald-400">{a.conversions}</td>
                <td className="py-2.5 px-4 text-zinc-400">{a.temps_investi_heures}h</td>
                <td className="py-2.5 px-4">{a.debrief_complete ? <span className="text-emerald-400">✓</span> : <span className="text-zinc-600">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2.5 border-t border-white/5 text-xs text-zinc-600 bg-white/2">
          {currentData.length} enregistrement{currentData.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}