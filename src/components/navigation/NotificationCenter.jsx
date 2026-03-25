import React, { useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, MessageSquare, FileCheck, BookOpen, AlertTriangle, Megaphone, UserPlus, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, differenceInDays, startOfWeek, setDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

function getThisThursday() {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return setDay(start, 4, { weekStartsOn: 1 });
}

function useRealNotifications(user) {
  const email = user?.email;
  const queryClient = useQueryClient();

  // ── Subscriptions temps réel ────────────────────────────────────────────
  useEffect(() => {
    if (!email) return;
    const u1 = base44.entities.Message.subscribe(() => queryClient.invalidateQueries({ queryKey: ["notif-messages", email] }));
    const u2 = base44.entities.FormationLivrable.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["notif-livrables", email] });
      queryClient.invalidateQueries({ queryKey: ["notif-livrables-rejetes", email] });
    });
    const u3 = base44.entities.Decret.subscribe(() => queryClient.invalidateQueries({ queryKey: ["notif-decrets"] }));
    const u4 = base44.entities.Recommandation.subscribe(() => queryClient.invalidateQueries({ queryKey: ["notif-recos", email] }));
    const u5 = base44.entities.ContactEvang.subscribe(() => queryClient.invalidateQueries({ queryKey: ["notif-contacts-fi", email] }));
    const u6 = base44.entities.CliniqueSaisie.subscribe(() => queryClient.invalidateQueries({ queryKey: ["notif-clinique", email] }));
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, [email, queryClient]);

  // ── Données ─────────────────────────────────────────────────────────────
  const { data: messages = [] } = useQuery({
    queryKey: ["notif-messages", email],
    queryFn: () => base44.entities.Message.filter({ recipient_email: email, read: false }, "-created_date", 10),
    enabled: !!email,
  });

  const { data: livrables = [] } = useQuery({
    queryKey: ["notif-livrables", email],
    queryFn: () => base44.entities.FormationLivrable.filter({ pilote_email: email, statut: "valide" }, "-updated_date", 5),
    enabled: !!email,
  });

  const { data: livrablesRejetes = [] } = useQuery({
    queryKey: ["notif-livrables-rejetes", email],
    queryFn: () => base44.entities.FormationLivrable.filter({ pilote_email: email, statut: "rejete" }, "-updated_date", 5),
    enabled: !!email,
  });

  const { data: decrets = [] } = useQuery({
    queryKey: ["notif-decrets"],
    queryFn: () => base44.entities.Decret.filter({ statut: "publie" }, "-updated_date", 5),
    enabled: !!email,
  });

  const { data: recommandations = [] } = useQuery({
    queryKey: ["notif-recos", email],
    queryFn: () => base44.entities.Recommandation.filter({ auteur_email: email, statut: "approuvee" }, "-updated_date", 5),
    enabled: !!email,
  });

  // FI du pilote
  const { data: myFamilles = [] } = useQuery({
    queryKey: ["notif-my-fi", email],
    queryFn: () => base44.entities.FamilleImpact.filter({ pilote_email: email }),
    enabled: !!email,
  });
  const { data: myFamillesCo = [] } = useQuery({
    queryKey: ["notif-my-fi-co", email],
    queryFn: () => base44.entities.FamilleImpact.filter({ co_pilote_email: email }),
    enabled: !!email,
  });

  const myFIIds = useMemo(() => {
    const ids = new Set([...myFamilles.map(f => f.id), ...myFamillesCo.map(f => f.id)]);
    return [...ids];
  }, [myFamilles, myFamillesCo]);

  // Nouveaux contacts liés aux sorties de ma FI (dernières 48h)
  const { data: recentContacts = [] } = useQuery({
    queryKey: ["notif-contacts-fi", email],
    queryFn: async () => {
      if (!myFIIds.length) return [];
      const actions = await base44.entities.ActionEvangelisation.filter({});
      const myActionIds = new Set(
        actions.filter(a => a.fi_assignees?.some(id => myFIIds.includes(id))).map(a => a.id)
      );
      if (!myActionIds.size) return [];
      const contacts = await base44.entities.ContactEvang.list("-created_date", 50);
      const cutoff = Date.now() - 48 * 3600 * 1000;
      return contacts.filter(c => myActionIds.has(c.action_id) && new Date(c.created_date).getTime() > cutoff);
    },
    enabled: !!email && myFIIds.length > 0,
  });

  // Saisies cliniques en retard (semaine en cours, ma FI, manquantes)
  const { data: cliniqueSaisies = [] } = useQuery({
    queryKey: ["notif-clinique", email],
    queryFn: async () => {
      if (!myFIIds.length) return [];
      const thursday = getThisThursday();
      const semaineStr = thursday.toISOString().split("T")[0];
      const now = new Date();
      // Seulement si on est après le jeudi (retard)
      if (now < thursday) return [];
      const saisies = [];
      for (const fiId of myFIIds) {
        const membres = await base44.entities.Membre.filter({ famille_impact_id: fiId });
        const existing = await base44.entities.CliniqueSaisie.filter({ famille_impact_id: fiId, semaine: semaineStr });
        const missing = membres.filter(m => !existing.some(s => s.membre_id === m.id));
        if (missing.length > 0) {
          saisies.push({ fiId, fiName: myFamilles.find(f => f.id === fiId)?.name || myFamillesCo.find(f => f.id === fiId)?.name || "FI", missing: missing.length, semaine: semaineStr });
        }
      }
      return saisies;
    },
    enabled: !!email && myFIIds.length > 0,
  });

  const notifications = useMemo(() => {
    const now = Date.now();
    const RECENT = 7 * 24 * 60 * 60 * 1000;
    const items = [];

    messages.forEach(m => {
      const date = new Date(m.created_date);
      if (now - date.getTime() < RECENT) {
        items.push({
          id: `msg-${m.id}`,
          title: "Nouveau message",
          desc: m.sender_nom ? `${m.sender_nom} : ${m.content?.slice(0, 60)}` : m.content?.slice(0, 60),
          time: date,
          dot: "bg-blue-400",
          icon: MessageSquare,
          page: "Messagerie",
        });
      }
    });

    livrables.forEach(l => {
      const date = new Date(l.updated_date || l.date_correction);
      if (now - date.getTime() < RECENT) {
        items.push({
          id: `livrable-ok-${l.id}`,
          title: "Livrable validé ✓",
          desc: l.titre_livrable || "Votre livrable a été validé",
          time: date,
          dot: "bg-emerald-400",
          icon: FileCheck,
          page: "FormationBulletin",
        });
      }
    });

    livrablesRejetes.forEach(l => {
      const date = new Date(l.updated_date || l.date_correction);
      if (now - date.getTime() < RECENT) {
        items.push({
          id: `livrable-ko-${l.id}`,
          title: "Livrable à revoir",
          desc: l.titre_livrable || "Votre livrable nécessite des corrections",
          time: date,
          dot: "bg-red-400",
          icon: BookOpen,
          page: "FormationLabo",
        });
      }
    });

    decrets.forEach(d => {
      const date = new Date(d.updated_date);
      if (now - date.getTime() < RECENT) {
        items.push({
          id: `decret-${d.id}`,
          title: "Nouveau décret publié",
          desc: d.titre,
          time: date,
          dot: "bg-amber-400",
          icon: Megaphone,
          page: "TroneArchives",
        });
      }
    });

    recommandations.forEach(r => {
      const date = new Date(r.updated_date || r.date_decision);
      if (now - date.getTime() < RECENT) {
        items.push({
          id: `reco-${r.id}`,
          title: "Recommandation approuvée ✓",
          desc: r.titre,
          time: date,
          dot: "bg-violet-400",
          icon: FileCheck,
          page: "GouvRedaction",
        });
      }
    });

    // 🆕 Nouveaux contacts dans ma FI
    recentContacts.forEach(c => {
      const date = new Date(c.created_date);
      items.push({
        id: `contact-${c.id}`,
        title: "Nouveau contact dans ta FI",
        desc: `${c.prenom}${c.nom ? " " + c.nom : ""} a été ajouté comme contact`,
        time: date,
        dot: "bg-cyan-400",
        icon: UserPlus,
        page: "EvangelisationSuivi",
      });
    });

    // 🆕 Saisies cliniques en retard
    cliniqueSaisies.forEach(s => {
      items.push({
        id: `clinique-retard-${s.fiId}`,
        title: "⚠ Saisie clinique en retard",
        desc: `${s.missing} membre(s) de ${s.fiName} non saisi(s) pour la semaine du ${s.semaine}`,
        time: new Date(),
        dot: "bg-orange-400",
        icon: Clock,
        page: "FIHub",
        urgent: true,
      });
    });

    return items.sort((a, b) => {
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      return b.time - a.time;
    }).slice(0, 25);
  }, [messages, livrables, livrablesRejetes, decrets, recommandations, recentContacts, cliniqueSaisies]);

  return notifications;
}

export default function NotificationCenter({ user, open, onClose }) {
  const navigate = useNavigate();
  const notifications = useRealNotifications(user);
  const unreadCount = notifications.length;

  const handleClick = (page) => {
    navigate(createPageUrl(page));
    onClose();
  };

  return (
    <>
      {/* Badge */}
      <div className="relative">
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-80 rounded-xl border border-white/10 bg-[#0f1117]/98 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-xs font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] text-zinc-500">{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</span>
              )}
            </div>
            <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs text-zinc-600">Aucune notification récente</p>
                </div>
              ) : (
                notifications.map(n => {
                  const Icon = n.icon;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n.page)}
                      className={cn(
                        "w-full flex gap-3 px-4 py-3 transition-colors text-left",
                        n.urgent
                          ? "bg-orange-500/[0.06] hover:bg-orange-500/[0.10] border-l-2 border-orange-500/50"
                          : "hover:bg-white/5"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-2", n.dot)} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-semibold", n.urgent ? "text-orange-300" : "text-white")}>{n.title}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed line-clamp-2">{n.desc}</p>
                        <p className="text-[10px] text-zinc-700 mt-1">
                          {n.urgent ? "Maintenant" : formatDistanceToNow(n.time, { locale: fr, addSuffix: true })}
                        </p>
                      </div>
                      <Icon className={cn("w-3.5 h-3.5 flex-shrink-0 mt-1", n.urgent ? "text-orange-400" : "text-zinc-600")} />
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function useNotifCount(user) {
  const email = user?.email;
  const { data: messages = [] } = useQuery({
    queryKey: ["notif-count-messages", email],
    queryFn: () => base44.entities.Message.filter({ recipient_email: email, read: false }, "-created_date", 20),
    enabled: !!email,
    refetchInterval: 15000,
  });
  return messages.length;
}