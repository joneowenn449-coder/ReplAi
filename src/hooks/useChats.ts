import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActiveCabinet } from "./useCabinets";
import { apiRequest } from "@/lib/api";

export interface Chat {
  id: string;
  chat_id: string;
  reply_sign: string | null;
  client_name: string;
  product_nm_id: number | null;
  product_name: string;
  last_message_text: string | null;
  last_message_at: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  cabinet_id: string | null;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  event_id: string;
  sender: "client" | "seller";
  text: string | null;
  attachments: Array<{ type: string; id: string; name?: string }>;
  sent_at: string;
  created_at: string;
}

export function useChats() {
  const { data: activeCabinet } = useActiveCabinet();
  const cabinetId = activeCabinet?.id;

  return useQuery({
    queryKey: ["chats", cabinetId],
    queryFn: async () => {
      return apiRequest(`/api/chats?cabinet_id=${cabinetId}`) as Promise<Chat[]>;
    },
    enabled: !!cabinetId,
    refetchInterval: 30_000,
  });
}

export function useChatMessages(chatId: string | null) {
  return useQuery({
    queryKey: ["chat_messages", chatId],
    queryFn: async () => {
      if (!chatId) return [];
      const messages = await apiRequest(`/api/chat-messages?chat_id=${chatId}`) as ChatMessage[];
      return messages.filter((msg, index, arr) => {
        if (index === 0) return true;
        return !arr.slice(0, index).some(
          (prev) =>
            prev.sender === msg.sender &&
            prev.text === msg.text &&
            prev.text !== null &&
            Math.abs(new Date(prev.sent_at).getTime() - new Date(msg.sent_at).getTime()) < 120000
        );
      });
    },
    enabled: !!chatId,
    refetchInterval: 10_000,
  });
}

export function useSyncChats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiRequest("/api/functions/sync-chats", { method: "POST" });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.invalidateQueries({ queryKey: ["chat_messages"] });
      queryClient.invalidateQueries({ queryKey: ["wb_cabinets"] });
      const chats = data?.chats || 0;
      const messages = data?.messages || 0;
      toast.success(`Синхронизировано: ${chats} чатов, ${messages} сообщений`);
    },
    onError: (error) => {
      toast.error(`Ошибка синхронизации чатов: ${error.message}`);
    },
  });
}

export function useMarkChatRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (chatId: string) => {
      return apiRequest(`/api/chats/${chatId}/read`, { method: "PATCH" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chatId,
      message,
    }: {
      chatId: string;
      message: string;
    }) => {
      return apiRequest("/api/functions/send-chat-message", {
        method: "POST",
        body: JSON.stringify({ chat_id: chatId, message }),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chat_messages", variables.chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      toast.success("Сообщение отправлено");
    },
    onError: (error) => {
      toast.error(`Ошибка отправки: ${error.message}`);
    },
  });
}
