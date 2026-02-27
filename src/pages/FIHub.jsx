import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, Calendar, Settings2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";
import MembersGrid from "@/components/fi/MembersGrid";
import MemberProfile from "@/components/fi/MemberProfile";

const urlParams = new URLSearchParams(window.location.search);
const INIT_FI_ID = urlParams.get("fiId");

export default function FIHubPage() {
  useTrackActivity("FIHub");
  const queryClient = useQueryClient();
  const [selectedFI, setSelectedFI] = useState(INIT_FI_ID || null);
  const [search, setSearch] = useState("");
  const [selectedMembre, setSelectedMembre] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("membres");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: familles = [] } = useQuery({
    queryKey: ["familles"],
    queryFn: () => base44.entities.FamilleImpact.list(),
    onSuccess: (data) => { if (data.length > 0 && !selectedFI) setSelectedFI(data[0].id); }
  });

  const currentFI = familles.find(f => f.id === selectedFI);

  const { data: membres = [] } = useQuery({
    queryKey: ["membres", selectedFI],
    queryFn: () => selectedFI ? base44.entities.Membre.filter({ famille_impact_id: selectedFI }) : Promise.resolve([]),
    enabled: !!selectedFI,
  });

  const { data: saisies = [] } = useQuery({
    queryKey: ["saisies-fi", selectedFI],
    queryFn: () => selectedFI ? base44.entities.CliniqueSaisie.filter({ famille_impact_id: selectedFI }) : Promise.resolve([]),
    enabled: !!selectedFI,
  });

  // Real-time subscriptions
  useEffect(() => {
    const unsubMembres = base44.entities.Membre.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["membres", selectedFI] });
    });
    const unsubSaisies = base44.entities.CliniqueSaisie.subscribe((event) => {
      if (!selectedFI || event.data?.famille_impact_id === selectedFI) {
        queryClient.invalidateQueries({ queryKey: ["saisies-fi", selectedFI] });
      }
    });
    const unsubInteractions = base44.entities.InteractionPastorale.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["interactions"] });
    });
    return () => { unsubMembres(); unsubSaisies(); unsubInteractions(); };
  }, [selectedFI, queryClient]);

  const filtered = membres.filter(m =>
    m.nom_complet?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Familles d'Impact</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Hub Exécution FI</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Espace centralisé de gestion des membres · Suivi clinique · Interactions pastorales</p>
        </div>
      </motion.div>

      {/* FI Selector */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 items-center flex-wrap">
        <Select value={selectedFI || ""} onValueChange={setSelectedFI}>
          <SelectTrigger className="w-80 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Sélectionner une FI" />
          </SelectTrigger>
          <SelectContent>
            {familles.map((fi) => <SelectItem key={fi.id} value={fi.id}>{fi.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {currentFI && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-white/[0.07] bg-white/[0.02]">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <div>
              <p className="text-xs font-semibold text-white">{currentFI.pilote_nom}</p>
              <p className="text-[10px] text-zinc-500">Pilote</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/[0.04] border border-white/[0.08] p-1 rounded-xl">
          <TabsTrigger value="membres" className="gap-2">
            <Users className="w-3.5 h-3.5" /> Membres ({filtered.length})
          </TabsTrigger>
          <TabsTrigger value="clinique" className="gap-2">
            <Calendar className="w-3.5 h-3.5" /> Clinique Hebdo
          </TabsTrigger>
          <TabsTrigger value="parametres" className="gap-2">
            <Settings2 className="w-3.5 h-3.5" /> Paramètres FI
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="membres" className="space-y-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Rechercher un membre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-600">
              <Users className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
              Aucun membre trouvé
            </div>
          ) : (
            <MembersGrid
              membres={filtered}
              saisies={saisies}
              onSelectMember={setSelectedMembre}
            />
          )}
        </TabsContent>

        {/* Clinique Tab */}
        <TabsContent value="clinique" className="space-y-4">
          <div className="p-8 rounded-xl border border-white/[0.07] bg-white/[0.02] text-center">
            <p className="text-sm text-zinc-500">Accédez à <span className="font-semibold text-white">Clinique du Jeudi</span> depuis le menu principal</p>
            <p className="text-xs text-zinc-600 mt-2">Saisies hebdomadaires des 4 dimensions (Temps, Finances, Émotions, Spirituel)</p>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="parametres" className="space-y-4">
          <div className="p-8 rounded-xl border border-white/[0.07] bg-white/[0.02] text-center">
            <p className="text-sm text-zinc-500">Les paramètres FI seront disponibles prochainement</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Member Profile Sheet */}
      <MemberProfile
        membre={selectedMembre}
        isOpen={!!selectedMembre}
        onClose={() => setSelectedMembre(null)}
        fiId={selectedFI}
        user={user}
        saisies={saisies}
      />
    </div>
  );
}