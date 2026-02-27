import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { motion } from "framer-motion";
import MemberProfile from "./MemberProfile";

const statusColors = {
  passif: "bg-zinc-100 text-zinc-800",
  regulier: "bg-blue-100 text-blue-800",
  disciple: "bg-amber-100 text-amber-800",
  reproducteur: "bg-emerald-100 text-emerald-800"
};

export default function HubMembresTab({ familleImpactId }) {
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  const { data: membres = [] } = useQuery({
    queryKey: ["membres", familleImpactId],
    queryFn: () => base44.entities.AmeCRM.filter({ famille_impact_id: familleImpactId })
  });

  const filtered = membres.filter(m => 
    m.nom_complet.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setShowProfile(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Chercher un membre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </div>

      {/* Membres Grid */}
      <div className="grid gap-3">
        {filtered.map((membre) => (
          <motion.div
            key={membre.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => handleSelectMember(membre)}
            className="ai-card p-4 cursor-pointer hover:scale-[1.01] transition-all"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{membre.nom_complet}</h3>
                <div className="flex gap-2 mt-2">
                  <Badge className={statusColors[membre.statut]}>
                    {membre.statut}
                  </Badge>
                  {membre.ville && (
                    <span className="text-xs text-muted-foreground">{membre.ville}</span>
                  )}
                </div>
              </div>
              {membre.photo_url && (
                <img
                  src={membre.photo_url}
                  alt={membre.nom_complet}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Member Profile Sheet */}
      {selectedMember && (
        <MemberProfile
          member={selectedMember}
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}