import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, FileText, Video, Link as LinkIcon, CheckCircle2, ExternalLink, Users, Plus, Brain, Lightbulb, Heart, GraduationCap, Archive } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

const TYPE_ICONS = {
  pdf: FileText,
  video: Video,
  lien: LinkIcon,
};

const TYPE_COLORS = {
  pdf: "bg-red-50 text-red-700 border-red-200",
  video: "bg-blue-50 text-blue-700 border-blue-200",
  lien: "bg-violet-50 text-violet-700 border-violet-200",
};

const CURRENT_MONTH = format(new Date(), "yyyy-MM");

export default function FormationSallePage() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: ressources = [] } = useQuery({
    queryKey: ["ressources", CURRENT_MONTH],
    queryFn: () => base44.entities.FormationRessource.filter({ mois_cycle: CURRENT_MONTH }),
  });

  const { data: allRessources = [] } = useQuery({
    queryKey: ["ressources-all"],
    queryFn: () => base44.entities.FormationRessource.list(),
  });

  const { data: lectures = [] } = useQuery({
    queryKey: ["lectures", user?.email],
    queryFn: () => user ? base44.entities.FormationLecture.filter({ pilote_email: user.email }) : Promise.resolve([]),
    enabled: !!user,
  });

  // For responsable: all lectures to compute read-tracker
  const { data: allLectures = [] } = useQuery({
    queryKey: ["all-lectures"],
    queryFn: () => base44.entities.FormationLecture.list("-created_date", 500),
  });

  const { data: allPilotes = [] } = useQuery({
    queryKey: ["all-pilotes"],
    queryFn: () => base44.entities.User.list(),
  });

  const isResponsable = user?.role === "admin" || user?.role === "responsable_formation";

  const markAsRead = useMutation({
    mutationFn: async (ressourceId) => {
      const existing = lectures.find((l) => l.ressource_id === ressourceId);
      if (existing) return;
      await base44.entities.FormationLecture.create({
        pilote_email: user.email,
        ressource_id: ressourceId,
        ouvert: true,
        date_ouverture: format(new Date(), "yyyy-MM-dd"),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lectures", user?.email] });
      queryClient.invalidateQueries({ queryKey: ["all-lectures"] });
    },
  });

  const isRead = (ressourceId) => lectures.some((l) => l.ressource_id === ressourceId);

  const getReadRate = (ressourceId) => {
    const readerCount = allLectures.filter((l) => l.ressource_id === ressourceId).length;
    const total = Math.max(allPilotes.filter(p => p.role !== "admin").length, 1);
    return Math.round((readerCount / total) * 100);
  };

  const currentRessources = ressources;
  const pastRessources = allRessources.filter((r) => r.mois_cycle !== CURRENT_MONTH);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Salle d'Étude</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Ressources du mois · Direction {format(new Date(), "MMMM yyyy", { locale: fr })}</p>
      </div>

      {/* Current Month Resources */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">Ce mois-ci</h2>
          {currentRessources.length > 0 && (
            <Badge variant="outline" className="text-xs text-zinc-500">
              {lectures.filter(l => currentRessources.some(r => r.id === l.ressource_id)).length}/{currentRessources.length} lus
            </Badge>
          )}
        </div>
        {currentRessources.length === 0 ? (
          <Card className="border-zinc-200 bg-white">
            <CardContent className="py-12 text-center text-sm text-zinc-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-zinc-200" />
              Aucune ressource publiée pour ce mois
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentRessources.map((ressource) => {
              const Icon = TYPE_ICONS[ressource.type_ressource] || BookOpen;
              const read = isRead(ressource.id);
              const readRate = isResponsable ? getReadRate(ressource.id) : null;
              return (
                <Card key={ressource.id} className={cn("border transition-all", read ? "border-emerald-200 bg-emerald-50/20" : "border-zinc-200 bg-white")}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("p-2 rounded-lg border", TYPE_COLORS[ressource.type_ressource])}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">{ressource.titre}</p>
                          {ressource.description && <p className="text-xs text-zinc-400">{ressource.description}</p>}
                        </div>
                      </div>
                      {read && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                    </div>
                    {/* Read-Tracker for responsable */}
                    {isResponsable && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                            <Users className="w-3 h-3" /> Taux de lecture
                          </span>
                          <span className={cn("text-[10px] font-bold", readRate < 50 ? "text-red-600" : "text-emerald-600")}>
                            {readRate}%
                          </span>
                        </div>
                        <Progress value={readRate} className="h-1.5" />
                        {readRate < 50 && (
                          <p className="text-[10px] text-red-500 mt-1">⚠ Engagement faible — relance recommandée</p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {ressource.url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs h-7"
                          onClick={() => {
                            window.open(ressource.url, "_blank");
                            if (!read) markAsRead.mutate(ressource.id);
                          }}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ouvrir
                        </Button>
                      )}
                      {!read && !isResponsable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-xs h-7 text-emerald-600"
                          onClick={() => { markAsRead.mutate(ressource.id); toast.success("Marqué comme lu !"); }}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Marquer lu
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Months */}
      {pastRessources.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-3">Archives</h2>
          <div className="space-y-2">
            {pastRessources.map((ressource) => {
              const Icon = TYPE_ICONS[ressource.type_ressource] || BookOpen;
              const read = isRead(ressource.id);
              return (
                <div key={ressource.id} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50">
                  <div className={cn("p-1.5 rounded border text-xs", TYPE_COLORS[ressource.type_ressource])}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-700 truncate">{ressource.titre}</p>
                    <p className="text-[10px] text-zinc-400">{ressource.mois_cycle}</p>
                  </div>
                  {read && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {ressource.url && (
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => window.open(ressource.url, "_blank")}>
                      <ExternalLink className="w-3 h-3 text-zinc-400" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}