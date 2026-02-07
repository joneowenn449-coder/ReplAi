import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useProductArticles,
  useRecommendations,
  useAddRecommendation,
  useDeleteRecommendation,
} from "@/hooks/useRecommendations";
import { Plus, X, Package, Loader2 } from "lucide-react";

export const RecommendationsSection = () => {
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [newArticle, setNewArticle] = useState("");
  const [newName, setNewName] = useState("");

  const { data: articles = [], isLoading: articlesLoading } =
    useProductArticles();
  const { data: recommendations = [], isLoading: recsLoading } =
    useRecommendations(selectedArticle);
  const addRecommendation = useAddRecommendation();
  const deleteRecommendation = useDeleteRecommendation();

  const handleAdd = () => {
    if (!selectedArticle || !newArticle.trim()) return;
    addRecommendation.mutate(
      {
        sourceArticle: selectedArticle,
        targetArticle: newArticle.trim(),
        targetName: newName.trim(),
      },
      {
        onSuccess: () => {
          setNewArticle("");
          setNewName("");
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!selectedArticle) return;
    deleteRecommendation.mutate({ id, sourceArticle: selectedArticle });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-muted-foreground" />
        <label className="text-sm font-medium text-foreground">
          Рекомендации товаров
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        При ответе на отзыв ИИ добавит призыв посмотреть рекомендованные
        артикулы.
      </p>

      {/* Article selector */}
      <Select
        value={selectedArticle || ""}
        onValueChange={(v) => setSelectedArticle(v || null)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Выберите артикул..." />
        </SelectTrigger>
        <SelectContent className="bg-popover border border-border z-50">
          {articlesLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : articles.length === 0 ? (
            <div className="py-3 px-2 text-sm text-muted-foreground text-center">
              Нет артикулов в базе отзывов
            </div>
          ) : (
            articles.map((a) => (
              <SelectItem key={a.article} value={a.article}>
                {a.article}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Recommendations list */}
      {selectedArticle && (
        <div className="space-y-2">
          {recsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : recommendations.length > 0 ? (
            <div className="space-y-1.5">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border text-sm"
                >
                  <span className="font-mono text-xs text-foreground">
                    {rec.target_article}
                  </span>
                  {rec.target_name && (
                    <span className="text-muted-foreground truncate">
                      — {rec.target_name}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(rec.id)}
                    disabled={deleteRecommendation.isPending}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">
              Нет рекомендаций для этого артикула
            </p>
          )}

          {/* Add new recommendation */}
          <div className="flex gap-2">
            <Input
              value={newArticle}
              onChange={(e) => setNewArticle(e.target.value)}
              placeholder="Артикул"
              className="font-mono text-sm flex-1"
            />
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Название (необяз.)"
              className="text-sm flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleAdd}
              disabled={
                !newArticle.trim() || addRecommendation.isPending
              }
              title="Добавить рекомендацию"
            >
              {addRecommendation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
