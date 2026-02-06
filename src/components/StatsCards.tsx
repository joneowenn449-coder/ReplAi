import { MessageSquare, Clock, Zap, Send } from "lucide-react";

interface StatsCardsProps {
  newCount: number;
  pendingCount: number;
  autoCount: number;
  sentCount: number;
}

export const StatsCards = ({
  newCount,
  pendingCount,
  autoCount,
  sentCount,
}: StatsCardsProps) => {
  const stats = [
    {
      label: "Новые",
      value: newCount,
      icon: MessageSquare,
      iconClass: "text-stat-new-icon",
      bgClass: "bg-stat-new",
    },
    {
      label: "Ожидают",
      value: pendingCount,
      icon: Clock,
      iconClass: "text-warning",
      bgClass: "bg-warning/10",
    },
    {
      label: "Автоответ",
      value: autoCount,
      icon: Zap,
      iconClass: "text-primary",
      bgClass: "bg-primary/10",
    },
    {
      label: "Отправлено",
      value: sentCount,
      icon: Send,
      iconClass: "text-success",
      bgClass: "bg-success/10",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="stat-card">
          <div className={`p-2 rounded-lg ${stat.bgClass}`}>
            <stat.icon className={`w-5 h-5 ${stat.iconClass}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
