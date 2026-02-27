import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Mail, Clock, FileText, ArrowRightLeft, Plus, X, CheckCircle, Send } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import LiveActivityIndicator from "./LiveActivityIndicator";

const ROLE_LABELS = {
  admin: "Administrateur", responsable_general: "Responsable Général",
  directrice_execution: "Directrice d'Exécution", responsable_suivi: "Responsable de Suivi",
  analyste_strategique: "Analyste Stratégique", responsable_fi: "Responsable FI",
  pilote_fi: "Pilote FI", copilote_fi: "Co-Pilote FI", responsable_formation: "Resp. Formation",
  etudiant: "Pilote en Formation", responsable_evangelisation: "Resp. Évangélisation",
  agent_terrain: "Agent Terrain", agent_virtuel: "Agent Virtuel",
  responsable_communication: "Resp. Communication", producteur: "Producteur",
  createur: "Créateur de Contenu",
};

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
        active ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

export default function MemberSlideOver({ member, currentUser, open, onClose, allUsers }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState("audit");
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [showDelegForm, setShowDelegForm] = useState(false);
  const [delegForm, setDelegForm] = useState({ delegataire_email: "", raison: "", date_debut: "", date_fin: "" });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit-logs", member?.email],
    queryFn: () => base44.entities.AuditLog.filter({ user_email: member.email }, "-created_date", 30),
    enabled: !!member?.email && open,
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ["reco-member", member?.email],
    queryFn: () => base44.entities.Recommandation.filter({ auteur_email: member.email }, "-created_date", 10),
    enabled: !!member?.email && open,
  });

  const { data: delegations = [] } = useQuery({
    queryKey: ["delegations", member?.email],
    queryFn: () => base44.entities.Delegation.filter({ delegant_email: member.email }, "-created_date", 10),
    enabled: !!member?.email && open,
  });

  const createDelegation = useMutation({
    mutationFn: (d) => base44.entities.Delegation.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["delegations"] }); setShowDelegForm(false); },
  });

  const deleteDelegation = useMutation({
    mutationFn: (id) => base44.entities.Delegation.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["delegations"] }),
  });

  const sendMessage = useMutation({
    mutationFn: async (content) => {
      const p1 = currentUser.email;
      const p2 = member.email;
      const sortedEmails = [p1, p2].sort();
      const convId = `${sortedEmails[0]}-${sortedEmails[1]}`;
      
      let conv = await base44.entities.Conversation.filter({
        participant1_email: sortedEmails[0],
        participant2_email: sortedEmails[1],
      });

      if (conv.length === 0) {
        conv = await base44.entities.Conversation.create({
          participant1_email: sortedEmails[0],
          participant1_nom: currentUser.full_name,
          participant2_email: sortedEmails[1],
          participant2_nom: member.full_name,
          last_message_content: content,
          last_message_date: new Date().toISOString(),
          last_message_sender: currentUser.email,
          unread_count_p1: p1 === sortedEmails[0] ? 0 : 1,
          unread_count_p2: p1 === sortedEmails[1] ? 0 : 1,
        });
      } else {
        const c = conv[0];
        const updateData = {
          last_message_content: content,
          last_message_date: new Date().toISOString(),
          last_message_sender: currentUser.email,
        };
        if (c.participant1_email === currentUser.email) {
          updateData.unread_count_p2 = (c.unread_count_p2 || 0) + 1;
        } else {
          updateData.unread_count_p1 = (c.unread_count_p1 || 0) + 1;
        }
        await base44.entities.Conversation.update(c.id, updateData);
        conv[0] = { ...c, ...updateData };
      }

      await base44.entities.Message.create({
        conversation_id: conv[0].id,
        sender_email: currentUser.email,
        sender_nom: currentUser.full_name,
        recipient_email: member.email,
        content,
        status: "delivered",
      });
    },
    onSuccess: () => {
      setShowMessageForm(false);
      setMessageContent("");
    },
  });

  const isSelf = currentUser?.email === member?.email;
  const isAdmin = currentUser?.role === "admin";
  const canDelegate = isSelf || isAdmin;

  const initials = member?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const STATUS_LABELS = { brouillon: "Brouillon", soumise: "Soumise", approuvee: "Approuvée", rejetee: "Rejetée" };
  const STATUS_COLORS = { brouillon: "text-zinc-500", soumise: "text-blue-400", approuvee: "text-emerald-400", rejetee: "text-red-400" };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg bg-[#0d1018] border-l border-white/10 overflow-y-auto p-0">
        <div className="p-6 border-b border-white/10">
          {/* Profile */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{member?.full_name}</h2>
              <p className="text-sm text-blue-400">{ROLE_LABELS[member?.role] || member?.role}</p>
              <LiveActivityIndicator activity={member?.current_activity} lastSeen={member?.last_seen} />
            </div>
          </div>
          <a href={`mailto:${member?.email}`} className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            <Mail className="w-3 h-3" />
            {member?.email}
          </a>
        </div>

        {/* Quick Message Button */}
         {currentUser?.email !== member?.email && !showMessageForm && (
           <button
             onClick={() => setShowMessageForm(true)}
             className="mx-4 mt-4 w-[calc(100%-2rem)] flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs text-white font-medium transition-all"
           >
             <Send className="w-3 h-3" />
             Envoyer un message
           </button>
         )}

        {/* Message Form */}
         {showMessageForm && (
           <div className="px-4 pt-3 pb-4 bg-white/5 border-b border-white/10">
             <textarea
               value={messageContent}
               onChange={(e) => setMessageContent(e.target.value)}
               placeholder="Votre message..."
               className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none resize-none h-20"
             />
             <div className="flex gap-2 mt-2">
               <button
                 onClick={() => setShowMessageForm(false)}
                 className="flex-1 py-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
               >
                 Annuler
               </button>
               <button
                 onClick={() => sendMessage.mutate(messageContent)}
                 disabled={!messageContent.trim() || sendMessage.isPending}
                 className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs text-white font-medium disabled:opacity-50 transition-all"
               >
                 {sendMessage.isPending ? "Envoi..." : "Envoyer"}
               </button>
             </div>
           </div>
         )}

        {/* Tabs */}
         <div className="flex gap-1 p-4 border-b border-white/5">
           <TabButton active={tab === "audit"} onClick={() => setTab("audit")}>Historique</TabButton>
           <TabButton active={tab === "dossiers"} onClick={() => setTab("dossiers")}>Dossiers</TabButton>
           <TabButton active={tab === "delegations"} onClick={() => setTab("delegations")}>Délégations</TabButton>
         </div>

        <div className="p-4 space-y-3">
          {/* Audit Log */}
          {tab === "audit" && (
            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center py-8">Aucune action enregistrée.</p>
              ) : auditLogs.map(log => (
                <div key={log.id} className="flex gap-3 py-2 border-b border-white/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-zinc-300">{log.action}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {log.created_date ? format(new Date(log.created_date), "d MMM à HH:mm", { locale: fr }) : "—"}
                      {log.page && ` · ${log.page}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dossiers (Recommandations) */}
          {tab === "dossiers" && (
            <div className="space-y-2">
              {recommendations.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center py-8">Aucun dossier en cours.</p>
              ) : recommendations.map(reco => (
                <div key={reco.id} className="ai-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-white font-medium">{reco.titre}</p>
                    <span className={`text-[10px] font-semibold ${STATUS_COLORS[reco.statut]}`}>{STATUS_LABELS[reco.statut]}</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-1">{reco.pole_concerne}</p>
                </div>
              ))}
            </div>
          )}

          {/* Delegations */}
          {tab === "delegations" && (
            <div className="space-y-3">
              {delegations.length === 0 && !showDelegForm && (
                <p className="text-xs text-zinc-600 text-center py-4">Aucune délégation active.</p>
              )}
              {delegations.map(d => (
                <div key={d.id} className="ai-card p-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-white">Délégué à <span className="text-blue-400">{d.delegataire_email}</span></p>
                    {d.raison && <p className="text-[10px] text-zinc-500 mt-0.5">{d.raison}</p>}
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {d.date_debut} → {d.date_fin}
                    </p>
                  </div>
                  {canDelegate && (
                    <button onClick={() => deleteDelegation.mutate(d.id)} className="text-zinc-700 hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {canDelegate && !showDelegForm && (
                <button
                  onClick={() => setShowDelegForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-white/10 text-xs text-zinc-600 hover:text-zinc-400 hover:border-white/20 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  Ajouter une délégation
                </button>
              )}

              {showDelegForm && (
                <div className="ai-card p-4 space-y-3">
                  <select
                    value={delegForm.delegataire_email}
                    onChange={e => setDelegForm({ ...delegForm, delegataire_email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="">Déléguer à...</option>
                    {(allUsers || []).filter(u => u.email !== member?.email).map(u => (
                      <option key={u.id} value={u.email}>{u.full_name} ({u.email})</option>
                    ))}
                  </select>
                  <input
                    placeholder="Raison (ex: déplacement)"
                    value={delegForm.raison}
                    onChange={e => setDelegForm({ ...delegForm, raison: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-600"
                  />
                  <div className="flex gap-2">
                    <input type="date" value={delegForm.date_debut} onChange={e => setDelegForm({ ...delegForm, date_debut: e.target.value })}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none" />
                    <input type="date" value={delegForm.date_fin} onChange={e => setDelegForm({ ...delegForm, date_fin: e.target.value })}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowDelegForm(false)} className="flex-1 py-2 text-xs text-zinc-500 hover:text-white transition-colors">Annuler</button>
                    <button
                      onClick={() => createDelegation.mutate({
                        ...delegForm,
                        delegant_email: member.email,
                        delegant_nom: member.full_name,
                        delegataire_nom: allUsers?.find(u => u.email === delegForm.delegataire_email)?.full_name || "",
                        active: true,
                      })}
                      disabled={!delegForm.delegataire_email || !delegForm.date_debut || !delegForm.date_fin}
                      className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium disabled:opacity-50 transition-all"
                    >
                      Confirmer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}