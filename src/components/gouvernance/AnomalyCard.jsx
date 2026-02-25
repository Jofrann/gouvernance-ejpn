import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, ArrowDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_CONFIG = {
  critique: { color: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-800", icon: AlertTriangle, iconColor: "text-red-500" },
  alerte: { color: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-800", icon: TrendingDown, iconColor: "text-amber-500" },
  attention: { color: "bg-yellow-50 border-yellow-200", badge: "bg-yellow-100 text-yellow-800", icon: Clock, iconColor: "text-yellow-500" },
};

export default function AnomalyCard({ anomaly }) {
  const config = SEVERITY_CONFIG[anomaly.severity] || SEVERITY_CONFIG.attention;
  const Icon = config.icon;

  return (
    <Card className={cn("border transition-all hover:shadow-md", config.color)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-white border border-zinc-100 flex-shrink-0">
            <Icon className={cn("w-4 h-4", config.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-zinc-900 truncate">{anomaly.entity_name}</h4>
              <Badge className={cn("text-[10px] px-1.5", config.badge)}>
                {anomaly.severity}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5">
                {anomaly.pole}
              </Badge>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">{anomaly.description}</p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <ArrowDown className="w-3 h-3 text-red-500" />
                <span className="text-xs font-semibold text-red-600">{anomaly.metric_value}</span>
                <span className="text-xs text-zinc-400">/ {anomaly.metric_target}</span>
              </div>
              <span className="text-[10px] text-zinc-400">{anomaly.metric_label}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}