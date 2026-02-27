import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";

export default function FITourControlePage() {
  useTrackActivity("FITourControle");
  const [search, setSearch] = useState("");

  const { data: familles = [] } = useQuery({
    queryKey: ["familles"],
    queryFn: () => base44.entities.FamilleImpact.list()
  });

  const { data: suivi = [] } = useQuery({
    queryKey: ["suivi"],
    queryFn: () => base44.entities.SuiviHebdomadaire.list()
  });

  // Get this week's date (Thursday)
  const getThursday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) + 3; // Thursday
    return new Date(today.setDate(diff)).toISOString().split("T")[0];
  };

  const thursday = getThursday();

  // Check if a FI has completed this week's suivi
  const hasCompletedSuivi = (fiId) => {
    const fiSuivi = suivi.filter(s => s.famille_impact_id === fiId && s.semaine_date === thursday);
    return fiSuivi.length > 0;
  };

  const filtered = familles.filter(fi =>
    fi.name.toLowerCase().includes(search.toLowerCase()) ||
    fi.pilote_nom.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <p className="text-xs font-bold text-emerald-400/80 uppercase tracking-widest mb-1">Supervision</p>
          <h1 className="text-3xl font-bold text-foreground">Tour de Contrôle</h1>
          <p className="text-sm text-muted-foreground mt-2">Vue globale du statut de suivi de tous les Pilotes</p>
        </div>

        {/* Search */}
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Chercher une FI ou un Pilote..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="ai-card p-4 bg-blue-500/10 border-blue-400/20 flex gap-3"
      >
        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground text-sm">Semaine du {thursday}</p>
          <p className="text-xs text-muted-foreground mt-1">Les Pilotes qui ont complété leur suivi hebdomadaire apparaissent en vert.</p>
        </div>
      </motion.div>

      {/* FI Table */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucune Famille d'Impact trouvée
          </div>
        ) : (
          filtered.map((fi, idx) => {
            const isComplete = hasCompletedSuivi(fi.id);
            return (
              <motion.div
                key={fi.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="ai-card p-5 flex items-center justify-between gap-4 hover:border-border/80 transition-all"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{fi.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{fi.pilote_nom}</p>
                </div>

                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-xs">
                    {fi.status || "active"}
                  </Badge>

                  <div className="flex items-center gap-2">
                    {isComplete ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-400/20 rounded-md"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-400">Complété</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-400/20 rounded-md"
                      >
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-semibold text-red-400">En attente</span>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8"
      >
        <Card className="p-4 text-center bg-muted/50">
          <div className="text-2xl font-bold text-foreground">{filtered.length}</div>
          <p className="text-xs text-muted-foreground mt-1">FI Totales</p>
        </Card>
        <Card className="p-4 text-center bg-emerald-500/10 border-emerald-400/20">
          <div className="text-2xl font-bold text-emerald-400">
            {filtered.filter(fi => hasCompletedSuivi(fi.id)).length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Complétées</p>
        </Card>
        <Card className="p-4 text-center bg-red-500/10 border-red-400/20">
          <div className="text-2xl font-bold text-red-400">
            {filtered.filter(fi => !hasCompletedSuivi(fi.id)).length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">En attente</p>
        </Card>
      </motion.div>
    </div>
  );
}