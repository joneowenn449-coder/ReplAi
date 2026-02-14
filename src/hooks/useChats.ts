import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useActiveCabinet } from "./useCabinets";

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
  const queryClient = useQueryClient();
  const { data: activeCabinet } = useActiveCabinet();
  const cabinetId = activeCabinet?.id;

  useEffect(() => {
    const channel = supabase
      .channel("chats-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["chats", cabinetId],
    queryFn: async () => {
      let query = supabase
        .from("chats")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (cabinetId) {
        query = query.eq("cabinet_id", cabinetId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as Chat[]) || [];
    },
    enabled: !!cabinetId,
    refetchInterval: 30_000,
  });
}

export function useChatMessages(chatId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat-messages-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat_messages", chatId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);

  return useQuery({
    queryKey: ["chat_messages", chatId],
    queryFn: async () => {
      if (!chatId) return [];
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("sent_at", { ascending: true });
      if (error) throw error;
      const messages = (data as unknown as ChatMessage[]) || [];
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
  });
}

export function useSyncChats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-chats");
      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from("chats")
        .update({ is_read: true })
        .eq("chat_id", chatId);
      if (error) throw error;
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
      const { data, error } = await supabase.functions.invoke(
        "send-chat-message",
        {
          body: { chat_id: chatId, message },
        }
      );
      if (error) throw error;
      return data;
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
