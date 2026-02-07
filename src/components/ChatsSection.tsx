import { useState, useCallback } from "react";
import { useChats, useSyncChats, useMarkChatRead } from "@/hooks/useChats";
import { ChatList } from "@/components/ChatList";
import { ChatWindow } from "@/components/ChatWindow";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";

export const ChatsSection = () => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const { data: chats = [], isLoading } = useChats();
  const syncChats = useSyncChats();
  const markRead = useMarkChatRead();

  const selectedChat = chats.find((c) => c.chat_id === selectedChatId) ?? null;

  const handleSelectChat = useCallback(
    (chatId: string) => {
      setSelectedChatId(chatId);
      const chat = chats.find((c) => c.chat_id === chatId);
      if (chat && !chat.is_read) {
        markRead.mutate(chatId);
      }
    },
    [chats, markRead]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Чаты с покупателями</h2>
          <p className="text-sm text-muted-foreground">
            {chats.length} {chats.length === 1 ? "чат" : chats.length < 5 ? "чата" : "чатов"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncChats.mutate()}
          disabled={syncChats.isPending}
        >
          {syncChats.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Синхронизировать
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden flex" style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}>
        {/* Chat list panel */}
        <div className="w-80 border-r border-border shrink-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ChatList
              chats={chats}
              selectedChatId={selectedChatId}
              onSelectChat={handleSelectChat}
            />
          )}
        </div>

        {/* Chat window */}
        <ChatWindow chat={selectedChat} />
      </div>
    </div>
  );
};
