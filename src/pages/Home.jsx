import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import TroneDashboard from "@/components/dashboards/TroneDashboard";
import PiloteDashboard from "@/components/dashboards/PiloteDashboard";
import DefaultDashboard from "@/components/dashboards/DefaultDashboard";
import OnboardingWalkthrough from "@/components/onboarding/OnboardingWalkthrough";

export default function HomePage() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

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
      {renderDashboard()}
    </div>
  );
}