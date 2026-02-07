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

  if (autoRatings.length === 0) return "Все ответы вручную";
  if (autoRatings.length === 5) return "Все ответы автоматически";

  const formatRange = (nums: number[]) => {
    if (nums.length === 0) return "";
    const sorted = [...nums].sort((a, b) => a - b);
    if (sorted.length === 1) return `★${sorted[0]}`;
    const isConsecutive = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
    if (isConsecutive) return `★${sorted[0]}-${sorted[sorted.length - 1]}`;
    return sorted.map((n) => `★${n}`).join(", ");
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
    <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full ${
            isConnected ? "bg-success" : "bg-destructive"
          }`}
        />
        <div>
          <p className="font-medium text-foreground">
            WB API {isConnected ? "подключён" : "отключён"}
          </p>
          <p className="text-sm text-muted-foreground">
            Последняя синхронизация: {lastSync}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{summary}</span>
        <Button
          onClick={onSync}
          variant="outline"
          disabled={isSyncing}
          className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:text-primary"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
          {isSyncing ? "Синхронизация..." : "Синхронизировать"}
        </Button>
      </div>
    </div>
  );
};
