import { useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutDashboard, Users, ArrowRightLeft, Bot } from "lucide-react";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { UsersTable } from "@/components/admin/UsersTable";
import { TransactionsTable } from "@/components/admin/TransactionsTable";
import { AISettings } from "@/components/admin/AISettings";
import { UserDetailModal } from "@/components/admin/UserDetailModal";
import type { AdminUser } from "@/hooks/useAdmin";

const Admin = () => {
  const [tab, setTab] = useState("overview");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground" data-testid="text-admin-title">Админ-панель</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Управление пользователями и настройками</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto scrollbar-hide mb-4 sm:mb-6">
            <TabsList className="gap-1 w-max">
              <TabsTrigger value="overview" className="gap-1.5 sm:gap-2 text-xs sm:text-sm" data-testid="tab-overview">
                <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Обзор
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5 sm:gap-2 text-xs sm:text-sm" data-testid="tab-users">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Пользователи</span>
                <span className="sm:hidden">Юзеры</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="gap-1.5 sm:gap-2 text-xs sm:text-sm" data-testid="tab-transactions">
                <ArrowRightLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Транзакции</span>
                <span className="sm:hidden">Тр-ции</span>
              </TabsTrigger>
              <TabsTrigger value="ai-settings" className="gap-1.5 sm:gap-2 text-xs sm:text-sm" data-testid="tab-ai-settings">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Настройки ИИ</span>
                <span className="sm:hidden">ИИ</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <AdminOverview />
          </TabsContent>

          <TabsContent value="users">
            <UsersTable onSelectUser={setSelectedUser} />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsTable />
          </TabsContent>

          <TabsContent value="ai-settings">
            <AISettings />
          </TabsContent>
        </Tabs>
      </div>

      <UserDetailModal
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
};

export default Admin;
