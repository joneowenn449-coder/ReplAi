import { cn } from "@/lib/utils";
import { BarChart3, Bot, MessageCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadChatsCount?: number;
}

export const NavTabs = ({ activeTab, onTabChange, unreadChatsCount = 0 }: NavTabsProps) => {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
      <Button
        variant={activeTab === "reviews" ? "default" : "ghost"}
        size="sm"
        onClick={() => onTabChange("reviews")}
        data-testid="tab-reviews"
        className="shrink-0 text-xs sm:text-sm"
      >
        Отзывы
      </Button>
      <Button
        variant={activeTab === "dashboard" ? "default" : "ghost"}
        size="sm"
        onClick={() => onTabChange("dashboard")}
        data-testid="tab-dashboard"
        className="gap-1.5 sm:gap-2 shrink-0 text-xs sm:text-sm"
      >
        <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        Сводка
      </Button>
      <Button
        variant={activeTab === "chats" ? "default" : "ghost"}
        size="sm"
        onClick={() => onTabChange("chats")}
        data-testid="tab-chats"
        className="gap-1.5 sm:gap-2 shrink-0 text-xs sm:text-sm"
      >
        <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        Чаты
        {unreadChatsCount > 0 && (
          <Badge variant="destructive" className="ml-0.5 sm:ml-1 text-[10px] sm:text-[11px]" data-testid="badge-unread-chats">
            {unreadChatsCount > 99 ? "99+" : unreadChatsCount}
          </Badge>
        )}
      </Button>
      <Button
        variant={activeTab === "ai" ? "default" : "ghost"}
        size="sm"
        onClick={() => onTabChange("ai")}
        data-testid="tab-ai"
        className="gap-1.5 sm:gap-2 shrink-0 text-xs sm:text-sm"
      >
        <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">AI аналитик</span>
        <span className="sm:hidden">AI</span>
      </Button>
      <Button
        variant={activeTab === "guide" ? "default" : "ghost"}
        size="sm"
        onClick={() => onTabChange("guide")}
        data-testid="tab-guide"
        className="gap-1.5 sm:gap-2 shrink-0 text-xs sm:text-sm"
      >
        <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">Как начать</span>
        <span className="sm:hidden">Гайд</span>
      </Button>
    </div>
  );
};
