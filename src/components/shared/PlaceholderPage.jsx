import React from "react";
import { Construction } from "lucide-react";

export default function PlaceholderPage({ title, description, icon: Icon = Construction }) {
  return (
    <div className="px-6 py-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.25em] mb-1">Module</p>
        <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
        {description && <p className="text-sm text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="ai-card flex flex-col items-center justify-center py-24 rounded-2xl">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
          <Icon className="w-7 h-7 text-zinc-500" />
        </div>
        <p className="text-sm font-semibold text-zinc-400">Module en construction</p>
        <p className="text-xs text-zinc-600 mt-1">Cette fonctionnalité sera bientôt disponible</p>
      </div>
    </div>
  );
}