import { cn } from "@/lib/utils";
import { BarChart3, Bot, MessageCircle } from "lucide-react";

interface NavTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadChatsCount?: number;
}

export const NavTabs = ({ activeTab, onTabChange, unreadChatsCount = 0 }: NavTabsProps) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onTabChange("reviews")}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium transition-all",
          activeTab === "reviews"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        Отзывы
      </button>
      <button
        onClick={() => onTabChange("dashboard")}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
          activeTab === "dashboard"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        <BarChart3 className="w-4 h-4" />
        Сводка
      </button>
      <button
        onClick={() => onTabChange("chats")}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
          activeTab === "chats"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        <MessageCircle className="w-4 h-4" />
        Чаты
        {unreadChatsCount > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold leading-none">
            {unreadChatsCount > 99 ? "99+" : unreadChatsCount}
          </span>
        )}
      </button>
      <button
        onClick={() => onTabChange("ai")}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
          activeTab === "ai"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        <Bot className="w-4 h-4" />
        AI аналитик
      </button>
    </div>
  );
};
