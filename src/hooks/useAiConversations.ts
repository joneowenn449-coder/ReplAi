import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";

export type AiConversation = {
  id: string;
  user_id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export function useConversationList() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai-conversations", user?.id],
    queryFn: async () => {
      return apiRequest("/api/conversations") as Promise<AiConversation[]>;
    },
    enabled: !!user,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title?: string) => {
      return apiRequest("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ title: title || "Новый чат" }),
      }) as Promise<AiConversation>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-conversations"] }),
  });
}

export function useRenameConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      return apiRequest(`/api/conversations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-conversations"] }),
  });
}

export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      return apiRequest(`/api/conversations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_pinned }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-conversations"] }),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/conversations/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-conversations"] }),
  });
}
