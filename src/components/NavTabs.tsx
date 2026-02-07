import { cn } from "@/lib/utils";
import { Bot, MessageCircle } from "lucide-react";

interface NavTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const NavTabs = ({ activeTab, onTabChange }: NavTabsProps) => {
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
        AI
      </button>
    </div>
  );
};
