import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import ConversationList from "@/components/messaging/ConversationList";
import MessageBubble from "@/components/messaging/MessageBubble";
import MessageInput from "@/components/messaging/MessageInput";

export default function MessageriePage() {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const me = await base44.auth.me();
      setUser(me);
    };
    loadUser();
  }, []);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const p1 = await base44.entities.Conversation.filter({
        participant1_email: user.email,
      }, "-last_message_date");
      const p2 = await base44.entities.Conversation.filter({
        participant2_email: user.email,
      }, "-last_message_date");
      return [...p1, ...p2];
    },
    enabled: !!user?.email,
    refetchInterval: 5000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", selectedConversation?.id],
    queryFn: () =>
      selectedConversation
        ? base44.entities.Message.filter({
            conversation_id: selectedConversation.id,
          }, "created_date")
        : [],
    enabled: !!selectedConversation?.id,
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, fileUrls }) => {
      const message = await base44.entities.Message.create({
        conversation_id: selectedConversation.id,
        sender_email: user.email,
        sender_nom: user.full_name,
        recipient_email:
          selectedConversation.participant1_email === user.email
            ? selectedConversation.participant2_email
            : selectedConversation.participant1_email,
        content,
        file_urls: fileUrls,
        status: "delivered",
      });

      // Update conversation
      const updateData = {
        last_message_content: content,
        last_message_date: new Date().toISOString(),
        last_message_sender: user.email,
      };

      if (selectedConversation.participant1_email === user.email) {
        updateData.unread_count_p2 = (selectedConversation.unread_count_p2 || 0) + 1;
      } else {
        updateData.unread_count_p1 = (selectedConversation.unread_count_p1 || 0) + 1;
      }

      await base44.entities.Conversation.update(selectedConversation.id, updateData);

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const handleSelectConversation = async (conv) => {
    setSelectedConversation(conv);

    // Mark as read
    const updateData =
      conv.participant1_email === user.email
        ? { unread_count_p1: 0 }
        : { unread_count_p2: 0 };

    await base44.entities.Conversation.update(conv.id, updateData);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  if (!user) return <div>Chargement...</div>;

  return (
    <div className="min-h-screen bg-[#060810] pt-20">
      <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] flex gap-4 px-4">
        {/* Conversations List */}
        <div className="w-full md:w-80 rounded-xl ai-card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <h1 className="text-xl font-bold text-white">Messagerie</h1>
            </div>
          </div>
          <ConversationList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            currentUserEmail={user.email}
          />
        </div>

        {/* Messages View */}
        {selectedConversation ? (
          <div className="flex-1 rounded-xl ai-card overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">
                {selectedConversation.participant1_email === user.email
                  ? selectedConversation.participant2_nom
                  : selectedConversation.participant1_nom}
              </h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender_email === user.email}
                />
              ))}
            </div>

            {/* Input */}
            <MessageInput
              onSendMessage={(content, fileUrls) =>
                sendMessageMutation.mutate({ content, fileUrls })
              }
              isLoading={sendMessageMutation.isPending}
            />
          </div>
        ) : (
          <div className="flex-1 rounded-xl ai-card flex items-center justify-center">
            <div className="text-center text-zinc-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Sélectionnez une conversation pour commencer</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}