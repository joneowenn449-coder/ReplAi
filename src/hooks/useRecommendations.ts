import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";

export function useProductArticles(cabinetId: string | undefined) {
  return useQuery({
    queryKey: ["product-articles", cabinetId],
    queryFn: async () => {
      if (!cabinetId) return [];
      return apiRequest(`/api/product-articles?cabinet_id=${cabinetId}`);
    },
    enabled: !!cabinetId,
  });
}

export function useRecommendations(sourceArticle: string | null, cabinetId: string | undefined) {
  return useQuery({
    queryKey: ["recommendations", sourceArticle, cabinetId],
    queryFn: async () => {
      if (!sourceArticle || !cabinetId) return [];
      return apiRequest(`/api/recommendations?source_article=${sourceArticle}&cabinet_id=${cabinetId}`);
    },
    enabled: !!sourceArticle && !!cabinetId,
  });
}

export function useAllRecommendationsSummary(cabinetId: string | undefined) {
  return useQuery({
    queryKey: ["recommendations-summary", cabinetId],
    queryFn: async () => {
      if (!cabinetId) return [];
      return apiRequest(`/api/recommendations/summary?cabinet_id=${cabinetId}`);
    },
    enabled: !!cabinetId,
  });
}

export function useAllRecommendationsGrouped(cabinetId: string | undefined) {
  return useQuery<{ source_article: string; source_name: string; items: { id: string; target_article: string; target_name: string }[] }[]>({
    queryKey: ["recommendations-all", cabinetId],
    queryFn: async () => {
      if (!cabinetId) return [];
      return apiRequest(`/api/recommendations/all?cabinet_id=${cabinetId}`);
    },
    enabled: !!cabinetId,
  });
}

export function useAddRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceArticle,
      targetArticle,
      targetName,
      cabinetId,
    }: {
      sourceArticle: string;
      targetArticle: string;
      targetName: string;
      cabinetId: string;
    }) => {
      return apiRequest("/api/recommendations", {
        method: "POST",
        body: JSON.stringify({
          source_article: sourceArticle,
          target_article: targetArticle,
          target_name: targetName,
          cabinet_id: cabinetId,
        }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recommendations", variables.sourceArticle, variables.cabinetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recommendations-summary", variables.cabinetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recommendations-all", variables.cabinetId],
      });
      toast.success("Рекомендация добавлена");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      sourceArticle,
      cabinetId,
    }: {
      id: string;
      sourceArticle: string;
      cabinetId: string;
    }) => {
      await apiRequest(`/api/recommendations/${id}`, { method: "DELETE" });
      return { sourceArticle, cabinetId };
    },
    onSuccess: ({ sourceArticle, cabinetId }) => {
      queryClient.invalidateQueries({
        queryKey: ["recommendations", sourceArticle, cabinetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recommendations-summary", cabinetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recommendations-all", cabinetId],
      });
      toast.success("Рекомендация удалена");
    },
    onError: () => {
      toast.error("Ошибка при удалении рекомендации");
    },
  });
}
