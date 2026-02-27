import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export default function MemberTrendChart({ saisies, membreId }) {
  if (!saisies || saisies.length === 0) {
    return <div className="text-xs text-zinc-600 py-8 text-center">Pas de données historiques</div>;
  }

  const data = saisies
    .filter(s => s.membre_id === membreId)
    .sort((a, b) => new Date(a.semaine) - new Date(b.semaine))
    .map(s => ({
      semaine: format(parseISO(s.semaine), "d MMM", { locale: fr }),
      temps: s.note_temps,
      finances: s.note_finances,
      emotions: s.note_emotions,
      spirituel: s.note_spirituel,
      avg: (
        [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel]
          .filter(n => n !== null && n !== undefined)
          .reduce((a, b) => a + b, 0) / 
        [s.note_temps, s.note_finances, s.note_emotions, s.note_spirituel].filter(n => n !== null && n !== undefined).length
      ).toFixed(1),
    }));

  return (
    <div className="w-full h-80 bg-white/[0.02] rounded-xl border border-white/[0.06] p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="semaine" stroke="rgba(255,255,255,0.4)" style={{ fontSize: "10px" }} />
          <YAxis domain={[0, 10]} stroke="rgba(255,255,255,0.4)" style={{ fontSize: "10px" }} />
          <Tooltip 
            contentStyle={{ background: "rgba(8,11,18,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
            labelStyle={{ color: "#fff", fontSize: "12px" }}
          />
          <Legend wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }} />
          <Line type="monotone" dataKey="temps" stroke="#3b82f6" dot={{ r: 3 }} name="⏰ Temps" strokeWidth={2} />
          <Line type="monotone" dataKey="finances" stroke="#f59e0b" dot={{ r: 3 }} name="💰 Finances" strokeWidth={2} />
          <Line type="monotone" dataKey="emotions" stroke="#ec4899" dot={{ r: 3 }} name="💭 Émotions" strokeWidth={2} />
          <Line type="monotone" dataKey="spirituel" stroke="#8b5cf6" dot={{ r: 3 }} name="🙏 Spirituel" strokeWidth={2} />
          <Line type="monotone" dataKey="avg" stroke="#10b981" dot={{ r: 3 }} name="Moyenne" strokeWidth={2} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}