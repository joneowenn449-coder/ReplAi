import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const BALANCE_CONFIG = {
  tokens: { table: "token_balances", queryKey: "token-balance" },
  ai: { table: "ai_request_balances", queryKey: "ai-request-balance" },
} as const;

type BalanceType = keyof typeof BALANCE_CONFIG;

export function useBalance(type: BalanceType) {
  const { user } = useAuth();
  const { table, queryKey } = BALANCE_CONFIG[type];

  return useQuery({
    queryKey: [queryKey, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase
        .from(table as any)
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle() as any);
      if (error) throw error;
      return (data as any)?.balance ?? 0;
    },
    enabled: !!user,
  });
}
