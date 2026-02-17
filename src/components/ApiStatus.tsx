import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReplyModes, DEFAULT_REPLY_MODES } from "@/hooks/useReviews";

interface ApiStatusProps {
  isConnected: boolean;
  lastSync: string;
  replyModes: ReplyModes;
  onSync: () => void;
  isSyncing?: boolean;
}

function formatReplyModesSummary(modes: ReplyModes): string {
  const autoRatings: number[] = [];
  const manualRatings: number[] = [];

  for (let i = 1; i <= 5; i++) {
    if (modes[String(i)] === "auto") {
      autoRatings.push(i);
    } else {
      manualRatings.push(i);
    }
  }

  if (autoRatings.length === 0) return "Все вручную";
  if (autoRatings.length === 5) return "Все авто";

  const formatRange = (nums: number[]) => {
    if (nums.length === 0) return "";
    const sorted = [...nums].sort((a, b) => a - b);
    if (sorted.length === 1) return `${sorted[0]}`;
    const isConsecutive = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
    if (isConsecutive) return `${sorted[0]}-${sorted[sorted.length - 1]}`;
    return sorted.map((n) => `${n}`).join(", ");
  };

  const parts: string[] = [];
  if (autoRatings.length > 0) parts.push(`Авто: ${formatRange(autoRatings)}`);
  if (manualRatings.length > 0) parts.push(`Ручной: ${formatRange(manualRatings)}`);
  return parts.join(" | ");
}

export const ApiStatus = ({
  isConnected,
  lastSync,
  replyModes,
  onSync,
  isSyncing = false,
}: ApiStatusProps) => {
  const summary = formatReplyModesSummary(replyModes);

  return (
    <div className="bg-card rounded-xl border border-border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-3 h-3 rounded-full shrink-0 ${
            isConnected ? "bg-success" : "bg-destructive"
          }`}
        />
        <div className="min-w-0">
          <p className="font-medium text-foreground text-sm sm:text-base">
            WB API {isConnected ? "подключён" : "отключён"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {lastSync}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-end">
        <span className="text-xs sm:text-sm text-muted-foreground truncate">{summary}</span>
        <Button
          onClick={onSync}
          variant="outline"
          size="sm"
          disabled={isSyncing}
          className="bg-primary/10 border-primary/20 text-primary shrink-0 text-xs sm:text-sm"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2", isSyncing && "animate-spin")} />
          <span className="hidden sm:inline">{isSyncing ? "Синхронизация..." : "Синхронизировать"}</span>
          <span className="sm:hidden">{isSyncing ? "Синхр..." : "Синхр."}</span>
        </Button>
      </div>
    </div>
  );
};
