import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Home, TrendingUp, Target, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444"];

function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp }) {
  return (
    <Card className="border border-zinc-200 bg-white">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold text-zinc-900 mt-1 tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>}
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
            <Icon className="w-5 h-5 text-zinc-600" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-3">
            {trendUp ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
            )}
            <span className={`text-xs font-medium ${trendUp ? "text-emerald-600" : "text-red-500"}`}>
              {trend}
            </span>
            <span className="text-xs text-zinc-400">vs mois dernier</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const { data: membres = [] } = useQuery({
    queryKey: ["membres"],
    queryFn: () => base44.entities.Membre.list("-created_date", 500),
  });

  const { data: familles = [] } = useQuery({
    queryKey: ["familles"],
    queryFn: () => base44.entities.FamilleImpact.list(),
  });

  const { data: okrs = [] } = useQuery({
    queryKey: ["okrs"],
    queryFn: () => base44.entities.OKR.list(),
  });

  const pipelineData = [
    { name: "Passifs", value: membres.filter((m) => m.statut_pipeline === "passif").length },
    { name: "Réguliers", value: membres.filter((m) => m.statut_pipeline === "regulier").length },
    { name: "Disciples", value: membres.filter((m) => m.statut_pipeline === "disciple").length },
    { name: "Reproducteurs", value: membres.filter((m) => m.statut_pipeline === "reproducteur").length },
  ];

  const activeFI = familles.filter((f) => f.status === "active").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">O.S.P — Vision 2026</p>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Mouvement des Familles d'Impact</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Structuration · Conquête · Multiplication consciente</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 border border-zinc-200 rounded-lg px-3 py-2 bg-white">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Système actif — 3 niveaux opérationnels
        </div>
      </div>

      {/* Vision Banner */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-900 text-white p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Vision Fondatrice</p>
        <p className="text-sm leading-relaxed text-zinc-200 max-w-3xl">
          "Voir émerger un Royaume visible, organisé, puissant et fécond, porté par une jeunesse engagée, transformée et capable de se multiplier."
        </p>
        <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-zinc-700">
          {[["Niveau I", "Direction Souveraine", "text-amber-400"], ["Niveau II", "Gouvernance & Traduction", "text-blue-400"], ["Niveau III", "Exécution & Terrain", "text-emerald-400"]].map(([n, l, c]) => (
            <div key={n}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${c}`}>{n}</p>
              <p className="text-xs text-zinc-300">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Âmes Suivies" value={membres.length} icon={Users} trend="+12%" trendUp />
        <StatCard title="Maisons Actives" value={activeFI} icon={Home} subtitle={`${familles.length} Familles d'Impact`} />
        <StatCard title="Pipeline Disciples" value={membres.length > 0 ? `${Math.round((membres.filter(m => m.statut_pipeline !== "passif").length / membres.length) * 100)}%` : "0%"} icon={TrendingUp} trend="+3.2%" trendUp />
        <StatCard title="OKR en cours" value={okrs.filter((o) => o.statut === "en_cours").length} icon={Target} subtitle={`${okrs.filter(o => o.statut === "atteint").length} atteints`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-zinc-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-900">Pipeline de Transformation · Passif → Reproducteur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ border: "1px solid #e4e4e7", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="value" fill="#18181b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-900">Répartition des Statuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipelineData.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pipelineData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ border: "1px solid #e4e4e7", borderRadius: "8px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {pipelineData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-xs text-zinc-500">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent OKRs */}
      <Card className="border border-zinc-200 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-900">Objectifs du Cycle en cours</CardTitle>
        </CardHeader>
        <CardContent>
          {okrs.filter((o) => o.statut === "en_cours").length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">Aucun OKR en cours</p>
          ) : (
            <div className="space-y-3">
              {okrs.filter((o) => o.statut === "en_cours").slice(0, 5).map((okr) => {
                const progress = okr.objectif_cible > 0 ? Math.min(100, Math.round((okr.valeur_actuelle / okr.objectif_cible) * 100)) : 0;
                return (
                  <div key={okr.id} className="flex items-center gap-4 p-3 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{okr.titre}</p>
                      <p className="text-xs text-zinc-400">{okr.pole?.replace(/_/g, " ")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-zinc-600 w-10 text-right">{progress}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}