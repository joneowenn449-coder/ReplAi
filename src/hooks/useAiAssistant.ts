import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AiMessage = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

export function useAiAssistant() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const sendMessage = useCallback(
    async (input: string) => {
      const userMsg: AiMessage = { role: "user", content: input };
      const allMessages = [...messages, userMsg];
      setMessages(allMessages);
      setIsLoading(true);

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
        // Get current session token for auth
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages }),
        });

        if (resp.status === 429) {
          toast.error("Превышен лимит запросов. Попробуйте позже.");
          setIsLoading(false);
          return;
        }
        if (resp.status === 402) {
          toast.error("У вас закончились запросы AI аналитика. Приобретите пакет запросов.");
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
              const content = parsed.choices?.[0]?.delta?.content as
                | string
                | undefined;
              if (content) upsertAssistant(content);
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Final flush
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
              const content = parsed.choices?.[0]?.delta?.content as
                | string
                | undefined;
              if (content) upsertAssistant(content);
            } catch {
              /* ignore partial leftovers */
            }
          }
        }

        // Invalidate AI request balance cache after successful response
        queryClient.invalidateQueries({ queryKey: ["ai-request-balance"] });
      } catch (e) {
        console.error("AI assistant error:", e);
        toast.error("Ошибка при получении ответа от ИИ");
      } finally {
        setIsLoading(false);
      }
    },
    [messages, queryClient]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages };
}
