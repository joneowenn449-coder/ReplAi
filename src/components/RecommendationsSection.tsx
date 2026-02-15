import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useProductArticles,
  useAllRecommendationsGrouped,
  useAddRecommendation,
  useDeleteRecommendation,
} from "@/hooks/useRecommendations";
import { useActiveCabinet } from "@/hooks/useCabinets";
import { Plus, X, Package, Loader2, ArrowRight, ShoppingBag } from "lucide-react";

export const RecommendationsSection = () => {
  const [sourceArticle, setSourceArticle] = useState("");
  const [targetArticle, setTargetArticle] = useState("");

  const { data: activeCabinet } = useActiveCabinet();
  const cabinetId = activeCabinet?.id;

  const { data: articles = [], isLoading: articlesLoading } =
    useProductArticles(cabinetId);
  const { data: groups = [], isLoading: groupsLoading } =
    useAllRecommendationsGrouped(cabinetId);
  const addRecommendation = useAddRecommendation();
  const deleteRecommendation = useDeleteRecommendation();

  const existingPairs = new Set(
    groups.flatMap((g) =>
      g.items.map((i) => `${g.source_article}:${i.target_article}`)
    )
  );

  const availableTargets = articles.filter(
    (a) =>
      a.article !== sourceArticle &&
      !existingPairs.has(`${sourceArticle}:${a.article}`)
  );

  const handleAdd = () => {
    if (!sourceArticle || !targetArticle || !cabinetId) return;
    const targetName =
      articles.find((a) => a.article === targetArticle)?.name || "";
    addRecommendation.mutate(
      {
        sourceArticle,
        targetArticle,
        targetName,
        cabinetId,
      },
      {
        onSuccess: () => {
          setTargetArticle("");
        },
      }
    );
  };

  const handleDelete = (id: string, sourceArt: string) => {
    if (!cabinetId) return;
    deleteRecommendation.mutate({ id, sourceArticle: sourceArt, cabinetId });
  };

  const truncateName = (name: string, maxLen = 30) => {
    if (!name) return "";
    return name.length > maxLen ? name.slice(0, maxLen) + "..." : name;
  };

  return (
    <div className="space-y-4" data-testid="section-recommendations">
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-muted-foreground" />
        <label className="text-sm font-medium text-foreground">
          Рекомендации товаров
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        При ответе на положительный отзыв (4-5 звезд) ИИ ненавязчиво предложит
        покупателю посмотреть рекомендованные товары.
      </p>

      {groupsLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <ShoppingBag className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Нет настроенных связей
          </p>
          <p className="text-xs text-muted-foreground/70">
            Добавьте первую рекомендацию ниже
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Card
              key={group.source_article}
              className="p-3 space-y-2"
              data-testid={`card-recommendation-group-${group.source_article}`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-medium text-foreground" data-testid={`text-source-article-${group.source_article}`}>
                  {group.source_article}
                </span>
                {group.source_name && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]" data-testid={`text-source-name-${group.source_article}`}>
                    {group.source_name}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 pl-2 flex-wrap"
                    data-testid={`item-recommendation-${item.id}`}
                  >
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="font-mono text-xs text-foreground" data-testid={`text-target-article-${item.id}`}>
                      {item.target_article}
                    </span>
                    {item.target_name && (
                      <span className="text-xs text-muted-foreground truncate" data-testid={`text-target-name-${item.id}`}>
                        {truncateName(item.target_name, 30)}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto shrink-0"
                      onClick={() =>
                        handleDelete(item.id, group.source_article)
                      }
                      disabled={deleteRecommendation.isPending}
                      data-testid={`button-delete-recommendation-${item.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-3" data-testid="card-add-recommendation">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Добавить рекомендацию
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={sourceArticle} onValueChange={(v) => { setSourceArticle(v); setTargetArticle(""); }}>
            <SelectTrigger className="flex-1 min-w-[140px]" data-testid="select-source-article">
              <SelectValue placeholder="Товар..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border z-50">
              {articlesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : articles.length === 0 ? (
                <div className="py-3 px-2 text-sm text-muted-foreground text-center">
                  Нет артикулов
                </div>
              ) : (
                articles.map((a) => (
                  <SelectItem key={a.article} value={a.article}>
                    <span className="font-mono text-xs">{a.article}</span>
                    {a.name && (
                      <span className="text-xs text-muted-foreground ml-1.5">
                        {truncateName(a.name, 25)}
                      </span>
                    )}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

          <Select
            value={targetArticle}
            onValueChange={setTargetArticle}
            disabled={!sourceArticle}
          >
            <SelectTrigger className="flex-1 min-w-[140px]" data-testid="select-target-article">
              <SelectValue placeholder="Рекомендовать..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border z-50">
              {availableTargets.length === 0 ? (
                <div className="py-3 px-2 text-sm text-muted-foreground text-center">
                  {sourceArticle ? "Все артикулы уже добавлены" : "Выберите товар"}
                </div>
              ) : (
                availableTargets.map((a) => (
                  <SelectItem key={a.article} value={a.article}>
                    <span className="font-mono text-xs">{a.article}</span>
                    {a.name && (
                      <span className="text-xs text-muted-foreground ml-1.5">
                        {truncateName(a.name, 25)}
                      </span>
                    )}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleAdd}
            disabled={
              !sourceArticle ||
              !targetArticle ||
              addRecommendation.isPending
            }
            data-testid="button-add-recommendation"
          >
            {addRecommendation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};
