import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavTabs } from "./NavTabs";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSettingsClick: () => void;
}

export const Header = ({ activeTab, onTabChange, onSettingsClick }: HeaderProps) => {
  return (
    <div className="bg-card border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <NavTabs activeTab={activeTab} onTabChange={onTabChange} />
        
        <div className="flex items-start justify-between mt-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Отзывы Wildberries</h1>
            <p className="text-muted-foreground mt-1">
              Управление отзывами и автоответами с помощью ИИ
            </p>
          </div>
          <Button variant="outline" onClick={onSettingsClick} className="gap-2">
            <Settings className="w-4 h-4" />
            Настройки
          </Button>
        </div>
      </div>
    </div>
  );
};
