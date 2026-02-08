import { Settings, LogOut, Coins, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavTabs } from "./NavTabs";
import { useAuth } from "@/hooks/useAuth";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useAdminRole } from "@/hooks/useAdmin";
import { Link } from "react-router-dom";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSettingsClick: () => void;
  unreadChatsCount?: number;
}

export const Header = ({ activeTab, onTabChange, onSettingsClick, unreadChatsCount }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const { data: tokenBalance } = useTokenBalance();
  const { data: isAdmin } = useAdminRole();

  return (
    <div className="bg-card border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
              <path d="M10 12C10 10.8954 10.8954 10 12 10H16C18.2091 10 20 11.7909 20 14C20 16.2091 18.2091 18 16 18H13V22H10V12ZM13 15H16C16.5523 15 17 14.5523 17 14C17 13.4477 16.5523 13 16 13H13V15Z" fill="white" />
              <path d="M16 16L21 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="text-xl font-bold tracking-tight">
              Repl<span className="text-primary">Ai</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Token Balance */}
            {tokenBalance !== null && tokenBalance !== undefined && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-sm font-medium">
                <Coins className="w-4 h-4 text-primary" />
                <span>{tokenBalance}</span>
                <span className="text-muted-foreground">токенов</span>
              </div>
            )}

            {/* Admin link */}
            {isAdmin && (
              <Button variant="ghost" size="sm" asChild className="gap-1.5">
                <Link to="/admin">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Админ</span>
                </Link>
              </Button>
            )}

            {/* User email */}
            {user?.email && (
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user.email}
              </span>
            )}

            <Button variant="ghost" size="icon" onClick={signOut} title="Выйти">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <NavTabs activeTab={activeTab} onTabChange={onTabChange} unreadChatsCount={unreadChatsCount} />
        
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
