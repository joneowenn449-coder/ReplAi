import { useState, useMemo, useCallback } from "react";
import { Header } from "@/components/Header";
import { ApiStatus } from "@/components/ApiStatus";
import { useChats } from "@/hooks/useChats";
import { StatsCards } from "@/components/StatsCards";
import { FilterTabs } from "@/components/FilterTabs";
import { ReviewCard } from "@/components/ReviewCard";
import { SettingsDialog } from "@/components/SettingsDialog";
import { ChatsSection } from "@/components/ChatsSection";
import { AiAssistant } from "@/components/AiAssistant";
import { DashboardSection } from "@/components/DashboardSection";
import { GuideSection } from "@/components/GuideSection";
import {
  useReviews,
  useSyncReviews,
  DEFAULT_REPLY_MODES,
} from "@/hooks/useReviews";
import { useActiveCabinet } from "@/hooks/useCabinets";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const VISIBLE = "block";
const HIDDEN = "hidden";

const Index = () => {
  const [activeTab, setActiveTab] = useState("reviews");
  const [activeFilter, setActiveFilter] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<"telegram" | undefined>(undefined);
  const [syncingCabinetId, setSyncingCabinetId] = useState<string | null>(null);
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(new Set(["reviews"]));
  const [visibleCount, setVisibleCount] = useState(30);

  const { data: reviews = [], isLoading: reviewsLoading } = useReviews();
  const { data: chats = [] } = useChats();
  const { data: activeCabinet } = useActiveCabinet();
  const syncReviews = useSyncReviews();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setMountedTabs(prev => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, []);

  const unreadChatsCount = useMemo(
    () => chats.filter((c) => !c.is_read).length,
    [chats]
  );

  const replyModes = useMemo(
    () => (activeCabinet?.reply_modes as Record<string, "auto" | "manual">) ?? DEFAULT_REPLY_MODES,
    [activeCabinet?.reply_modes]
  );

  const { stats, counts, activeReviews } = useMemo(() => {
    const pending = reviews.filter((r) => r.status === "pending").length;
    const answered = reviews.filter(
      (r) => r.status === "auto" || r.status === "sent" || r.status === "answered_externally"
    ).length;
    const archived = reviews.filter((r) => r.status === "archived").length;
    const active = reviews.filter((r) => r.status !== "archived");

    return {
      stats: { pending, answered, archived },
      counts: { all: active.length, pending, answered, archived },
      activeReviews: active,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (activeFilter === "all") return activeReviews;
    if (activeFilter === "answered")
      return reviews.filter(
        (r) => r.status === "auto" || r.status === "sent" || r.status === "answered_externally"
      );
    return reviews.filter((r) => r.status === activeFilter);
  }, [reviews, activeReviews, activeFilter]);

  const visibleReviews = useMemo(
    () => filteredReviews.slice(0, visibleCount),
    [filteredReviews, visibleCount]
  );

  const hasMore = visibleCount < filteredReviews.length;

  const handleSync = useCallback(() => {
    if (!activeCabinet?.id) return;
    setSyncingCabinetId(activeCabinet.id);
    syncReviews.mutate(undefined, {
      onSettled: () => setSyncingCabinetId(null),
    });
  }, [activeCabinet?.id, syncReviews]);

  const lastSyncFormatted = useMemo(
    () =>
      activeCabinet?.last_sync_at
        ? format(new Date(activeCabinet.last_sync_at), "d MMM yyyy 'в' HH:mm", { locale: ru })
        : "Ещё не синхронизировано",
    [activeCabinet?.last_sync_at]
  );

  const handleSettingsClick = useCallback(() => {
    setSettingsInitialSection(undefined);
    setSettingsOpen(true);
  }, []);

  const handleTelegramClick = useCallback(() => {
    setSettingsInitialSection("telegram");
    setSettingsOpen(true);
  }, []);

  const handleSettingsChange = useCallback((v: boolean) => {
    setSettingsOpen(v);
    if (!v) setSettingsInitialSection(undefined);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onSettingsClick={handleSettingsClick}
        onTelegramClick={handleTelegramClick}
        unreadChatsCount={unreadChatsCount}
      />

      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className={activeTab === "reviews" ? VISIBLE : HIDDEN}>
          <div className="space-y-4 sm:space-y-6">
            <ApiStatus
              isConnected={!!activeCabinet?.wb_api_key}
              lastSync={lastSyncFormatted}
              replyModes={replyModes}
              onSync={handleSync}
              isSyncing={syncReviews.isPending && syncingCabinetId === activeCabinet?.id}
            />

            <StatsCards
              pendingCount={stats.pending}
              answeredCount={stats.answered}
            />

            <FilterTabs
              activeFilter={activeFilter}
              onFilterChange={(f) => { setActiveFilter(f); setVisibleCount(30); }}
              counts={counts}
            />

            {reviewsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {visibleReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    id={review.id}
                    rating={review.rating}
                    authorName={review.author_name}
                    date={review.created_date}
                    productName={review.product_name}
                    productArticle={review.product_article}
                    status={review.status}
                    photoLinks={review.photo_links}
                    text={review.text}
                    pros={review.pros}
                    cons={review.cons}
                    aiDraft={review.ai_draft}
                    sentAnswer={review.sent_answer}
                    isEdited={review.is_edited}
                    photoAnalysis={activeCabinet?.photo_analysis === true}
                  />
                ))}

                {hasMore && (
                  <div className="flex justify-center pt-2 pb-4">
                    <Button
                      variant="outline"
                      onClick={() => setVisibleCount(prev => prev + 30)}
                      data-testid="button-show-more-reviews"
                    >
                      Показать ещё ({filteredReviews.length - visibleCount} осталось)
                    </Button>
                  </div>
                )}

                {filteredReviews.length === 0 && !reviewsLoading && (
                  <div className="text-center py-12 text-muted-foreground">
                    {reviews.length === 0
                      ? "Нажмите «Синхронизировать» чтобы загрузить отзывы с WB"
                      : "Нет отзывов в этой категории"}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {mountedTabs.has("chats") && (
          <div className={activeTab === "chats" ? VISIBLE : HIDDEN}>
            <ChatsSection />
          </div>
        )}

        {mountedTabs.has("ai") && (
          <div className={activeTab === "ai" ? VISIBLE : HIDDEN}>
            <AiAssistant />
          </div>
        )}

        {mountedTabs.has("dashboard") && (
          <div className={activeTab === "dashboard" ? VISIBLE : HIDDEN}>
            <DashboardSection reviews={reviews} isLoading={reviewsLoading} />
          </div>
        )}

        {mountedTabs.has("guide") && (
          <div className={activeTab === "guide" ? VISIBLE : HIDDEN}>
            <GuideSection />
          </div>
        )}
      </main>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={handleSettingsChange}
        initialSection={settingsInitialSection}
      />
    </div>
  );
};

export default Index;
