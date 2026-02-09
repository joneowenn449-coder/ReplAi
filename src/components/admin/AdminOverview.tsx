import { useAdminOverview } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Coins, ArrowRightLeft, MessageSquare, BrainCircuit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const AdminOverview = () => {
  const { data, isLoading } = useAdminOverview();

  const stats = [
    { label: "Пользователей", value: data?.totalUsers ?? 0, icon: Users, color: "text-primary" },
    { label: "Общий баланс токенов", value: data?.totalBalance ?? 0, icon: Coins, color: "text-warning" },
    { label: "Общий баланс AI-запросов", value: data?.totalAiBalance ?? 0, icon: BrainCircuit, color: "text-primary" },
    { label: "Транзакций сегодня", value: data?.todayTransactions ?? 0, icon: ArrowRightLeft, color: "text-success" },
    { label: "Всего отзывов", value: data?.totalReviews ?? 0, icon: MessageSquare, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="p-3 rounded-xl bg-secondary">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-7 w-16 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              )}
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
