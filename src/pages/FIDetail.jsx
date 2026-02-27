import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

// Import des composants d'onglets (à créer)
import FIDashboardTab from "@/components/fi/FIDashboardTab";
import FIMembersTab from "@/components/fi/FIMembersTab";
import FIFollowupTab from "@/components/fi/FIFollowupTab";
import FIAgendaTab from "@/components/fi/FIAgendaTab";

export default function FIDetail() {
  const { fiId } = useParams();
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: fi, isLoading: fiLoading } = useQuery({
    queryKey: ["fi", fiId],
    queryFn: () => base44.entities.FamilleImpact.filter({ id: fiId }),
  });

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  // Real-time subscription
  React.useEffect(() => {
    const unsubscribe = base44.entities.FamilleImpact.subscribe(() => {
      // Refresh si changement
    });
    return unsubscribe;
  }, []);

  if (fiLoading || !fi || fi.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const famille = fi[0];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <Link to={createPageUrl("FIManager")}>
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-[0.25em]">Famille d'Impact</p>
          <h1 className="text-2xl font-black text-white tracking-tight">{famille.name}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{famille.campus} • Pilote: {famille.pilote_nom}</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10 p-1 rounded-lg">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-white/10">Dashboard</TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-white/10">Membres & Dossiers</TabsTrigger>
          <TabsTrigger value="followup" className="data-[state=active]:bg-white/10">Suivi Hebdo</TabsTrigger>
          <TabsTrigger value="agenda" className="data-[state=active]:bg-white/10">Agenda</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <FIDashboardTab fi={famille} />
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <FIMembersTab fiId={famille.id} />
        </TabsContent>

        <TabsContent value="followup" className="mt-6">
          <FIFollowupTab fiId={famille.id} />
        </TabsContent>

        <TabsContent value="agenda" className="mt-6">
          <FIAgendaTab fiId={famille.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}