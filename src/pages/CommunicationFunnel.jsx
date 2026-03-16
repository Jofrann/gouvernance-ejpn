import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Award, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const GlassCard = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-white/[0.07] p-5 ${className}`}
    style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}>
    {children}
  </div>
);

export default function CommunicationFunnelPage() {
  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.CommunicationAsset.list("-created_date", 200),
  });

  const campaigns = useMemo(() => {
    const grouped = {};
    assets.filter(a => a.campagne_tag && a.statut === "valide").forEach((a) => {
      if (!grouped[a.campagne_tag]) grouped[a.campagne_tag] = { tag: a.campagne_tag, assets: [], contacts: 0 };
      grouped[a.campagne_tag].assets.push(a);
      grouped[a.campagne_tag].contacts += a.contacts_generes || 0;
    });
    return Object.values(grouped).sort((a, b) => b.contacts - a.contacts);
  }, [assets]);

  const abData = campaigns.map((c) => ({
    name: c.tag.length > 18 ? c.tag.slice(0, 18) + "…" : c.tag,
    contacts: c.contacts,
    assets: c.assets.length,
  }));

  const byType = useMemo(() => {
    const types = ["flyer", "video", "photo"];
    return types.map((t) => {
      const typeAssets = assets.filter((a) => a.type_asset === t && a.statut === "valide");
      return { type: t, contacts: typeAssets.reduce((s, a) => s + (a.contacts_generes || 0), 0), count: typeAssets.length };
    }).sort((a, b) => b.contacts - a.contacts);
  }, [assets]);

  const topCampaign = campaigns[0];
  const bottomCampaign = campaigns[campaigns.length - 1];

  return (
    <div className="px-6 py-10 max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-[0.25em] mb-1">Communication</p>
        <h1 className="text-2xl font-black text-white tracking-tight">Funnel Analytics</h1>
        <p className="text-sm text-zinc-500 mt-0.5">A/B Testing Campagnes · Rendement par type de contenu</p>
      </motion.div>

      {/* A/B Summary */}
      {campaigns.length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-white/5 border border-emerald-500/20"><Award className="w-5 h-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-emerald-400/80 font-medium">🏆 Meilleure Campagne</p>
              <p className="text-sm font-bold text-white">{topCampaign?.tag}</p>
              <p className="text-xs text-zinc-500">{topCampaign?.contacts} contacts générés</p>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-white/5 border border-amber-500/20"><AlertTriangle className="w-5 h-5 text-amber-400" /></div>
            <div>
              <p className="text-xs text-amber-400/80 font-medium">⚠ À repenser</p>
              <p className="text-sm font-bold text-white">{bottomCampaign?.tag}</p>
              <p className="text-xs text-zinc-500">{bottomCampaign?.contacts} contacts seulement</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Contacts par Campagne (A/B)</p>
          {abData.length === 0 ? (
            <p className="text-sm text-zinc-600 py-8 text-center">Aucune donnée — renseignez les contacts générés par asset</p>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={abData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px", color: "#fff" }} />
                  <Bar dataKey="contacts" fill="#2563eb" radius={[4, 4, 0, 0]} name="Contacts" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Rendement par Type de Contenu</p>
          <div className="space-y-4 py-4">
            {byType.map((t, i) => (
              <div key={t.type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {i === 0 && <span className="text-amber-400">🏆</span>}
                    <span className="font-medium text-zinc-300 capitalize">{t.type}</span>
                    <span className="text-xs text-zinc-600">{t.count} asset{t.count !== 1 ? "s" : ""}</span>
                  </div>
                  <span className="font-bold text-white">{t.contacts} contacts</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", i === 0 ? "bg-blue-500/70" : i === 1 ? "bg-blue-500/40" : "bg-blue-500/20")}
                    style={{ width: `${byType[0].contacts > 0 ? (t.contacts / byType[0].contacts) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
            {byType.every((t) => t.contacts === 0) && (
              <p className="text-sm text-zinc-600 text-center py-6">Renseignez les contacts générés dans le Kanban Studio</p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Detailed table */}
      <GlassCard>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Tableau A/B Détaillé</p>
        {campaigns.length === 0 ? (
          <p className="text-sm text-zinc-600 py-8 text-center">Créez des assets avec des tags campagne pour activer le comparatif</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {["Campagne", "Assets", "Contacts", "Rendement"].map((h) => (
                    <th key={h} className="text-left py-2 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={c.tag} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="py-2.5 font-medium text-zinc-200 flex items-center gap-2">
                      {i === 0 && <span className="text-amber-400">🏆</span>}
                      {c.tag}
                    </td>
                    <td className="py-2.5 text-zinc-500">{c.assets.length}</td>
                    <td className="py-2.5 font-bold text-white">{c.contacts}</td>
                    <td className="py-2.5">
                      <Badge className={cn("text-[10px] border", i === 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : i === campaigns.length - 1 && campaigns.length > 1 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-white/5 text-zinc-500 border-white/10")}>
                        {i === 0 ? "🔥 Top" : i === campaigns.length - 1 && campaigns.length > 1 ? "⚠ Faible" : "✓ Correct"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}