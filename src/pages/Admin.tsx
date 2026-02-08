import { useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutDashboard, Users, ArrowRightLeft } from "lucide-react";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { UsersTable } from "@/components/admin/UsersTable";
import { TransactionsTable } from "@/components/admin/TransactionsTable";

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
              <h1 className="text-xl font-bold text-foreground">Админ-панель</h1>
              <p className="text-sm text-muted-foreground">Управление пользователями и токенами</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Обзор
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              Транзакции
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
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
