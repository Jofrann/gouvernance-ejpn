import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import TroneDashboard from "@/components/dashboards/TroneDashboard";
import PiloteDashboard from "@/components/dashboards/PiloteDashboard";
import DefaultDashboard from "@/components/dashboards/DefaultDashboard";

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

  const role = user?.role;

  const renderDashboard = () => {
    // Direction / Trône
    if (role === "trone" || role === "admin") {
      return <TroneDashboard user={user} />;
    }
    // Pilotes / Co-pilotes FI
    if (role === "pilote_fi" || role === "copilote_fi") {
      return <PiloteDashboard user={user} />;
    }
    // Responsable FI — gets the global view too (admin-like)
    if (role === "responsable_fi") {
      return <TroneDashboard user={user} />;
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