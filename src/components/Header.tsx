import { Settings, LogOut, Coins, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavTabs } from "./NavTabs";
import { useAuth } from "@/hooks/useAuth";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useAdminRole } from "@/hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSettingsClick: () => void;
  unreadChatsCount?: number;
}

export const Header = ({ activeTab, onTabChange, onSettingsClick, unreadChatsCount }: HeaderProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: tokenBalance } = useTokenBalance();
  const { data: isAdmin } = useAdminRole();

  const userInitial = user?.email ? user.email[0].toUpperCase() : "?";

  return (
    <div className="bg-card border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          {/* Logo */}
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
            {/* Token balance in header */}
            {tokenBalance !== null && tokenBalance !== undefined && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-sm">
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{tokenBalance}</span>
                  <span className="text-muted-foreground">токенов</span>
                </div>
                <Button
                  size="sm"
                  className="text-xs h-8 px-3"
                  onClick={() => navigate("/pricing")}
                >
                  Пополнить
                </Button>
              </div>
            )}

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                <span className="text-sm font-semibold">{userInitial}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium leading-none">{user?.email ?? "—"}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={onSettingsClick} className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Настройки
              </DropdownMenuItem>

              {isAdmin && (
              <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                <Shield className="w-4 h-4 mr-2" />
                Админ-панель
              </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Выйти
              </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <NavTabs activeTab={activeTab} onTabChange={onTabChange} unreadChatsCount={unreadChatsCount} />

        <div className="mt-6">
          <h1 className="text-2xl font-bold text-foreground">Отзывы Wildberries</h1>
          <p className="text-muted-foreground mt-1">
            Управление отзывами и автоответами с помощью ИИ
          </p>
        </div>
      </div>
    </div>
  );
};
