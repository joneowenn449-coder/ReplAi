import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useRenameConversation } from "@/hooks/useAiConversations";
import { apiRequest } from "@/lib/api";

export type AiMessage = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_URL = `/api/functions/ai-assistant`;

export function useAiAssistant(conversationId: string | null) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const queryClient = useQueryClient();
  const renameMutation = useRenameConversation();

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoadingHistory(true);
      try {
        const data = await apiRequest(`/api/ai-messages?conversation_id=${conversationId}`);
        if (!cancelled) {
          setMessages((data || []) as AiMessage[]);
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
        if (!cancelled) {
          setMessages([]);
        }
      }
      if (!cancelled) {
        setIsLoadingHistory(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [conversationId]);

  const sendMessage = useCallback(
    async (input: string, overrideConvId?: string) => {
      const convId = overrideConvId || conversationId;
      if (!convId) return;

      const userMsg: AiMessage = { role: "user", content: input };
      const allMessages = [...messages, userMsg];
      setMessages(allMessages);
      setIsLoading(true);

      apiRequest("/api/ai-messages", {
        method: "POST",
        body: JSON.stringify({
          conversation_id: convId,
          role: "user",
          content: input,
        }),
      }).catch(() => {});

      if (messages.length === 0) {
        const autoTitle = input.length > 40 ? input.slice(0, 40) + "…" : input;
        renameMutation.mutate({ id: convId, title: autoTitle });
      }

      let assistantSoFar = "";

      const upsertAssistant = (nextChunk: string) => {
        assistantSoFar += nextChunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      try {
        const accessToken = localStorage.getItem("replai_token");

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ messages: allMessages }),
        });

        if (resp.status === 429) {
          toast.error("Превышен лимит запросов. Попробуйте позже.");
          setIsLoading(false);
          return;
        }
        if (resp.status === 402) {
          toast.error("Нет доступа к AI аналитику. Подключите модуль «AI Аналитик» в разделе Тарифы.");
          setIsLoading(false);
          return;
        }
        if (resp.status === 401) {
          toast.error("Необходимо авторизоваться для использования AI аналитика.");
          setIsLoading(false);
          return;
        }
        if (!resp.ok || !resp.body) {
          throw new Error("Failed to start stream");
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              streamDone = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsertAssistant(content);
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsertAssistant(content);
            } catch {
              /* ignore partial leftovers */
            }
          }
        }

        if (assistantSoFar) {
          apiRequest("/api/ai-messages", {
            method: "POST",
            body: JSON.stringify({
              conversation_id: convId,
              role: "assistant",
              content: assistantSoFar,
            }),
          }).catch(() => {});

          apiRequest(`/api/conversations/${convId}`, {
            method: "PATCH",
            body: JSON.stringify({ updated_at: new Date().toISOString() }),
          }).catch(() => {});

          queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
        }

        queryClient.invalidateQueries({ queryKey: ["ai-request-balance"] });
      } catch (e) {
        console.error("AI assistant error:", e);
        toast.error("Ошибка при получении ответа от ИИ");
      } finally {
        setIsLoading(false);
      }
    },
    [messages, queryClient, conversationId, renameMutation]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, isLoadingHistory, sendMessage, clearMessages };
}
