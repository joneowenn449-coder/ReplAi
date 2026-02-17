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
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant={activeTab === "reviews" ? "default" : "ghost"}
        size="sm"
        onClick={() => onTabChange("reviews")}
        data-testid="tab-reviews"
      >
        Отзывы
      </Button>
      <Button
        variant={activeTab === "dashboard" ? "default" : "ghost"}
        size="sm"
        onClick={() => onTabChange("dashboard")}
        data-testid="tab-dashboard"
        className="gap-2"
      >
        <BarChart3 className="w-4 h-4" />
        Сводка
      </Button>
      <Button
        variant={activeTab === "chats" ? "default" : "ghost"}
        size="sm"
        onClick={() => onTabChange("chats")}
        data-testid="tab-chats"
        className="gap-2"
      >
        <MessageCircle className="w-4 h-4" />
        Чаты
        {unreadChatsCount > 0 && (
          <Badge variant="destructive" className="ml-1 text-[11px]" data-testid="badge-unread-chats">
            {unreadChatsCount > 99 ? "99+" : unreadChatsCount}
          </Badge>
        )}
      </Button>
      <Button
        variant={activeTab === "ai" ? "default" : "ghost"}
        size="sm"
        onClick={() => onTabChange("ai")}
        data-testid="tab-ai"
        className="gap-2"
      >
        <Bot className="w-4 h-4" />
        AI аналитик
      </Button>
      <Button
        variant={activeTab === "guide" ? "default" : "ghost"}
        size="sm"
        onClick={() => onTabChange("guide")}
        data-testid="tab-guide"
        className="gap-2"
      >
        <BookOpen className="w-4 h-4" />
        Как начать
      </Button>
    </div>
  );
};
