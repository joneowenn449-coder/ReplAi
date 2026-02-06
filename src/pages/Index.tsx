import { useState } from "react";
import { Header } from "@/components/Header";
import { ApiStatus } from "@/components/ApiStatus";
import { StatsCards } from "@/components/StatsCards";
import { FilterTabs } from "@/components/FilterTabs";
import { ReviewCard } from "@/components/ReviewCard";
import { toast } from "sonner";

// Моковые данные для демонстрации
const mockReviews = [
  {
    id: "1",
    rating: 5,
    authorName: "Дарья",
    date: "6 фев. 2026",
    productName: "Сумка кросс-боди через плечо маленькая • LUNÉRA",
    productArticle: "722695948",
    status: "auto" as const,
    images: [
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=100&h=100&fit=crop",
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=100&h=100&fit=crop",
      "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=100&h=100&fit=crop",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=100&h=100&fit=crop",
    ],
  },
  {
    id: "2",
    rating: 4,
    authorName: "Анна",
    date: "5 фев. 2026",
    productName: "Рюкзак городской женский • LUNÉRA",
    productArticle: "856234712",
    status: "sent" as const,
    text: "Отличный рюкзак, вместительный и стильный. Немного тяжеловат, но качество на высоте.",
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=100&h=100&fit=crop",
    ],
  },
  {
    id: "3",
    rating: 5,
    authorName: "Мария",
    date: "5 фев. 2026",
    productName: "Кошелек женский из натуральной кожи • LUNÉRA",
    productArticle: "634892156",
    status: "sent" as const,
    text: "Кошелек просто супер! Мягкая кожа, удобные отделения.",
  },
  {
    id: "4",
    rating: 3,
    authorName: "Екатерина",
    date: "4 фев. 2026",
    productName: "Клатч вечерний с цепочкой • LUNÉRA",
    productArticle: "923847561",
    status: "auto" as const,
    text: "Цепочка оказалась короче, чем на фото. В остальном нормально.",
    images: [
      "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=100&h=100&fit=crop",
      "https://images.unsplash.com/photo-1612902456551-333ac5afa26e?w=100&h=100&fit=crop",
    ],
  },
  {
    id: "5",
    rating: 5,
    authorName: "Ольга",
    date: "4 фев. 2026",
    productName: "Сумка-шоппер большая • LUNÉRA",
    productArticle: "478123965",
    status: "sent" as const,
    text: "Идеальная сумка для ежедневного использования!",
  },
  {
    id: "6",
    rating: 4,
    authorName: "Светлана",
    date: "3 фев. 2026",
    productName: "Ремень женский кожаный • LUNÉRA",
    productArticle: "789456123",
    status: "sent" as const,
  },
  {
    id: "7",
    rating: 5,
    authorName: "Наталья",
    date: "3 фев. 2026",
    productName: "Косметичка дорожная • LUNÉRA",
    productArticle: "321654987",
    status: "sent" as const,
    text: "Очень удобная, много кармашков!",
  },
  {
    id: "8",
    rating: 5,
    authorName: "Ирина",
    date: "2 фев. 2026",
    productName: "Сумка через плечо • LUNÉRA",
    productArticle: "159753486",
    status: "new" as const,
    text: "Очень красивая сумка!",
  },
  {
    id: "9",
    rating: 4,
    authorName: "Елена",
    date: "2 фев. 2026",
    productName: "Клатч • LUNÉRA",
    productArticle: "753159486",
    status: "pending" as const,
  },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState("reviews");
  const [activeFilter, setActiveFilter] = useState("all");
  const [autoReply, setAutoReply] = useState(true);

  const stats = {
    new: mockReviews.filter((r) => r.status === "new").length,
    pending: mockReviews.filter((r) => r.status === "pending").length,
    auto: mockReviews.filter((r) => r.status === "auto").length,
    sent: mockReviews.filter((r) => r.status === "sent").length,
  };

  const counts = {
    all: mockReviews.length,
    ...stats,
  };

  const filteredReviews =
    activeFilter === "all"
      ? mockReviews
      : mockReviews.filter((r) => r.status === activeFilter);

  const handleSync = () => {
    toast.success("Синхронизация запущена");
  };

  const handleSettingsClick = () => {
    toast.info("Настройки будут доступны в следующей версии");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSettingsClick={handleSettingsClick}
      />

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <ApiStatus
          isConnected={true}
          lastSync="6 фев. 2026 в 13:25"
          autoReply={autoReply}
          onAutoReplyChange={setAutoReply}
          onSync={handleSync}
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

        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <ReviewCard key={review.id} {...review} />
          ))}

          {filteredReviews.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Нет отзывов в этой категории
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
