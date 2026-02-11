import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useProductArticles() {
  return useQuery({
    queryKey: ["product-articles"],
    queryFn: async () => {
      // Fetch unique product articles from reviews
      const { data, error } = await supabase
        .from("reviews")
        .select("product_article, product_name");

      if (error) throw error;

      // Deduplicate by article
      const map = new Map<string, string>();
      for (const r of data || []) {
        if (r.product_article && !map.has(r.product_article)) {
          map.set(r.product_article, r.product_name || r.product_article);
        }
      }

      return Array.from(map.entries()).map(([article, name]) => ({
        article,
        name,
      }));
    },
  });
}

export function useRecommendations(sourceArticle: string | null) {
  return useQuery({
    queryKey: ["recommendations", sourceArticle],
    queryFn: async () => {
      if (!sourceArticle) return [];
      const { data, error } = await supabase
        .from("product_recommendations")
        .select("*")
        .eq("source_article", sourceArticle)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!sourceArticle,
  });
}

export function useAllRecommendationsSummary() {
  return useQuery({
    queryKey: ["recommendations-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_recommendations")
        .select("source_article, target_article, target_name");

      if (error) throw error;

      const map = new Map<string, { count: number; targets: string[] }>();
      for (const r of data || []) {
        const existing = map.get(r.source_article);
        if (existing) {
          existing.count++;
          existing.targets.push(r.target_article);
        } else {
          map.set(r.source_article, { count: 1, targets: [r.target_article] });
        }
      }

      return Array.from(map.entries()).map(([article, info]) => ({
        article,
        count: info.count,
        targets: info.targets,
      }));
    },
  });
}

export function useAddRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceArticle,
      targetArticle,
      targetName,
    }: {
      sourceArticle: string;
      targetArticle: string;
      targetName: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      const { error } = await supabase
        .from("product_recommendations")
        .insert({
          source_article: sourceArticle,
          target_article: targetArticle,
          target_name: targetName,
          user_id: user.id,
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error("Этот артикул уже добавлен в рекомендации");
        }
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recommendations", variables.sourceArticle],
      });
      queryClient.invalidateQueries({
        queryKey: ["recommendations-summary"],
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
    }: {
      id: string;
      sourceArticle: string;
    }) => {
      const { error } = await supabase
        .from("product_recommendations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return sourceArticle;
    },
    onSuccess: (sourceArticle) => {
      queryClient.invalidateQueries({
        queryKey: ["recommendations", sourceArticle],
      });
      queryClient.invalidateQueries({
        queryKey: ["recommendations-summary"],
      });
      toast.success("Рекомендация удалена");
    },
    onError: () => {
      toast.error("Ошибка при удалении рекомендации");
    },
  });
}
