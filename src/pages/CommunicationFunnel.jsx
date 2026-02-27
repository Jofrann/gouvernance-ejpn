import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  TrendingUp, Award, AlertTriangle, Target, Users, BarChart2,
  Edit3, Save, X, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
const TYPE_LABELS = { flyer: "Flyer", video: "Vidéo", photo: "Photo", logo: "Logo", charte: "Charte", autre: "Autre" };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1520] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

function ContactsEditor({ asset, onClose }) {
  const qc = useQueryClient();
  const [val, setVal] = useState(asset.contacts_generes || 0);
  const save = async () => {
    await base44.entities.CommunicationAsset.update(asset.id, { contacts_generes: Number(val) });
    qc.invalidateQueries({ queryKey: ["com-assets-funnel"] });
    toast.success("Mis à jour");
    onClose();
  };
  return (
    <div className="flex items-center gap-2">
      <input
        type="number" min="0" value={val} onChange={e => setVal(e.target.value)}
        className="w-20 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs text-white outline-none"
        autoFocus
      />
      <button onClick={save} className="p-1 text-emerald-400 hover:text-emerald-300"><Save className="w-3.5 h-3.5" /></button>
      <button onClick={onClose} className="p-1 text-zinc-600 hover:text-zinc-400"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

export default function CommunicationFunnelPage() {
  useTrackActivity("CommunicationFunnel");
  const [editingId, setEditingId] = useState(null);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isResponsable = user?.role === "admin" || user?.role === "responsable_communication";

  const { data: assets = [] } = useQuery({
    queryKey: ["com-assets-funnel"],
    queryFn: () => base44.entities.CommunicationAsset.list("-created_date", 300),
    refetchInterval: 30000,
  });

  const validAssets = useMemo(() => assets.filter(a => a.statut === "valide"), [assets]);

  // Campaign stats
  const campaigns = useMemo(() => {
    const grouped = {};
    validAssets.filter(a => a.campagne_tag).forEach(a => {
      if (!grouped[a.campagne_tag]) grouped[a.campagne_tag] = { tag: a.campagne_tag, assets: [], contacts: 0 };
      grouped[a.campagne_tag].assets.push(a);
      grouped[a.campagne_tag].contacts += a.contacts_generes || 0;
    });
    return Object.values(grouped).sort((a, b) => b.contacts - a.contacts);
  }, [validAssets]);

  // By type
  const byType = useMemo(() =>
    Object.keys(TYPE_LABELS).map(t => {
      const typeAssets = validAssets.filter(a => a.type_asset === t);
      return { type: t, label: TYPE_LABELS[t], contacts: typeAssets.reduce((s, a) => s + (a.contacts_generes || 0), 0), count: typeAssets.length };
    }).filter(t => t.count > 0).sort((a, b) => b.contacts - a.contacts),
  [validAssets]);

  // Global KPIs
  const totalContacts = useMemo(() => assets.reduce((s, a) => s + (a.contacts_generes || 0), 0), [assets]);
  const totalValidated = validAssets.length;
  const avgContacts = totalValidated > 0 ? Math.round(totalContacts / Math.max(totalValidated, 1)) : 0;
  const topCampaign = campaigns[0];

  const abData = campaigns.slice(0, 8).map(c => ({
    name: c.tag.length > 16 ? c.tag.slice(0, 16) + "…" : c.tag,
    contacts: c.contacts,
    assets: c.assets.length,
  }));

  const pieData = byType.map((t, i) => ({ name: t.label, value: t.contacts, count: t.count }));

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Analytics & A/B Testing</h1>
          <p className="text-xs text-zinc-600">Rendement des campagnes · Performance par type de contenu</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Contacts générés", value: totalContacts, icon: Users, color: "from-blue-500/20 to-blue-600/5", border: "border-blue-500/20", text: "text-blue-400" },
            { label: "Assets validés", value: totalValidated, icon: Target, color: "from-emerald-500/20 to-emerald-600/5", border: "border-emerald-500/20", text: "text-emerald-400" },
            { label: "Moy. contacts/asset", value: avgContacts, icon: BarChart2, color: "from-violet-500/20 to-violet-600/5", border: "border-violet-500/20", text: "text-violet-400" },
            { label: "Campagnes actives", value: campaigns.length, icon: TrendingUp, color: "from-amber-500/20 to-amber-600/5", border: "border-amber-500/20", text: "text-amber-400" },
          ].map(k => (
            <div key={k.label} className={cn("ai-card p-4 rounded-xl border bg-gradient-to-br", k.color, k.border)}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-500">{k.label}</p>
                <k.icon className={cn("w-4 h-4", k.text)} />
              </div>
              <p className={cn("text-2xl font-bold", k.text)}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Top/Bottom */}
        {campaigns.length >= 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="ai-card p-4 rounded-xl border border-emerald-500/20 bg-emerald-900/10 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Award className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-emerald-500 font-medium mb-0.5">🏆 Meilleure campagne</p>
                <p className="text-sm font-bold text-white">{topCampaign?.tag}</p>
                <p className="text-xs text-emerald-400">{topCampaign?.contacts} contacts · {topCampaign?.assets.length} assets</p>
              </div>
            </div>
            <div className="ai-card p-4 rounded-xl border border-amber-500/20 bg-amber-900/10 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-amber-500 font-medium mb-0.5">⚠ À repenser</p>
                <p className="text-sm font-bold text-white">{campaigns[campaigns.length - 1]?.tag}</p>
                <p className="text-xs text-amber-400">{campaigns[campaigns.length - 1]?.contacts} contacts seulement</p>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Contacts par campagne */}
          <div className="ai-card rounded-xl p-5 border border-white/8">
            <h3 className="text-sm font-semibold text-white mb-4">Contacts par Campagne (A/B)</h3>
            {abData.length === 0 ? (
              <div className="h-52 flex items-center justify-center">
                <p className="text-xs text-zinc-600 text-center">Ajoutez des contacts aux assets<br/>pour activer le comparatif</p>
              </div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={abData} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#52525b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#52525b" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="contacts" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Contacts" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Par type */}
          <div className="ai-card rounded-xl p-5 border border-white/8">
            <h3 className="text-sm font-semibold text-white mb-4">Rendement par Type</h3>
            {pieData.length === 0 || pieData.every(p => p.value === 0) ? (
              <div className="h-52 flex items-center justify-center">
                <p className="text-xs text-zinc-600 text-center">Renseignez les contacts<br/>générés par asset</p>
              </div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      dataKey="value" nameKey="name">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={({ active, payload }) => active && payload?.length ? (
                      <div className="bg-[#0f1520] border border-white/10 rounded-xl px-3 py-2 text-xs">
                        <p className="text-white font-semibold">{payload[0].name}</p>
                        <p className="text-zinc-400">{payload[0].value} contacts · {payload[0].payload.count} assets</p>
                      </div>
                    ) : null} />
                    <Legend formatter={(v) => <span className="text-xs text-zinc-400">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Tableau détaillé avec édition contacts */}
        <div className="ai-card rounded-xl border border-white/8 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white">Tableau A/B Détaillé</h3>
            {isResponsable && <p className="text-xs text-zinc-600">Cliquez sur 🖊 pour saisir les contacts</p>}
          </div>
          <div className="overflow-x-auto">
            {campaigns.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-zinc-600">Créez des assets avec des tags campagne<br/>pour activer le comparatif A/B</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Campagne", "Assets", "Contacts", "Perf."].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/3">
                  {campaigns.map((c, i) => (
                    <tr key={c.tag} className="hover:bg-white/3 transition-colors">
                      <td className="px-5 py-3 font-medium text-white">
                        <div className="flex items-center gap-2">
                          {i === 0 && <span>🏆</span>}
                          {i === campaigns.length - 1 && campaigns.length > 1 && <span>⚠️</span>}
                          {c.tag}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-zinc-500">{c.assets.length}</td>
                      <td className="px-5 py-3">
                        <span className={cn("font-bold", i === 0 ? "text-emerald-400" : "text-white")}>{c.contacts}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-medium",
                          i === 0 ? "text-emerald-400 bg-emerald-900/30 border-emerald-600/30" :
                          i === campaigns.length - 1 && campaigns.length > 1 ? "text-amber-400 bg-amber-900/30 border-amber-600/30" :
                          "text-zinc-400 bg-zinc-800 border-zinc-700"
                        )}>
                          {i === 0 ? "🔥 Top" : i === campaigns.length - 1 && campaigns.length > 1 ? "⚠ Faible" : "✓ Correct"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Assets avec édition contacts */}
        {isResponsable && validAssets.length > 0 && (
          <div className="ai-card rounded-xl border border-white/8 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white">Saisie des Contacts par Asset</h3>
              <p className="text-xs text-zinc-600 mt-0.5">Renseignez le nombre de contacts générés par chaque asset validé</p>
            </div>
            <div className="divide-y divide-white/3 max-h-64 overflow-y-auto">
              {validAssets.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-white/3 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{a.titre}</p>
                    <p className="text-[10px] text-zinc-600">{a.campagne_tag || "Sans campagne"} · {a.type_asset}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {editingId === a.id ? (
                      <ContactsEditor asset={a} onClose={() => setEditingId(null)} />
                    ) : (
                      <button
                        onClick={() => setEditingId(a.id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-400 hover:text-white transition-all"
                      >
                        <span className="font-semibold text-white">{a.contacts_generes || 0}</span>
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}