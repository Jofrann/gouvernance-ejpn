import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import TroneDashboard from "@/components/dashboards/TroneDashboard";
import PiloteDashboard from "@/components/dashboards/PiloteDashboard";
import DefaultDashboard from "@/components/dashboards/DefaultDashboard";
import OnboardingWalkthrough from "@/components/onboarding/OnboardingWalkthrough";
import CopiloteInsights from "@/components/ai/CopiloteInsights";

export default function HomePage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  // Real-time subscriptions for critical entities
  useEffect(() => {
    const unsubUser = base44.entities.User.subscribe(() => queryClient.invalidateQueries({ queryKey: ["me"] }));
    const unsubFI = base44.entities.FamilleImpact.subscribe(() => queryClient.invalidateQueries({ queryKey: ["familles"] }));
    const unsubMembres = base44.entities.Membre.subscribe(() => queryClient.invalidateQueries({ queryKey: ["membres-all"] }));
    const unsubSaisies = base44.entities.CliniqueSaisie.subscribe(() => queryClient.invalidateQueries({ queryKey: ["saisies-dash"] }));
    return () => { unsubUser(); unsubFI(); unsubMembres(); unsubSaisies(); };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="w-6 h-6 border-2 border-blue-500/60 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const roles = Array.isArray(user?.roles) && user.roles.length > 0
    ? user.roles
    : Array.isArray(user?.data?.roles) && user.data.roles.length > 0
    ? user.data.roles
    : user?.role ? [user.role] : [];

  // Context for onboarding walkthrough
  const isPilote = roles.some(r => ["pilote_fi", "copilote_fi"].includes(r));
  const familleImpactId = user?.famille_impact_id || user?.data?.famille_impact_id || null;

  const renderDashboard = () => {
    // Direction / Trône / Admin / Responsable général / Responsable FI
    if (roles.some(r => ["trone", "admin", "responsable_general", "responsable_fi"].includes(r))) {
      return <TroneDashboard user={user} />;
    }
    // Pilotes / Co-pilotes FI (seulement si pas déjà Trône)
    if (roles.some(r => ["pilote_fi", "copilote_fi"].includes(r))) {
      return <PiloteDashboard user={user} />;
    }
    // Default for all other roles
    return <DefaultDashboard user={user} />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {user && (
        <OnboardingWalkthrough
          user={user}
          roles={roles}
          membres={isPilote ? undefined : 0}
          saisiesAujourdhui={0}
        />
      )}

      {/* Copilote Pastoral — alerte proactive pour les pilotes */}
      {user && isPilote && familleImpactId && (
        <CopiloteInsights user={user} familleImpactId={familleImpactId} />
      )}

      {renderDashboard()}


    </div>
  );
}