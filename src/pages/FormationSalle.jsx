import React, { useState, useEffect } from "react";
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

const TYPE_ICONS = { pdf: FileText, video: Video, lien: LinkIcon };
const TYPE_COLORS = {
  pdf: "bg-red-500/10 text-red-400 border-red-500/20",
  video: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  lien: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

const AXE_CONFIG = {
  connaissance: { label: "Connaissance", icon: Brain, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", desc: "Ce qu'il faut savoir" },
  intelligence: { label: "Intelligence", icon: Lightbulb, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", desc: "Ce qu'il faut comprendre" },
  croyance: { label: "Croyance", icon: Heart, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", desc: "Ce qu'il faut intégrer" },
};

const CURRENT_MONTH = format(new Date(), "yyyy-MM");

const GlassCard = ({ children, className = "" }) => (
  <div className={cn("rounded-2xl border border-white/[0.09] p-5", className)}
    style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.018) 100%)",
      backdropFilter: "blur(40px) saturate(1.7) brightness(1.05)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09), 0 8px 32px rgba(0,0,0,0.32)"
    }}>
    {children}
  </div>
);

const EMPTY_FORM = { titre: "", type_ressource: "pdf", url: "", mois_cycle: CURRENT_MONTH, description: "", axe: "connaissance" };

export default function FormationSallePage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });

  useEffect(() => {
    const u1 = base44.entities.FormationRessource.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["ressources", CURRENT_MONTH] });
      queryClient.invalidateQueries({ queryKey: ["ressources-all"] });
    });
    const u2 = base44.entities.FormationLecture.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["lectures"] });
      queryClient.invalidateQueries({ queryKey: ["all-lectures"] });
    });
    return () => { u1(); u2(); };
  }, [queryClient]);

  const { data: ressources = [] } = useQuery({
    queryKey: ["ressources", CURRENT_MONTH],
    queryFn: () => base44.entities.FormationRessource.filter({ mois_cycle: CURRENT_MONTH }),
  });
  const { data: allRessources = [] } = useQuery({ queryKey: ["ressources-all"], queryFn: () => base44.entities.FormationRessource.list() });
  const { data: lectures = [] } = useQuery({
    queryKey: ["lectures", user?.email],
    queryFn: () => user ? base44.entities.FormationLecture.filter({ pilote_email: user.email }) : Promise.resolve([]),
    enabled: !!user,
  });
  const { data: allLectures = [] } = useQuery({ queryKey: ["all-lectures"], queryFn: () => base44.entities.FormationLecture.list("-created_date", 500) });
  const { data: allPilotes = [] } = useQuery({ queryKey: ["all-pilotes"], queryFn: () => base44.entities.User.list() });

  const isResponsable = user?.role === "admin" || user?.role === "responsable_formation";

  const markAsRead = useMutation({
    mutationFn: async (ressourceId) => {
      const existing = lectures.find(l => l.ressource_id === ressourceId);
      if (existing) return;
      await base44.entities.FormationLecture.create({
        pilote_email: user.email, ressource_id: ressourceId, ouvert: true,
        date_ouverture: format(new Date(), "yyyy-MM-dd"),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lectures", user?.email] });
      queryClient.invalidateQueries({ queryKey: ["all-lectures"] });
    },
  });

  const addRessource = useMutation({
    mutationFn: (data) => base44.entities.FormationRessource.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ressources", CURRENT_MONTH] });
      queryClient.invalidateQueries({ queryKey: ["ressources-all"] });
      setShowAdd(false);
      setForm(EMPTY_FORM);
      toast.success("Ressource publiée !");
    },
  });

  const isRead = (id) => lectures.some(l => l.ressource_id === id);
  const getReadRate = (id) => {
    const count = allLectures.filter(l => l.ressource_id === id).length;
    const total = Math.max(allPilotes.filter(p => p.role !== "admin").length, 1);
    return Math.round((count / total) * 100);
  };

  const pastRessources = allRessources.filter(r => r.mois_cycle !== CURRENT_MONTH);
  const completedCount = lectures.filter(l => ressources.some(r => r.id === l.ressource_id)).length;

  // Group by axe
  const byAxe = Object.keys(AXE_CONFIG).reduce((acc, axe) => {
    acc[axe] = ressources.filter(r => (r.axe || "connaissance") === axe);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em] mb-1">Pôle Formation</p>
          <h1 className="text-2xl font-light text-white tracking-tight">Salle <span className="font-black">d'Étude</span></h1>
          <p className="text-sm text-zinc-500 mt-0.5 font-light">Direction du mois · {format(new Date(), "MMMM yyyy", { locale: fr })}</p>
        </div>
        <div className="flex items-center gap-3">
          {ressources.length > 0 && (
            <Badge className="bg-white/5 border-white/10 text-zinc-400 gap-1">
              <CheckCircle2 className="w-3 h-3" />{completedCount}/{ressources.length} ressources lues
            </Badge>
          )}
          {isResponsable && (
            <button onClick={() => setShowAdd(true)} className="btn-glow-blue flex items-center gap-2 px-4 py-2 h-9">
              <Plus className="w-4 h-4" /> Publier une ressource
            </button>
          )}
        </div>
      </motion.div>

      {/* Thème du mois — 3 axes */}
      {ressources.length > 0 ? (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Programme du mois — 3 Axes</p>
          {Object.entries(AXE_CONFIG).map(([axeKey, axe], axeIdx) => {
            const Icon = axe.icon;
            const items = byAxe[axeKey] || [];
            return (
              <motion.div key={axeKey} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: axeIdx * 0.08 }}>
                <GlassCard>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn("p-2 rounded-xl border", axe.bg)}>
                      <Icon className={cn("w-4 h-4", axe.color)} />
                    </div>
                    <div>
                      <p className={cn("text-sm font-bold", axe.color)}>{axe.label}</p>
                      <p className="text-[10px] text-zinc-500">{axe.desc}</p>
                    </div>
                    <Badge className="ml-auto bg-white/5 border-white/10 text-zinc-500 text-[10px]">{items.length} ressource(s)</Badge>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-xs text-zinc-600 py-4 text-center">Aucune ressource publiée pour cet axe</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map(ressource => {
                        const RIcon = TYPE_ICONS[ressource.type_ressource] || BookOpen;
                        const read = isRead(ressource.id);
                        const readRate = isResponsable ? getReadRate(ressource.id) : null;
                        return (
                          <div key={ressource.id}
                            className={cn("p-4 rounded-xl border transition-all",
                              read ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]"
                            )}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className={cn("p-1.5 rounded-lg border", TYPE_COLORS[ressource.type_ressource])}>
                                  <RIcon className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-zinc-200">{ressource.titre}</p>
                                  {ressource.description && <p className="text-[10px] text-zinc-500 mt-0.5">{ressource.description}</p>}
                                </div>
                              </div>
                              {read && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                            </div>

                            {isResponsable && readRate !== null && (
                              <div className="mb-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Users className="w-3 h-3" /> Taux de lecture</span>
                                  <span className={cn("text-[10px] font-bold", readRate < 50 ? "text-red-400" : "text-emerald-400")}>{readRate}%</span>
                                </div>
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div className={cn("h-full rounded-full", readRate < 50 ? "bg-red-500/60" : "bg-emerald-500/60")} style={{ width: `${readRate}%` }} />
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-2">
                              {ressource.url && (
                                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                  onClick={() => { window.open(ressource.url, "_blank"); if (!read) markAsRead.mutate(ressource.id); }}>
                                  <ExternalLink className="w-3 h-3" /> Ouvrir
                                </Button>
                              )}
                              {!read && !isResponsable && (
                                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10"
                                  onClick={() => { markAsRead.mutate(ressource.id); toast.success("Marqué comme lu !"); }}>
                                  <CheckCircle2 className="w-3 h-3" /> Marquer lu
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <GlassCard>
          <div className="py-16 text-center">
            <BookOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Aucune ressource publiée pour ce mois</p>
            {isResponsable && <p className="text-xs text-zinc-600 mt-1">Publiez la première ressource du mois →</p>}
          </div>
        </GlassCard>
      )}

      {/* Archives */}
      {pastRessources.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Archive className="w-4 h-4 text-zinc-500" />
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Archives</p>
          </div>
          <div className="space-y-2">
            {pastRessources.map(ressource => {
              const Icon = TYPE_ICONS[ressource.type_ressource] || BookOpen;
              const read = isRead(ressource.id);
              return (
                <div key={ressource.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.02] transition-all">
                  <div className={cn("p-1.5 rounded-lg border", TYPE_COLORS[ressource.type_ressource])}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-400 truncate">{ressource.titre}</p>
                    <p className="text-[10px] text-zinc-600">{ressource.mois_cycle}</p>
                  </div>
                  {read && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/50" />}
                  {ressource.url && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-600 hover:text-zinc-300" onClick={() => window.open(ressource.url, "_blank")}>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog ajout ressource */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-[#0f1117] border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-blue-400" /> Publier une ressource</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <p className="text-xs text-zinc-400 mb-1.5">Titre *</p>
              <Input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder="Titre de la ressource" className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-zinc-400 mb-1.5">Axe</p>
                <Select value={form.axe} onValueChange={v => setForm(f => ({ ...f, axe: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="connaissance">🧠 Connaissance</SelectItem>
                    <SelectItem value="intelligence">💡 Intelligence</SelectItem>
                    <SelectItem value="croyance">❤️ Croyance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1.5">Type</p>
                <Select value={form.type_ressource} onValueChange={v => setForm(f => ({ ...f, type_ressource: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">📄 PDF</SelectItem>
                    <SelectItem value="video">🎥 Vidéo</SelectItem>
                    <SelectItem value="lien">🔗 Lien</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-1.5">URL / Lien</p>
              <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-1.5">Description</p>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brève description..." className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-1.5">Mois du cycle</p>
              <Input type="month" value={form.mois_cycle} onChange={e => setForm(f => ({ ...f, mois_cycle: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-zinc-400 hover:text-white">Annuler</Button>
            <Button onClick={() => form.titre && addRessource.mutate(form)} disabled={addRessource.isPending} className="bg-blue-600 hover:bg-blue-500 text-white">
              Publier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}