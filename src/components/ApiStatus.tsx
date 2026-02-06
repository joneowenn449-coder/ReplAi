import { Switch } from "@/components/ui/switch";
import { RefreshCw, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ApiStatusProps {
  isConnected: boolean;
  lastSync: string;
  autoReply: boolean;
  onAutoReplyChange: (value: boolean) => void;
  onSync: () => void;
  isSyncing?: boolean;
  onFetchArchive?: () => void;
  isFetchingArchive?: boolean;
}

export const ApiStatus = ({
  isConnected,
  lastSync,
  autoReply,
  onAutoReplyChange,
  onSync,
  isSyncing = false,
  onFetchArchive,
  isFetchingArchive = false,
}: ApiStatusProps) => {
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
        <div className="flex items-center gap-2">
          <Switch checked={autoReply} onCheckedChange={onAutoReplyChange} />
          <span className="text-sm font-medium text-foreground">Авто-ответы</span>
        </div>
        {isConnected && onFetchArchive && (
          <Button
            onClick={onFetchArchive}
            variant="outline"
            disabled={isFetchingArchive}
          >
            <Archive className={cn("w-4 h-4 mr-2", isFetchingArchive && "animate-pulse")} />
            {isFetchingArchive ? "Загрузка..." : "Загрузить архив"}
          </Button>
        )}
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
