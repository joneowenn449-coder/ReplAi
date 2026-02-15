import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Plus, X, Package, Loader2, ArrowRight, ShoppingBag, ChevronDown, ChevronRight, ChevronsUpDown } from "lucide-react";

export const RecommendationsSection = () => {
  const [sourceArticle, setSourceArticle] = useState("");
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

  const configuredSources = new Set(groups.map((g) => g.source_article));

  const availableSources = articles.filter(
    (a) => !configuredSources.has(a.article)
  );

  const availableTargets = articles.filter(
    (a) =>
      a.article !== sourceArticle &&
      !existingPairs.has(`${sourceArticle}:${a.article}`)
  );

  const toggleTarget = (article: string) => {
    setSelectedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(article)) {
        next.delete(article);
      } else {
        next.add(article);
      }
      return next;
    });
  };

  const toggleGroup = (sourceArt: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(sourceArt)) {
        next.delete(sourceArt);
      } else {
        next.add(sourceArt);
      }
      return next;
    });
  };

  const toggleAllGroups = () => {
    if (expandedGroups.size === groups.length) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(groups.map((g) => g.source_article)));
    }
  };

  const handleAddAll = async () => {
    if (!sourceArticle || selectedTargets.size === 0 || !cabinetId) return;
    setIsAdding(true);
    try {
      const targets = Array.from(selectedTargets);
      for (const targetArt of targets) {
        const targetName = articles.find((a) => a.article === targetArt)?.name || "";
        await new Promise<void>((resolve, reject) => {
          addRecommendation.mutate(
            { sourceArticle, targetArticle: targetArt, targetName, cabinetId },
            { onSuccess: () => resolve(), onError: () => reject() }
          );
        });
      }
      setSelectedTargets(new Set());
      setSourceArticle("");
    } finally {
      setIsAdding(false);
    }
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
        <div className="space-y-1.5">
          {groups.length > 1 && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllGroups}
                data-testid="button-toggle-all-groups"
              >
                <ChevronsUpDown className="w-3.5 h-3.5 mr-1.5" />
                <span className="text-xs">
                  {expandedGroups.size === groups.length ? "Свернуть все" : "Развернуть все"}
                </span>
              </Button>
            </div>
          )}
          {groups.map((group) => (
            <Collapsible
              key={group.source_article}
              open={expandedGroups.has(group.source_article)}
              onOpenChange={() => toggleGroup(group.source_article)}
            >
              <Card
                className="overflow-visible"
                data-testid={`card-recommendation-group-${group.source_article}`}
              >
                <CollapsibleTrigger asChild>
                  <div
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover-elevate rounded-md flex-wrap"
                    data-testid={`trigger-group-${group.source_article}`}
                  >
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                        expandedGroups.has(group.source_article) ? "rotate-90" : ""
                      }`}
                    />
                    <span className="text-xs font-mono font-medium text-foreground" data-testid={`text-source-article-${group.source_article}`}>
                      {group.source_article}
                    </span>
                    {group.source_name && (
                      <span className="text-xs text-muted-foreground truncate max-w-[160px]" data-testid={`text-source-name-${group.source_article}`}>
                        {truncateName(group.source_name, 25)}
                      </span>
                    )}
                    <Badge variant="secondary" className="ml-auto shrink-0 no-default-active-elevate">
                      {group.items.length}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-0.5 px-3 pb-2 pt-0.5">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 pl-5 flex-wrap"
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id, group.source_article);
                          }}
                          disabled={deleteRecommendation.isPending}
                          data-testid={`button-delete-recommendation-${item.id}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      <Card className="p-3" data-testid="card-add-recommendation">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Добавить рекомендацию
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={sourceArticle} onValueChange={(v) => { setSourceArticle(v); setSelectedTargets(new Set()); }}>
            <SelectTrigger className="flex-1 min-w-[140px]" data-testid="select-source-article">
              <SelectValue placeholder="Товар..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border z-50">
              {articlesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : availableSources.length === 0 ? (
                <div className="py-3 px-2 text-sm text-muted-foreground text-center">
                  {articles.length === 0 ? "Нет артикулов" : "Все артикулы уже настроены"}
                </div>
              ) : (
                availableSources.map((a) => (
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

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 min-w-[140px] justify-between font-normal"
                disabled={!sourceArticle}
                data-testid="button-select-targets"
              >
                <span className="text-sm truncate">
                  {selectedTargets.size === 0
                    ? "Выберите артикулы..."
                    : `Выбрано: ${selectedTargets.size}`}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <div className="max-h-[240px] overflow-y-auto">
                {availableTargets.length === 0 ? (
                  <div className="py-4 px-3 text-sm text-muted-foreground text-center">
                    {sourceArticle ? "Все артикулы уже добавлены" : "Выберите товар"}
                  </div>
                ) : (
                  availableTargets.map((a) => (
                    <label
                      key={a.article}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover-elevate"
                      data-testid={`checkbox-target-${a.article}`}
                    >
                      <Checkbox
                        checked={selectedTargets.has(a.article)}
                        onCheckedChange={() => toggleTarget(a.article)}
                      />
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span className="font-mono text-xs">{a.article}</span>
                        {a.name && (
                          <span className="text-xs text-muted-foreground truncate">
                            {truncateName(a.name, 22)}
                          </span>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="icon"
            onClick={handleAddAll}
            disabled={
              !sourceArticle ||
              selectedTargets.size === 0 ||
              isAdding
            }
            data-testid="button-add-recommendation"
          >
            {isAdding ? (
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
