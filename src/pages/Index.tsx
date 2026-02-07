import { useState } from "react";
import { Header } from "@/components/Header";
import { ApiStatus } from "@/components/ApiStatus";
import { StatsCards } from "@/components/StatsCards";
import { FilterTabs } from "@/components/FilterTabs";
import { ReviewCard } from "@/components/ReviewCard";
import { SettingsDialog } from "@/components/SettingsDialog";
import { ChatsSection } from "@/components/ChatsSection";
import {
  useReviews,
  useSettings,
  useSyncReviews,
  useFetchArchive,
  DEFAULT_REPLY_MODES,
} from "@/hooks/useReviews";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("reviews");
  const [activeFilter, setActiveFilter] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: reviews = [], isLoading: reviewsLoading } = useReviews();
  const { data: settings } = useSettings();
  const syncReviews = useSyncReviews();
  const fetchArchive = useFetchArchive();

  const replyModes = settings?.reply_modes ?? DEFAULT_REPLY_MODES;

  const activeReviews = reviews.filter((r) => r.status !== "archived");

  const stats = {
    new: reviews.filter((r) => r.status === "new").length,
    pending: reviews.filter((r) => r.status === "pending").length,
    auto: reviews.filter((r) => r.status === "auto").length,
    sent: reviews.filter((r) => r.status === "sent").length,
    archived: reviews.filter((r) => r.status === "archived").length,
  };

  const counts = {
    all: activeReviews.length,
    ...stats,
  };

  const filteredReviews =
    activeFilter === "all"
      ? activeReviews
      : reviews.filter((r) => r.status === activeFilter);

  const handleSync = () => {
    syncReviews.mutate();
  };


  const lastSyncFormatted = settings?.last_sync_at
    ? format(new Date(settings.last_sync_at), "d MMM yyyy 'в' HH:mm", {
        locale: ru,
      })
    : "Ещё не синхронизировано";

  return (
    <div className="min-h-screen bg-background">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {activeTab === "chats" ? (
          <ChatsSection />
        ) : (
          <>
            <ApiStatus
              isConnected={!!settings?.wb_api_key}
              lastSync={lastSyncFormatted}
              replyModes={replyModes}
              onSync={handleSync}
              isSyncing={syncReviews.isPending}
              onFetchArchive={() => fetchArchive.mutate()}
              isFetchingArchive={fetchArchive.isPending}
            />

            <StatsCards
              newCount={stats.new}
              pendingCount={stats.pending}
              autoCount={stats.auto}
              sentCount={stats.sent}
            />

            <FilterTabs
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              counts={counts}
            />

            {reviewsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    id={review.id}
                    rating={review.rating}
                    authorName={review.author_name}
                    date={format(new Date(review.created_date), "d MMM yyyy", {
                      locale: ru,
                    })}
                    productName={review.product_name}
                    productArticle={review.product_article}
                    status={review.status}
                    images={
                      (Array.isArray(review.photo_links) ? review.photo_links : []).map((link: any) =>
                        typeof link === "string" ? link : (link?.miniSize || link?.fullSize || "")
                      ).filter(Boolean)
                    }
                    text={review.text}
                    aiDraft={review.ai_draft}
                    sentAnswer={review.sent_answer}
                  />
                ))}

                {filteredReviews.length === 0 && !reviewsLoading && (
                  <div className="text-center py-12 text-muted-foreground">
                    {reviews.length === 0
                      ? "Нажмите «Синхронизировать» чтобы загрузить отзывы с WB"
                      : "Нет отзывов в этой категории"}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Index;
