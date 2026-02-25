import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function PlaceholderPage({ title, description, icon: Icon = Construction }) {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{title}</h1>
        {description && <p className="text-sm text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <Card className="border border-zinc-200 bg-white">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 mb-4">
            <Icon className="w-8 h-8 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-700">Module en construction</p>
          <p className="text-xs text-zinc-400 mt-1">Cette fonctionnalité sera bientôt disponible</p>
        </CardContent>
      </Card>
    </div>
  );
}