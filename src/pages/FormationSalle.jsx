import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, FileText, Video, Link as LinkIcon, CheckCircle2, ExternalLink, Users, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTrackActivity } from "@/components/equipe/LiveActivityIndicator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EMPTY_RESSOURCE = { titre: "", type_ressource: "pdf", url: "", description: "", mois_cycle: format(new Date(), "yyyy-MM") };

const TYPE_CONFIG = {
  pdf:   { icon: FileText, color: "text-red-400 bg-red-500/10 border-red-500/20" },
  video: { icon: Video,    color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  lien:  { icon: LinkIcon, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
};

const CURRENT_MONTH = format(new Date(), "yyyy-MM");

export default function FormationSallePage() {
  useTrackActivity("FormationSalle");
  const qc = useQueryClient();

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isResponsable = user?.role === "admin" || user?.role === "responsable_formation";

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
  const { data: allLectures = [] } = useQuery({
    queryKey: ["all-lectures"],
    queryFn: () => base44.entities.FormationLecture.list("-created_date", 500),
    enabled: isResponsable,
  });
  const { data: allPilotes = [] } = useQuery({
    queryKey: ["all-pilotes"],
    queryFn: () => base44.entities.User.list(),
    enabled: isResponsable,
  });

  const markAsRead = useMutation({
    mutationFn: async (ressourceId) => {
      if (lectures.find(l => l.ressource_id === ressourceId)) return;
      return base44.entities.FormationLecture.create({ pilote_email: user.email, ressource_id: ressourceId, ouvert: true, date_ouverture: format(new Date(), "yyyy-MM-dd") });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lectures", user?.email] });
      qc.invalidateQueries({ queryKey: ["all-lectures"] });
    },
  });

  const isRead = (id) => lectures.some(l => l.ressource_id === id);
  const getReadRate = (id) => {
    const count = allLectures.filter(l => l.ressource_id === id).length;
    const total = Math.max(allPilotes.filter(p => p.role !== "admin").length, 1);
    return Math.round((count / total) * 100);
  };

  const [showForm, setShowForm] = useState(false);
  const [editingRessource, setEditingRessource] = useState(null);
  const [formData, setFormData] = useState(EMPTY_RESSOURCE);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setEditingRessource(null); setFormData(EMPTY_RESSOURCE); setShowForm(true); };
  const openEdit = (r) => { setEditingRessource(r); setFormData({ titre: r.titre, type_ressource: r.type_ressource, url: r.url || "", description: r.description || "", mois_cycle: r.mois_cycle }); setShowForm(true); };

  const handleSave = async () => {
    setSaving(true);
    if (editingRessource) {
      await base44.entities.FormationRessource.update(editingRessource.id, formData);
    } else {
      await base44.entities.FormationRessource.create(formData);
    }
    qc.invalidateQueries({ queryKey: ["ressources", CURRENT_MONTH] });
    qc.invalidateQueries({ queryKey: ["ressources-all"] });
    setSaving(false);
    setShowForm(false);
    toast.success(editingRessource ? "Ressource mise à jour" : "Ressource ajoutée");
  };

  const handleDelete = async () => {
    await base44.entities.FormationRessource.delete(deleteTarget.id);
    qc.invalidateQueries({ queryKey: ["ressources", CURRENT_MONTH] });
    qc.invalidateQueries({ queryKey: ["ressources-all"] });
    setDeleteTarget(null);
    toast.success("Ressource supprimée");
  };

  const current = ressources;
  const past = allRessources.filter(r => r.mois_cycle !== CURRENT_MONTH);
  const readCount = lectures.filter(l => current.some(r => r.id === l.ressource_id)).length;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#060810]/80 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-bold text-white">Salle d'Étude</h1>
          <p className="text-xs text-zinc-600">Direction {format(new Date(), "MMMM yyyy", { locale: fr })} · Ressources du mois</p>
        </div>
        <div className="flex items-center gap-3">
          {current.length > 0 && !isResponsable && (
            <span className={cn("text-xs border rounded-full px-3 py-1",
              readCount === current.length ? "text-emerald-400 border-emerald-500/30 bg-emerald-900/20" : "text-zinc-500 border-white/10")}>
              {readCount}/{current.length} lus
            </span>
          )}
          {isResponsable && (
            <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-8 text-xs px-3">
              <Plus className="w-3.5 h-3.5" /> Ajouter une ressource
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Current month */}
        <div>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Ce mois-ci</h2>
          {current.length === 0 ? (
            <div className="ai-card rounded-xl border border-white/5 p-10 flex flex-col items-center gap-3">
              <BookOpen className="w-8 h-8 text-zinc-700" />
              <p className="text-sm text-zinc-600">Aucune ressource publiée pour ce mois</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {current.map(r => {
                const cfg = TYPE_CONFIG[r.type_ressource] || TYPE_CONFIG.lien;
                const Icon = cfg.icon;
                const read = isRead(r.id);
                const rate = isResponsable ? getReadRate(r.id) : null;
                return (
                  <div key={r.id} className={cn("ai-card rounded-xl border p-4 space-y-3 transition-all",
                    read ? "border-emerald-500/20 bg-emerald-900/10" : "border-white/8")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-xl border", cfg.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{r.titre}</p>
                          {r.description && <p className="text-xs text-zinc-500 mt-0.5">{r.description}</p>}
                        </div>
                      </div>
                      {read && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    </div>

                    {isResponsable && rate !== null && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-zinc-600 flex items-center gap-1"><Users className="w-3 h-3" /> Taux de lecture</span>
                          <span className={cn("text-[10px] font-bold", rate < 50 ? "text-red-400" : "text-emerald-400")}>{rate}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", rate < 50 ? "bg-red-500" : "bg-emerald-500")} style={{ width: `${rate}%` }} />
                        </div>
                        {rate < 50 && <p className="text-[10px] text-red-400 mt-1">⚠ Engagement faible — relance recommandée</p>}
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {r.url && (
                        <button onClick={() => { window.open(r.url, "_blank"); if (!read && !isResponsable) markAsRead.mutate(r.id); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-zinc-300 hover:bg-white/10 transition-all">
                          <ExternalLink className="w-3 h-3" /> Ouvrir
                        </button>
                      )}
                      {!read && !isResponsable && (
                        <button onClick={() => { markAsRead.mutate(r.id); toast.success("Marqué comme lu !"); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/20 text-xs text-emerald-400 hover:bg-emerald-900/20 transition-all">
                          <CheckCircle2 className="w-3 h-3" /> Marquer lu
                        </button>
                      )}
                      {isResponsable && (
                        <>
                          <button onClick={() => openEdit(r)} className="flex items-center gap-1 px-2 py-1.5 rounded-xl border border-white/10 text-xs text-zinc-400 hover:bg-white/10 transition-all">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => setDeleteTarget(r)} className="flex items-center gap-1 px-2 py-1.5 rounded-xl border border-red-500/20 text-xs text-red-400 hover:bg-red-900/20 transition-all">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Archives */}
        {past.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-3">Archives</h2>
            <div className="space-y-2">
              {past.map(r => {
                const cfg = TYPE_CONFIG[r.type_ressource] || TYPE_CONFIG.lien;
                const Icon = cfg.icon;
                const read = isRead(r.id);
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/2 hover:bg-white/4 transition-colors">
                    <div className={cn("p-1.5 rounded-lg border", cfg.color)}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-400 truncate">{r.titre}</p>
                      <p className="text-[10px] text-zinc-600">{r.mois_cycle}</p>
                    </div>
                    {read && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60 flex-shrink-0" />}
                    {r.url && (
                      <button onClick={() => window.open(r.url, "_blank")} className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}