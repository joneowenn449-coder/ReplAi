import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

// ── Admin role ──────────────────────────────────────────────

export function useAdminRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user,
  });
}

// ── Admin users ─────────────────────────────────────────────

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
      const [profilesRes, balancesRes, aiBalancesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name, phone, created_at"),
        supabase.from("token_balances").select("user_id, balance"),
        supabase.from("ai_request_balances").select("user_id, balance"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (balancesRes.error) throw balancesRes.error;
      if (aiBalancesRes.error) throw aiBalancesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const balanceMap = new Map(balancesRes.data?.map((b) => [b.user_id, b.balance]) ?? []);
      const aiBalanceMap = new Map(aiBalancesRes.data?.map((b) => [b.user_id, b.balance]) ?? []);
      const roleMap = new Map(rolesRes.data?.map((r) => [r.user_id, r.role]) ?? []);

      return (profilesRes.data ?? []).map((p) => ({
        id: p.id,
        email: "",
        display_name: p.display_name,
        phone: p.phone,
        created_at: p.created_at,
        balance: balanceMap.get(p.id) ?? 0,
        aiBalance: aiBalanceMap.get(p.id) ?? 0,
        role: roleMap.get(p.id) ?? "user",
      })) as UserWithBalance[];
    },
  });
}

// ── Generic transactions query ──────────────────────────────

function useTransactionsQuery(
  table: string,
  queryKeyPrefix: string,
  typeFilter?: string,
) {
  return useQuery({
    queryKey: [queryKeyPrefix, typeFilter],
    queryFn: async () => {
      let query = (supabase
        .from(table as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200) as any);

      if (typeFilter && typeFilter !== "all") {
        query = query.eq("type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminTransactions(typeFilter?: string) {
  return useTransactionsQuery("token_transactions", "admin-transactions", typeFilter);
}

export function useAdminAiTransactions(typeFilter?: string) {
  return useTransactionsQuery("ai_request_transactions", "admin-ai-transactions", typeFilter);
}

// ── Admin overview ──────────────────────────────────────────

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [profilesRes, balancesRes, aiBalancesRes, transactionsRes, reviewsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("token_balances").select("balance"),
        supabase.from("ai_request_balances").select("balance"),
        supabase.from("token_transactions").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
      ]);

      const totalBalance = (balancesRes.data ?? []).reduce((sum, b) => sum + b.balance, 0);
      const totalAiBalance = (aiBalancesRes.data ?? []).reduce((sum, b) => sum + b.balance, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayTransactions } = await supabase
        .from("token_transactions")
        .select("id", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      return {
        totalUsers: profilesRes.count ?? 0,
        totalBalance,
        totalAiBalance,
        todayTransactions: todayTransactions ?? 0,
        totalReviews: reviewsRes.count ?? 0,
      };
    },
  });
}

// ── Generic balance update mutation ─────────────────────────

interface BalanceMutationConfig {
  balanceTable: string;
  transactionTable: string;
  invalidateKeys: string[];
  successMessage: string;
  defaultTopupDesc: string;
  defaultDeductDesc: string;
}

function useUpdateBalanceMutation(config: BalanceMutationConfig) {
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
      const { data: current } = await (supabase
        .from(config.balanceTable as any)
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle() as any);

      const delta = type === "admin_topup" ? amount : -amount;
      const newBalance = ((current as any)?.balance ?? 0) + delta;
      if (newBalance < 0) throw new Error("Баланс не может быть отрицательным");

      if (!current) {
        const { error: insertError } = await (supabase
          .from(config.balanceTable as any)
          .insert({ user_id: userId, balance: newBalance }) as any);
        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await (supabase
          .from(config.balanceTable as any)
          .update({ balance: newBalance })
          .eq("user_id", userId) as any);
        if (updateError) throw updateError;
      }

      const { error: txError } = await (supabase
        .from(config.transactionTable as any)
        .insert({
          user_id: userId,
          amount: delta,
          type,
          description: description || (type === "admin_topup" ? config.defaultTopupDesc : config.defaultDeductDesc),
        }) as any);
      if (txError) throw txError;
    },
    onSuccess: () => {
      for (const key of config.invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast({ title: config.successMessage });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateBalance() {
  return useUpdateBalanceMutation({
    balanceTable: "token_balances",
    transactionTable: "token_transactions",
    invalidateKeys: ["admin-users", "admin-transactions", "admin-overview"],
    successMessage: "Баланс токенов обновлён",
    defaultTopupDesc: "Пополнение администратором",
    defaultDeductDesc: "Списание администратором",
  });
}

export function useUpdateAiBalance() {
  return useUpdateBalanceMutation({
    balanceTable: "ai_request_balances",
    transactionTable: "ai_request_transactions",
    invalidateKeys: ["admin-users", "admin-ai-transactions", "admin-overview"],
    successMessage: "Баланс AI-запросов обновлён",
    defaultTopupDesc: "Пополнение AI-запросов администратором",
    defaultDeductDesc: "Списание AI-запросов администратором",
  });
}
