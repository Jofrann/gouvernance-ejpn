import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { motion } from "framer-motion";

// Get last 4 Thursdays
const getLast4Weeks = () => {
  const weeks = [];
  const today = new Date();
  for (let i = 0; i < 4; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (7 * i));
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 3;
    d.setDate(diff);
    weeks.unshift(d.toISOString().split("T")[0]);
  }
  return weeks;
};

export default function HubDashboardTab({ familleImpactId }) {
  const { data: membres = [] } = useQuery({
    queryKey: ["membres", familleImpactId],
    queryFn: () => base44.entities.AmeCRM.filter({ famille_impact_id: familleImpactId })
  });

  const { data: suivi = [] } = useQuery({
    queryKey: ["suivi", familleImpactId],
    queryFn: () => base44.entities.SuiviHebdomadaire.filter({ famille_impact_id: familleImpactId })
  });

  // Calculate averages
  const calculateHealthScore = () => {
    if (suivi.length === 0) return 0;
    const sum = suivi.reduce((acc, s) => {
      const notes = [s.note_gestion_temps, s.note_finances, s.note_sante_emotionnelle, s.note_maturite_spirituelle].filter(n => n);
      return acc + (notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : 0);
    }, 0);
    return Math.round(sum / suivi.length);
  };

  const calculateAttendance = () => {
    if (suivi.length === 0) return 0;
    const present = suivi.filter(s => s.presence).length;
    return Math.round((present / suivi.length) * 100);
  };

  // Prepare chart data for members health
  const chartData = membres.slice(0, 10).map(membre => {
    const memberSuivi = suivi.filter(s => s.ame_crm_id === membre.id);
    const avgScore = memberSuivi.length > 0
      ? Math.round(
          memberSuivi.reduce((acc, s) => {
            const notes = [s.note_gestion_temps, s.note_finances, s.note_sante_emotionnelle, s.note_maturite_spirituelle].filter(n => n);
            return acc + (notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : 0);
          }, 0) / memberSuivi.length
        )
      : 0;
    
    return {
      name: membre.nom_complet.split(" ")[0],
      score: avgScore
    };
  });

  // Prepare chart data for health evolution (4 weeks)
  const last4Weeks = getLast4Weeks();
  const healthEvolutionData = last4Weeks.map(week => {
    const weekSuivi = suivi.filter(s => s.semaine_date === week);
    const avgHealth = weekSuivi.length > 0
      ? Math.round(
          weekSuivi.reduce((acc, s) => {
            const notes = [s.note_gestion_temps, s.note_finances, s.note_sante_emotionnelle, s.note_maturite_spirituelle].filter(n => n);
            return acc + (notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : 0);
          }, 0) / weekSuivi.length
        )
      : 0;
    
    return {
      week: new Date(week).toLocaleDateString("fr-FR", { month: "2-digit", day: "2-digit" }),
      santé: avgHealth
    };
  });

  // Prepare chart data for member presence (4 weeks)
  const memberPresenceData = membres.slice(0, 10).map(membre => {
    const data = { name: membre.nom_complet.split(" ")[0] };
    last4Weeks.forEach((week, idx) => {
      const weekSuivi = suivi.find(s => s.ame_crm_id === membre.id && s.semaine_date === week);
      data[`sem${idx + 1}`] = weekSuivi?.presence ? 1 : 0;
    });
    return data;
  });

  const healthScore = calculateHealthScore();
  const attendance = calculateAttendance();

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="ai-card p-6 text-center"
        >
          <div className="text-3xl font-bold text-blue-400">{healthScore}/10</div>
          <p className="text-xs text-muted-foreground mt-2">Santé globale</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="ai-card p-6 text-center"
        >
          <div className="text-3xl font-bold text-emerald-400">{attendance}%</div>
          <p className="text-xs text-muted-foreground mt-2">Présence moyenne</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="ai-card p-6 text-center"
        >
          <div className="text-3xl font-bold text-violet-400">{membres.length}</div>
          <p className="text-xs text-muted-foreground mt-2">Membres actifs</p>
        </motion.div>
      </div>

      {/* Health Evolution Chart */}
      {healthEvolutionData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="ai-card p-6"
        >
          <h3 className="font-semibold text-foreground mb-4">Évolution de la santé globale (4 dernières semaines)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={healthEvolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" stroke="rgba(255,255,255,0.3)" />
              <YAxis stroke="rgba(255,255,255,0.3)" domain={[0, 10]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(10, 10, 20, 0.8)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px"
                }}
              />
              <Line
                type="monotone"
                dataKey="santé"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Member Presence Chart */}
      {memberPresenceData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="ai-card p-6"
        >
          <h3 className="font-semibold text-foreground mb-4">Présence par membre (4 dernières semaines)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={memberPresenceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" />
              <YAxis stroke="rgba(255,255,255,0.3)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(10, 10, 20, 0.8)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px"
                }}
              />
              <Bar dataKey="sem1" fill="#3b82f6" stackId="a" name="Sem 1" />
              <Bar dataKey="sem2" fill="#60a5fa" stackId="a" name="Sem 2" />
              <Bar dataKey="sem3" fill="#93c5fd" stackId="a" name="Sem 3" />
              <Bar dataKey="sem4" fill="#dbeafe" stackId="a" name="Sem 4" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Health Score Chart */}
      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="ai-card p-6"
        >
          <h3 className="font-semibold text-foreground mb-4">Santé des membres</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" />
              <YAxis stroke="rgba(255,255,255,0.3)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(10, 10, 20, 0.8)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px"
                }}
              />
              <Bar dataKey="score" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.score >= 8 ? "#10b981" : entry.score >= 5 ? "#f59e0b" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}