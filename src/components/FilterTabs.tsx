import { cn } from "@/lib/utils";

interface FilterTabsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: {
    all: number;
    pending: number;
    answered: number;
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
    { id: "pending", label: "Ожидают", count: counts.pending },
    { id: "answered", label: "Отвечено", count: counts.answered },
    { id: "archived", label: "Архив", count: counts.archived },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-border pb-4 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={cn(
            "tab-filter flex items-center gap-1.5 sm:gap-2 shrink-0 text-xs sm:text-sm",
            activeFilter === filter.id && "tab-filter-active"
          )}
        >
          {filter.label}
          {(filter.count > 0 || filter.id === "all") && (
            <span
              className={cn(
                "text-[10px] sm:text-xs px-1.5 py-0.5 rounded",
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
