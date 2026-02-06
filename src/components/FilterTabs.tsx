import { cn } from "@/lib/utils";

interface FilterTabsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: {
    all: number;
    new: number;
    pending: number;
    auto: number;
    sent: number;
    archived: number;
  };
}

export const FilterTabs = ({
  activeFilter,
  onFilterChange,
  counts,
}: FilterTabsProps) => {
  const filters = [
    { id: "all", label: "Все", count: counts.all },
    { id: "new", label: "Новые", count: counts.new },
    { id: "pending", label: "Ожидают", count: counts.pending },
    { id: "auto", label: "Автоответ", count: counts.auto },
    { id: "sent", label: "Отправлено", count: counts.sent },
    { id: "archived", label: "Архив", count: counts.archived },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-border pb-4">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={cn(
            "tab-filter flex items-center gap-2",
            activeFilter === filter.id && "tab-filter-active"
          )}
        >
          {filter.label}
          {(filter.count > 0 || filter.id === "all") && (
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded",
                activeFilter === filter.id
                  ? "bg-foreground/10"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {filter.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
