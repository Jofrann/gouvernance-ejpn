import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import TopNav from "@/components/navigation/TopNav";
import AnimatedBackground from "@/components/layout/AnimatedBackground";
import CopilotFloatingChat from "@/components/ai/CopilotFloatingChat";
import { useState } from "react";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          base44.auth.redirectToLogin();
          return;
        }
        const me = await base44.auth.me();
        setUser(me);
      } catch {
        base44.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#060810]">
        <AnimatedBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 border border-blue-500/20 rounded-full" />
            <div className="absolute inset-0 w-14 h-14 border-t-2 border-blue-500 rounded-full animate-spin" />
            <div className="absolute inset-2 w-10 h-10 border-t border-violet-500/50 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-xs text-zinc-600 font-semibold tracking-[0.3em] uppercase">Chargement</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060810] relative">
      {/* Animated canvas background */}
      <AnimatedBackground />

      {/* Noise grain for depth */}
      <div
        className="fixed inset-0 pointer-events-none z-[1] opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
          mixBlendMode: "overlay",
        }}
      />

      {/* Vignette */}
      <div className="fixed inset-0 pointer-events-none z-[1]" style={{
        background: "radial-gradient(ellipse at center, transparent 35%, rgba(4,6,16,0.7) 100%)"
      }} />

      {/* Subtle top light leak */}
      <div className="fixed top-0 left-0 right-0 h-px pointer-events-none z-[2]"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(99,155,255,0.3) 30%, rgba(139,92,246,0.3) 60%, transparent 100%)" }}
      />

      <TopNav user={user} currentPage={currentPageName} />

      <main className="relative z-10 pt-16 min-h-screen">
        {children}
      </main>

      {/* EJP Copilot — Floating Agent */}
      {user && <CopilotFloatingChat user={user} />}
    </div>
  );
}