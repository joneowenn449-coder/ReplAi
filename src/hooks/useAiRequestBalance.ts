import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAiRequestBalance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ai-request-balance", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("ai_request_balances" as any)
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.balance ?? 0;
    },
    enabled: !!user,
  });
}
