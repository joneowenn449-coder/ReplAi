import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActiveCabinet } from "./useCabinets";
import { apiRequest } from "@/lib/api";

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
  status: "pending" | "auto" | "sent" | "archived" | "answered_externally";
  ai_draft: string | null;
  sent_answer: string | null;
  is_edited: boolean;
  fetched_at: string;
  updated_at: string;
  cabinet_id: string | null;
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
  const { data: activeCabinet } = useActiveCabinet();
  const cabinetId = activeCabinet?.id;

  return useQuery({
    queryKey: ["reviews", cabinetId],
    queryFn: async () => {
      return apiRequest(`/api/reviews?cabinet_id=${cabinetId}`) as Promise<Review[]>;
    },
    enabled: !!cabinetId,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      return apiRequest("/api/settings") as Promise<Settings | null>;
    },
  });
}

export function useSyncReviews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiRequest("/api/functions/sync-reviews", { method: "POST" });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["wb_cabinets"] });
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
      return apiRequest("/api/functions/send-reply", {
        method: "POST",
        body: JSON.stringify({ review_id: reviewId, answer_text: answerText }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["token-balance"] });
      toast.success("Ответ отправлен на WB");
    },
    onError: (error) => {
      const msg = error.message || "";
      if (msg.includes("токенов") || msg.includes("402")) {
        toast.error("Недостаточно токенов для отправки. Пополните баланс.");
      } else {
        toast.error(`Ошибка отправки: ${msg}`);
      }
    },
  });
}

export function useGenerateReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      return apiRequest("/api/functions/generate-reply", {
        method: "POST",
        body: JSON.stringify({ review_id: reviewId }),
      });
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
      return apiRequest("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
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
    mutationFn: async ({ apiKey, cabinetId }: { apiKey: string; cabinetId: string }) => {
      const data = await apiRequest("/api/functions/validate-api-key", {
        method: "POST",
        body: JSON.stringify({ api_key: apiKey, cabinet_id: cabinetId }),
      });
      if (!data?.valid) {
        throw new Error(data?.error || "Ключ не прошёл проверку");
      }
      return data as { valid: boolean; masked_key: string; archive_imported?: boolean };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wb_cabinets"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("API-ключ подтверждён и сохранён");
      if (data?.archive_imported) {
        toast.info("Архив отзывов загружается в фоне. Это может занять несколько минут.", {
          duration: 7000,
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
    mutationFn: async (cabinetId: string) => {
      return apiRequest(`/api/cabinets/${cabinetId}`, {
        method: "PATCH",
        body: JSON.stringify({ wb_api_key: null }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wb_cabinets"] });
      toast.success("API-ключ удалён");
    },
    onError: (error) => {
      toast.error(`Ошибка удаления: ${error.message}`);
    },
  });
}
