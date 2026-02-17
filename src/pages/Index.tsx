import { useState } from "react";
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
import {
  useReviews,
  useSyncReviews,
  DEFAULT_REPLY_MODES,
} from "@/hooks/useReviews";
import { useActiveCabinet } from "@/hooks/useCabinets";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("reviews");
  const [activeFilter, setActiveFilter] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<"telegram" | undefined>(undefined);
  const [syncingCabinetId, setSyncingCabinetId] = useState<string | null>(null);

  const { data: reviews = [], isLoading: reviewsLoading } = useReviews();
  const { data: chats = [] } = useChats();
  const { data: activeCabinet } = useActiveCabinet();
  const syncReviews = useSyncReviews();

  const unreadChatsCount = chats.filter((c) => !c.is_read).length;

  const replyModes = (activeCabinet?.reply_modes as Record<string, "auto" | "manual">) ?? DEFAULT_REPLY_MODES;

  const activeReviews = reviews.filter((r) => r.status !== "archived");

  const stats = {
    pending: reviews.filter((r) => r.status === "pending").length,
    answered: reviews.filter((r) => r.status === "auto" || r.status === "sent" || r.status === "answered_externally").length,
    archived: reviews.filter((r) => r.status === "archived").length,
  };

  const counts = {
    all: activeReviews.length,
    ...stats,
  };

  const filteredReviews =
    activeFilter === "all"
      ? activeReviews
      : activeFilter === "answered"
        ? reviews.filter((r) => r.status === "auto" || r.status === "sent" || r.status === "answered_externally")
        : reviews.filter((r) => r.status === activeFilter);

  const handleSync = () => {
    if (!activeCabinet?.id) return;
    setSyncingCabinetId(activeCabinet.id);
    syncReviews.mutate(undefined, {
      onSettled: () => setSyncingCabinetId(null),
    });
  };

  const lastSyncFormatted = activeCabinet?.last_sync_at
    ? format(new Date(activeCabinet.last_sync_at), "d MMM yyyy 'в' HH:mm", {
        locale: ru,
      })
    : "Ещё не синхронизировано";

  return (
    <div className="min-h-screen bg-background">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSettingsClick={() => { setSettingsInitialSection(undefined); setSettingsOpen(true); }}
        onTelegramClick={() => { setSettingsInitialSection("telegram"); setSettingsOpen(true); }}
        unreadChatsCount={unreadChatsCount}
      />

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {activeTab === "ai" ? (
          <AiAssistant />
        ) : activeTab === "chats" ? (
          <ChatsSection />
        ) : activeTab === "dashboard" ? (
          <DashboardSection reviews={reviews} isLoading={reviewsLoading} />
        ) : (
          <>
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
                    date={format(new Date(review.created_date), "d MMM yyyy 'в' HH:mm", {
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
                    pros={review.pros}
                    cons={review.cons}
                    aiDraft={review.ai_draft}
                    sentAnswer={review.sent_answer}
                    isEdited={review.is_edited}
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

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={(v) => {
          setSettingsOpen(v);
          if (!v) setSettingsInitialSection(undefined);
        }}
        initialSection={settingsInitialSection}
      />
    </div>
  );
};

export default Index;
