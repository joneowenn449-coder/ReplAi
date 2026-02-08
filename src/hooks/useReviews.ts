import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Review {
  id: string;
  wb_id: string;
  rating: number;
  author_name: string;
  text: string | null;
  pros: string | null;
  cons: string | null;
  product_name: string;
  product_article: string;
  photo_links: string[];
  has_video: boolean;
  created_date: string;
  status: "pending" | "auto" | "sent" | "archived";
  ai_draft: string | null;
  sent_answer: string | null;
  is_edited: boolean;
  fetched_at: string;
  updated_at: string;
}

export type ReplyMode = "auto" | "manual";

export type ReplyModes = Record<string, ReplyMode>;

export const DEFAULT_REPLY_MODES: ReplyModes = {
  "1": "manual",
  "2": "manual",
  "3": "manual",
  "4": "manual",
  "5": "manual",
};

export interface Settings {
  id: string;
  auto_reply_enabled: boolean;
  reply_modes: ReplyModes;
  ai_prompt_template: string;
  last_sync_at: string | null;
  wb_api_key: string | null;
  brand_name: string;
}

export function useReviews() {
  return useQuery({
    queryKey: ["reviews"],
    queryFn: async () => {
      const allReviews: Review[] = [];
      const pageSize = 1000;
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from("reviews")
          .select("*")
          .order("created_date", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const rows = (data as unknown as Review[]) || [];
        allReviews.push(...rows);
        if (rows.length < pageSize) break;
        from += pageSize;
      }

      return allReviews;
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Settings | null;
    },
  });
}

export function useSyncReviews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-reviews");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      const newCount = data?.new || 0;
      const autoSent = data?.autoSent || 0;
      toast.success(
        `Синхронизация завершена: ${newCount} новых, ${autoSent} автоответов`
      );
    },
    onError: (error) => {
      toast.error(`Ошибка синхронизации: ${error.message}`);
    },
  });
}


export function useSendReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      answerText,
    }: {
      reviewId: string;
      answerText?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("send-reply", {
        body: { review_id: reviewId, answer_text: answerText },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Ответ отправлен на WB");
    },
    onError: (error) => {
      toast.error(`Ошибка отправки: ${error.message}`);
    },
  });
}

export function useGenerateReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "generate-reply",
        {
          body: { review_id: reviewId },
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Новый черновик сгенерирован");
    },
    onError: (error) => {
      toast.error(`Ошибка генерации: ${error.message}`);
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Settings>) => {
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (!existing) throw new Error("Settings not found");

      const { error } = await supabase
        .from("settings")
        .update(updates as Record<string, unknown>)
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error) => {
      toast.error(`Ошибка сохранения: ${error.message}`);
    },
  });
}

export function useValidateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (apiKey: string) => {
      const { data, error } = await supabase.functions.invoke(
        "validate-api-key",
        { body: { api_key: apiKey } }
      );
      if (error) throw error;
      if (!data?.valid) {
        throw new Error(data?.error || "Ключ не прошёл проверку");
      }
      return data as { valid: boolean; masked_key: string; archive_imported?: boolean };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("API-ключ подтверждён и сохранён");
      if (data?.archive_imported) {
        toast.success("Архив отзывов загружен автоматически", {
          duration: 5000,
        });
      }
    },
    onError: (error) => {
      toast.error(`Ошибка проверки: ${error.message}`);
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (!existing) throw new Error("Settings not found");

      const { error } = await supabase
        .from("settings")
        .update({ wb_api_key: null } as Record<string, unknown>)
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("API-ключ удалён");
    },
    onError: (error) => {
      toast.error(`Ошибка удаления: ${error.message}`);
    },
  });
}
