import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { TrendingUp, Award, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CommunicationFunnelPage() {
  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.CommunicationAsset.list("-created_date", 200),
  });

  // A/B Testing: group by campagne_tag
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

  // By type
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Funnel Analytics</h1>
        <p className="text-sm text-zinc-500 mt-0.5">A/B Testing Campagnes · Rendement par type de contenu</p>
      </div>

      {/* A/B Summary */}
      {campaigns.length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
                <Award className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium">🏆 Meilleure Campagne</p>
                <p className="text-sm font-bold text-emerald-800">{topCampaign?.tag}</p>
                <p className="text-xs text-emerald-600">{topCampaign?.contacts} contacts générés</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-white border border-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">⚠ À repenser</p>
                <p className="text-sm font-bold text-amber-800">{bottomCampaign?.tag}</p>
                <p className="text-xs text-amber-600">{bottomCampaign?.contacts} contacts seulement</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* A/B Campaign Chart */}
        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-900">Contacts par Campagne (A/B)</CardTitle>
          </CardHeader>
          <CardContent>
            {abData.length === 0 ? (
              <p className="text-sm text-zinc-400 py-8 text-center">Aucune donnée — renseignez les contacts générés par asset</p>
            ) : (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={abData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ border: "1px solid #e4e4e7", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="contacts" fill="#2563eb" radius={[4, 4, 0, 0]} name="Contacts" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* By type */}
        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-900">Rendement par Type de Contenu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 py-4">
              {byType.map((t, i) => (
                <div key={t.type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {i === 0 && <span className="text-amber-500">🏆</span>}
                      <span className="font-medium text-zinc-700 capitalize">{t.type}</span>
                      <span className="text-xs text-zinc-400">{t.count} asset{t.count !== 1 ? "s" : ""}</span>
                    </div>
                    <span className="font-bold text-zinc-900">{t.contacts} contacts</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", i === 0 ? "bg-blue-600" : i === 1 ? "bg-blue-400" : "bg-blue-200")}
                      style={{ width: `${byType[0].contacts > 0 ? (t.contacts / byType[0].contacts) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              {byType.every((t) => t.contacts === 0) && (
                <p className="text-sm text-zinc-400 text-center py-6">Renseignez les contacts générés dans le Kanban Studio</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed table */}
      <Card className="border-zinc-200 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-900">Tableau A/B Détaillé</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">Créez des assets avec des tags campagne pour activer le comparatif</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-zinc-100"><th className="text-left py-2 text-xs text-zinc-400 font-medium">Campagne</th><th className="text-center py-2 text-xs text-zinc-400 font-medium">Assets</th><th className="text-right py-2 text-xs text-zinc-400 font-medium">Contacts</th><th className="text-right py-2 text-xs text-zinc-400 font-medium">Rendement</th></tr></thead>
                <tbody>
                  {campaigns.map((c, i) => (
                    <tr key={c.tag} className="border-b border-zinc-50 hover:bg-zinc-50">
                      <td className="py-2.5 font-medium text-zinc-900 flex items-center gap-2">
                        {i === 0 && <span className="text-amber-500">🏆</span>}
                        {c.tag}
                      </td>
                      <td className="py-2.5 text-center text-zinc-500">{c.assets.length}</td>
                      <td className="py-2.5 text-right font-bold text-zinc-900">{c.contacts}</td>
                      <td className="py-2.5 text-right">
                        <Badge className={cn("text-[10px]", i === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : i === campaigns.length - 1 && campaigns.length > 1 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-zinc-50 text-zinc-600 border-zinc-200")}>
                          {i === 0 ? "🔥 Top" : i === campaigns.length - 1 && campaigns.length > 1 ? "⚠ Faible" : "✓ Correct"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}