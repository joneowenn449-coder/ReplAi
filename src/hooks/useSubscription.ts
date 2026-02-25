import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAuth } from "./useAuth";

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  photo_analysis_enabled: boolean;
  ai_analyst_enabled: boolean;
  current_period_start: string;
  current_period_end: string;
  replies_used_this_period: number;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  return useQuery<{ subscription: Subscription | null }>({
    queryKey: ["/api/subscription"],
    queryFn: async () => {
      if (!user) return { subscription: null };
      return apiRequest("/api/subscription");
    },
    enabled: !!user,
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { planId: string; photoAnalysis: boolean; aiAnalyst: boolean }) => {
      return apiRequest("/api/subscription/create", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/subscription"] });
      qc.invalidateQueries({ queryKey: ["/api/token-balance"] });
    },
  });
}

export function useToggleModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { moduleId: string; enabled: boolean }) => {
      return apiRequest("/api/subscription/toggle-module", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/subscription"] });
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return apiRequest("/api/subscription/cancel", {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/subscription"] });
    },
  });
}
