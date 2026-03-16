import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, MessageSquare, FileCheck, BookOpen, AlertTriangle, Megaphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

function useRealNotifications(user) {
  const email = user?.email;

  const { data: messages = [] } = useQuery({
    queryKey: ["notif-messages", email],
    queryFn: () => base44.entities.Message.filter({ recipient_email: email, read: false }, "-created_date", 10),
    enabled: !!email,
    refetchInterval: 15000,
  });

  const { data: livrables = [] } = useQuery({
    queryKey: ["notif-livrables", email],
    queryFn: () => base44.entities.FormationLivrable.filter({ pilote_email: email, statut: "valide" }, "-updated_date", 5),
    enabled: !!email,
    refetchInterval: 30000,
  });

  const { data: livrablesRejetes = [] } = useQuery({
    queryKey: ["notif-livrables-rejetes", email],
    queryFn: () => base44.entities.FormationLivrable.filter({ pilote_email: email, statut: "rejete" }, "-updated_date", 5),
    enabled: !!email,
    refetchInterval: 30000,
  });

  const { data: decrets = [] } = useQuery({
    queryKey: ["notif-decrets"],
    queryFn: () => base44.entities.Decret.filter({ statut: "publie" }, "-updated_date", 5),
    enabled: !!email,
    refetchInterval: 60000,
  });

  const { data: recommandations = [] } = useQuery({
    queryKey: ["notif-recos", email],
    queryFn: () => base44.entities.Recommandation.filter({ auteur_email: email, statut: "approuvee" }, "-updated_date", 5),
    enabled: !!email,
    refetchInterval: 30000,
  });

  const notifications = useMemo(() => {
    const now = Date.now();
    const RECENT = 7 * 24 * 60 * 60 * 1000; // 7 jours

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
          read: false,
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
          read: false,
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
          read: false,
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
          read: false,
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
          read: false,
        });
      }
    });

    // Sort by date desc
    return items.sort((a, b) => b.time - a.time).slice(0, 20);
  }, [messages, livrables, livrablesRejetes, decrets, recommandations]);

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
            <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
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
                      className="w-full flex gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-2", n.dot)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white">{n.title}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed line-clamp-2">{n.desc}</p>
                        <p className="text-[10px] text-zinc-700 mt-1">
                          {formatDistanceToNow(n.time, { locale: fr, addSuffix: true })}
                        </p>
                      </div>
                      <Icon className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0 mt-1" />
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