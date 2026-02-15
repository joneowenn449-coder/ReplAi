import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";

export interface WbCabinet {
  id: string;
  user_id: string;
  name: string;
  wb_api_key: string | null;
  brand_name: string;
  ai_prompt_template: string;
  reply_modes: Record<string, string>;
  last_sync_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  telegram_chat_id: string | null;
  telegram_username: string | null;
  telegram_first_name: string | null;
  tg_notify_type: string | null;
  tg_reply_mode: string | null;
}

export function useCabinets() {
  return useQuery({
    queryKey: ["wb_cabinets"],
    queryFn: async () => {
      return apiRequest("/api/cabinets") as Promise<WbCabinet[]>;
    },
  });
}

export function useActiveCabinet() {
  const { data: cabinets, ...rest } = useCabinets();
  const active = cabinets?.find((c) => c.is_active) || cabinets?.[0] || null;
  return { data: active, cabinets, ...rest };
}

export function useSwitchCabinet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cabinetId: string) => {
      return apiRequest(`/api/cabinets/${cabinetId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: true }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wb_cabinets"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useCreateCabinet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("/api/cabinets", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wb_cabinets"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      toast.success("Кабинет создан");
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });
}

export function useUpdateCabinet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WbCabinet> }) => {
      return apiRequest(`/api/cabinets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wb_cabinets"] });
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });
}

export function useDeleteCabinet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cabinetId: string) => {
      return apiRequest(`/api/cabinets/${cabinetId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wb_cabinets"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      toast.success("Кабинет удалён");
    },
    onError: (error) => {
      toast.error(`Ошибка удаления: ${error.message}`);
    },
  });
}
