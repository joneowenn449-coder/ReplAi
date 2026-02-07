import { Clock, Send } from "lucide-react";

interface StatsCardsProps {
  pendingCount: number;
  answeredCount: number;
}

export const StatsCards = ({
  pendingCount,
  answeredCount,
}: StatsCardsProps) => {
  const stats = [
    {
      label: "Ожидают",
      value: pendingCount,
      icon: Clock,
      iconClass: "text-warning",
      bgClass: "bg-warning/10",
    },
    {
      label: "Отвечено",
      value: answeredCount,
      icon: Send,
      iconClass: "text-success",
      bgClass: "bg-success/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
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
