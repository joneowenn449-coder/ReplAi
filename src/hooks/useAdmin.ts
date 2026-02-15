import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { apiRequest } from "@/lib/api";

export function useAdminRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const data = await apiRequest("/api/admin/role");
      return data?.isAdmin ?? false;
    },
    enabled: !!user,
  });
}

interface UserWithBalance {
  id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
  balance: number;
  aiBalance: number;
  role: string;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      return apiRequest("/api/admin/users") as Promise<UserWithBalance[]>;
    },
  });
}

export function useAdminTransactions(typeFilter?: string) {
  return useQuery({
    queryKey: ["admin-transactions", typeFilter],
    queryFn: async () => {
      const params = typeFilter && typeFilter !== "all" ? `?type=${typeFilter}` : "";
      return apiRequest(`/api/admin/transactions${params}`);
    },
  });
}

export function useAdminAiTransactions(typeFilter?: string) {
  return useQuery({
    queryKey: ["admin-ai-transactions", typeFilter],
    queryFn: async () => {
      const params = typeFilter && typeFilter !== "all" ? `?type=${typeFilter}` : "";
      return apiRequest(`/api/admin/ai-transactions${params}`);
    },
  });
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      return apiRequest("/api/admin/overview");
    },
  });
}

export function useUpdateBalance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      userId,
      amount,
      type,
      description,
    }: {
      userId: string;
      amount: number;
      type: "admin_topup" | "admin_deduct";
      description?: string;
    }) => {
      return apiRequest("/api/admin/balance/tokens", {
        method: "POST",
        body: JSON.stringify({ userId, amount, type, description }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({ title: "Баланс токенов обновлён" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateAiBalance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      userId,
      amount,
      type,
      description,
    }: {
      userId: string;
      amount: number;
      type: "admin_topup" | "admin_deduct";
      description?: string;
    }) => {
      return apiRequest("/api/admin/balance/ai", {
        method: "POST",
        body: JSON.stringify({ userId, amount, type, description }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ai-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({ title: "Баланс AI-запросов обновлён" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}
