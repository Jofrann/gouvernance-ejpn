import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Archive, Briefcase, Calendar, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

const CURRENT_MONTH = format(new Date(), "yyyy-MM");

export default function CommunicationDirectivesPage() {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ titre: "", contenu: "", campagne_tag: "" });
  const [saving, setSaving] = useState(false);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isResponsable = user?.role === "admin" || user?.role === "responsable_communication";

  const { data: directives = [] } = useQuery({
    queryKey: ["directives"],
    queryFn: () => base44.entities.DirectivesCom.list("-created_date", 100),
  });

  const active = directives.filter((d) => d.statut === "active");
  const archived = directives.filter((d) => d.statut === "archivee");

  const handleCreate = async () => {
    if (!form.titre || !form.contenu) { toast.error("Titre et contenu requis"); return; }
    setSaving(true);
    await base44.entities.DirectivesCom.create({ ...form, auteur_email: user?.email, mois_cycle: CURRENT_MONTH, statut: "active" });
    queryClient.invalidateQueries({ queryKey: ["directives"] });
    toast.success("Directive publiée !");
    setForm({ titre: "", contenu: "", campagne_tag: "" });
    setShowNew(false);
    setSaving(false);
  };

  const handleArchive = async (id) => {
    await base44.entities.DirectivesCom.update(id, { statut: "archivee" });
    queryClient.invalidateQueries({ queryKey: ["directives"] });
    toast.success("Directive archivée");
  };

  return (
    <div className="px-6 py-10 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-[0.25em] mb-1">Communication</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Directives Board</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Briefs créatifs · Coffre-Fort des Stratégies</p>
        </div>
        {isResponsable && (
          <button className="btn-glow-blue flex items-center gap-2 px-4 py-2.5" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4" /> Nouvelle Directive
          </button>
        )}
      </div>

      {/* Active directives */}
      <div>
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Directives Actives</h2>
        {active.length === 0 ? (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] py-12 text-center text-sm text-zinc-600">
            <Briefcase className="w-8 h-8 mx-auto mb-2 text-zinc-700" />Aucune directive active
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((d) => (
              <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14] transition-all p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-sm font-bold text-white">{d.titre}</h3>
                      {d.campagne_tag && <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-400">{d.campagne_tag}</Badge>}
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{d.contenu}</p>
                    <p className="text-[10px] text-zinc-600 mt-2 flex items-center gap-1"><Calendar className="w-3 h-3" />{d.mois_cycle}</p>
                  </div>
                  {isResponsable && (
                    <button className="p-1.5 rounded hover:bg-white/10 transition-all text-zinc-600 hover:text-zinc-400" onClick={() => handleArchive(d.id)}>
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Coffre-Fort Archives */}
      {archived.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-zinc-500" />
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Coffre-Fort des Stratégies</h2>
            <Badge variant="outline" className="text-xs text-zinc-600 border-white/10">{archived.length} archivées</Badge>
          </div>
          <div className="space-y-2">
            {archived.map((d) => (
              <div key={d.id} className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.01]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-400">{d.titre}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">{d.mois_cycle}{d.campagne_tag ? ` · ${d.campagne_tag}` : ""}</p>
                    <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed line-clamp-2">{d.contenu}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Directive Sheet */}
      <Sheet open={showNew} onOpenChange={setShowNew}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-[#0d1018] border-white/10 text-white">
          <SheetHeader className="pb-4 border-b border-white/10"><SheetTitle className="text-white">Nouvelle Directive</SheetTitle></SheetHeader>
          <div className="py-5 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 font-medium">Titre *</label>
              <input className="input-glass mt-1" placeholder="Ex: Direction Créative — Mars 2026" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium">Tag Campagne</label>
              <input className="input-glass mt-1" placeholder="Ex: Campagne Vidéo Mars" value={form.campagne_tag} onChange={(e) => setForm({ ...form, campagne_tag: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium">Contenu de la Directive *</label>
              <textarea className="input-glass mt-1 h-48 resize-none" placeholder="Décrivez la direction créative, le brief, les objectifs visuels..." value={form.contenu} onChange={(e) => setForm({ ...form, contenu: e.target.value })} />
            </div>
            <button className="btn-glow-blue w-full py-2.5" disabled={saving} onClick={handleCreate}>
              {saving ? "Publication..." : "Publier la Directive"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}