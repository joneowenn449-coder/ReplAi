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

export interface UserPayment {
  id: string;
  amount: string;
  tokens: number;
  status: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
  last_seen_at: string | null;
  admin_notes: string | null;
  balance: number;
  aiBalance: number;
  role: string;
  status: "active" | "trial" | "expired";
  totalPaid: number;
  paymentsCount: number;
  cabinetsCount: number;
  telegram: { username: string | null; firstName: string | null; chatId: string | null } | null;
  payments: UserPayment[];
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      return apiRequest("/api/admin/users") as Promise<AdminUser[]>;
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

export interface UserSessionEntry {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  device: string | null;
  device_type: string | null;
  created_at: string;
}

export function useUserSessions(userId: string | null) {
  return useQuery({
    queryKey: ["admin-user-sessions", userId],
    queryFn: async () => {
      return apiRequest(`/api/admin/users/${userId}/sessions`) as Promise<UserSessionEntry[]>;
    },
    enabled: !!userId,
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

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/api/admin/users/${userId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({ title: "Пользователь удалён" });
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

export function useUpdateAdminNotes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, notes }: { userId: string; notes: string }) => {
      return apiRequest(`/api/admin/users/${userId}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Заметка сохранена" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}
