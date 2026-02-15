import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { apiRequest } from "@/lib/api";

const BALANCE_CONFIG = {
  tokens: { endpoint: "/api/balance/tokens", queryKey: "token-balance" },
  ai: { endpoint: "/api/balance/ai", queryKey: "ai-request-balance" },
} as const;

type BalanceType = keyof typeof BALANCE_CONFIG;

export function useBalance(type: BalanceType) {
  const { user } = useAuth();
  const { endpoint, queryKey } = BALANCE_CONFIG[type];

  return useQuery({
    queryKey: [queryKey, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const data = await apiRequest(endpoint);
      return data?.balance ?? 0;
    },
    enabled: !!user,
  });
}
