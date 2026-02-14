import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

export function useCabinets() {
  return useQuery({
    queryKey: ["wb_cabinets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wb_cabinets")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as unknown as WbCabinet[]) || [];
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
      const { error } = await supabase
        .from("wb_cabinets")
        .update({ is_active: true } as Record<string, unknown>)
        .eq("id", cabinetId);
      if (error) throw error;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("wb_cabinets")
        .insert([{ user_id: user.id, name, is_active: true }])
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from("wb_cabinets")
        .update(updates as Record<string, unknown>)
        .eq("id", id);
      if (error) throw error;
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
      const { error } = await supabase
        .from("wb_cabinets")
        .delete()
        .eq("id", cabinetId);
      if (error) throw error;
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
