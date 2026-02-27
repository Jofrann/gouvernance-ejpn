import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Activity, Calendar, Gauge, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";
import HubMembresTab from "@/components/fi/HubMembresTab";
import HubSuiviTab from "@/components/fi/HubSuiviTab";
import HubAgendaTab from "@/components/fi/HubAgendaTab";
import HubDashboardTab from "@/components/fi/HubDashboardTab";
import ManageMembersModal from "@/components/fi/ManageMembersModal";

const urlParams = new URLSearchParams(window.location.search);
const INIT_FI_ID = urlParams.get("fiId");

export default function FIHubPage() {
  useTrackActivity("FIHub");
  const queryClient = useQueryClient();
  const [selectedFI, setSelectedFI] = useState(INIT_FI_ID || null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("membres");
  const [showManageMembers, setShowManageMembers] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: familles = [] } = useQuery({
    queryKey: ["familles"],
    queryFn: () => base44.entities.FamilleImpact.list(),
    onSuccess: (data) => { if (data.length > 0 && !selectedFI) setSelectedFI(data[0].id); }
  });

  const currentFI = familles.find(f => f.id === selectedFI);

  // Real-time subscriptions
  useEffect(() => {
    if (!selectedFI) return;
    
    const unsubs = [
      base44.entities.AmeCRM.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ["membres", selectedFI] });
      }),
      base44.entities.SuiviHebdomadaire.subscribe((event) => {
        if (event.data?.famille_impact_id === selectedFI) {
          queryClient.invalidateQueries({ queryKey: ["suivi", selectedFI] });
        }
      }),
      base44.entities.EvenementAgenda.subscribe((event) => {
        if (event.data?.famille_impact_id === selectedFI) {
          queryClient.invalidateQueries({ queryKey: ["events", selectedFI] });
        }
      })
    ];

    return () => unsubs.forEach(u => u?.());
  }, [selectedFI, queryClient]);

  const canManage = ["admin", "responsable_pole", "pilote", "co_pilote"].includes(user?.role);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-4">
          <p className="text-xs font-bold text-blue-400/80 uppercase tracking-widest mb-1">Familles d'Impact</p>
          <h1 className="text-3xl font-bold text-foreground">Hub de Gestion</h1>
          <p className="text-sm text-muted-foreground mt-2">Espace centralisé pour gérer votre Famille d'Impact</p>
        </div>

        {/* FI Selector */}
        <div className="flex items-center gap-4 flex-wrap">
          <Select value={selectedFI || ""} onValueChange={setSelectedFI}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder="Sélectionner une FI" />
            </SelectTrigger>
            <SelectContent>
              {familles.map((fi) => (
                <SelectItem key={fi.id} value={fi.id}>{fi.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentFI && (
            <>
              <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-border bg-card">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{currentFI.pilote_nom}</p>
                  <p className="text-xs text-muted-foreground">Pilote</p>
                </div>
              </div>

              {canManage && (
                <Button
                  onClick={() => setShowManageMembers(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Gérer membres
                </Button>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      {selectedFI && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted p-1 rounded-lg flex gap-1">
            <TabsTrigger value="membres" className="gap-2">
              <Users className="w-4 h-4" />
              Membres
            </TabsTrigger>
            <TabsTrigger value="suivi" className="gap-2">
              <Activity className="w-4 h-4" />
              Suivi Hebdo
            </TabsTrigger>
            <TabsTrigger value="agenda" className="gap-2">
              <Calendar className="w-4 h-4" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <Gauge className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
          </TabsList>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <TabsContent value="membres" className="space-y-4">
              <HubMembresTab familleImpactId={selectedFI} />
            </TabsContent>

            <TabsContent value="suivi" className="space-y-4">
              <HubSuiviTab familleImpactId={selectedFI} />
            </TabsContent>

            <TabsContent value="agenda" className="space-y-4">
              <HubAgendaTab familleImpactId={selectedFI} canEdit={canManage} />
            </TabsContent>

            <TabsContent value="dashboard" className="space-y-4">
              <HubDashboardTab familleImpactId={selectedFI} />
            </TabsContent>
          </motion.div>
        </Tabs>
      )}

      {/* Manage Members Modal */}
      {selectedFI && (
        <ManageMembersModal
          isOpen={showManageMembers}
          onClose={() => setShowManageMembers(false)}
          fiId={selectedFI}
          fiName={currentFI?.name}
        />
      )}
    </div>
  );
}