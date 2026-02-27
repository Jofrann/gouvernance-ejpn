import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Target } from "lucide-react";

const STATUS_COLORS = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  en_pause: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  fermee: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
};

const STATUS_LABELS = { active: "Active", en_pause: "En pause", fermee: "Fermée" };

export default function FIDashboardTab({ fi }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Statut */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-400">Statut</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={`${STATUS_COLORS[fi.status]}`}>{STATUS_LABELS[fi.status]}</Badge>
        </CardContent>
      </Card>

      {/* Pilote */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-400">Pilote</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white font-semibold">{fi.pilote_nom}</p>
          <p className="text-xs text-zinc-500">{fi.pilote_email}</p>
        </CardContent>
      </Card>

      {/* Co-Pilote */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-400">Co-Pilote</CardTitle>
        </CardHeader>
        <CardContent>
          {fi.co_pilote_nom ? (
            <>
              <p className="text-white font-semibold">{fi.co_pilote_nom}</p>
              <p className="text-xs text-zinc-500">{fi.co_pilote_email}</p>
            </>
          ) : (
            <p className="text-zinc-500 text-sm">Non assigné</p>
          )}
        </CardContent>
      </Card>

      {/* Campus & Date */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-400">Campus</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white">{fi.campus}</p>
        </CardContent>
      </Card>

      {/* Date d'ouverture */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-400">Date d'ouverture</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white">{fi.date_ouverture || "—"}</p>
        </CardContent>
      </Card>

      {/* Objectif membres */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-400">Objectif</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white">{fi.objectif_membres || 12} membres</p>
        </CardContent>
      </Card>
    </div>
  );
}