import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import TopNav from "@/components/navigation/TopNav";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <div className="h-screen flex items-center justify-center bg-[#080b12]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-blue-500/30 rounded-full" />
            <div className="absolute inset-0 w-12 h-12 border-t-2 border-blue-500 rounded-full animate-spin" />
          </div>
          <p className="text-sm text-zinc-500 font-medium tracking-wider uppercase">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080b12]">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-violet-600/6 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-indigo-600/5 rounded-full blur-3xl" />
      </div>

      <TopNav user={user} currentPage={currentPageName} />

      <main className="relative pt-16 min-h-screen">
        {children}
      </main>
    </div>
  );
}