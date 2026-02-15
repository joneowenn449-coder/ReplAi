import { useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutDashboard, Users, ArrowRightLeft, Bot } from "lucide-react";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { UsersTable } from "@/components/admin/UsersTable";
import { TransactionsTable } from "@/components/admin/TransactionsTable";
import { AISettings } from "@/components/admin/AISettings";

const Admin = () => {
  const [tab, setTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground" data-testid="text-admin-title">Админ-панель</h1>
              <p className="text-sm text-muted-foreground">Управление пользователями и настройками</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex-wrap gap-1">
            <TabsTrigger value="overview" className="gap-2" data-testid="tab-overview">
              <LayoutDashboard className="w-4 h-4" />
              Обзор
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
              <Users className="w-4 h-4" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2" data-testid="tab-transactions">
              <ArrowRightLeft className="w-4 h-4" />
              Транзакции
            </TabsTrigger>
            <TabsTrigger value="ai-settings" className="gap-2" data-testid="tab-ai-settings">
              <Bot className="w-4 h-4" />
              Настройки ИИ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminOverview />
          </TabsContent>

          <TabsContent value="users">
            <UsersTable />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsTable />
          </TabsContent>

          <TabsContent value="ai-settings">
            <AISettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
