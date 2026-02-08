import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

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

interface UserWithBalance {
  id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
  balance: number;
  role: string;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, phone, created_at");
      if (profilesError) throw profilesError;

      // Fetch token balances
      const { data: balances, error: balancesError } = await supabase
        .from("token_balances")
        .select("user_id, balance");
      if (balancesError) throw balancesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesError) throw rolesError;

      const balanceMap = new Map(balances?.map((b) => [b.user_id, b.balance]) ?? []);
      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) ?? []);

      return (profiles ?? []).map((p) => ({
        id: p.id,
        email: "", // Will be filled if accessible
        display_name: p.display_name,
        phone: p.phone,
        created_at: p.created_at,
        balance: balanceMap.get(p.id) ?? 0,
        role: roleMap.get(p.id) ?? "user",
      })) as UserWithBalance[];
    },
  });
}

export function useAdminTransactions(typeFilter?: string) {
  return useQuery({
    queryKey: ["admin-transactions", typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("token_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (typeFilter && typeFilter !== "all") {
        query = query.eq("type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [profilesRes, balancesRes, transactionsRes, reviewsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("token_balances").select("balance"),
        supabase.from("token_transactions").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
      ]);

      const totalBalance = (balancesRes.data ?? []).reduce((sum, b) => sum + b.balance, 0);

      // Today's transactions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayTransactions } = await supabase
        .from("token_transactions")
        .select("id", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      return {
        totalUsers: profilesRes.count ?? 0,
        totalBalance,
        todayTransactions: todayTransactions ?? 0,
        totalReviews: reviewsRes.count ?? 0,
      };
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
      // Get current balance
      const { data: current, error: fetchError } = await supabase
        .from("token_balances")
        .select("balance")
        .eq("user_id", userId)
        .single();
      if (fetchError) throw fetchError;

      const delta = type === "admin_topup" ? amount : -amount;
      const newBalance = current.balance + delta;
      if (newBalance < 0) throw new Error("Баланс не может быть отрицательным");

      // Update balance
      const { error: updateError } = await supabase
        .from("token_balances")
        .update({ balance: newBalance })
        .eq("user_id", userId);
      if (updateError) throw updateError;

      // Record transaction
      const { error: txError } = await supabase
        .from("token_transactions")
        .insert({
          user_id: userId,
          amount: delta,
          type,
          description: description || (type === "admin_topup" ? "Пополнение администратором" : "Списание администратором"),
        });
      if (txError) throw txError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({ title: "Баланс обновлён" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });
}
