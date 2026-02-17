import { useState, useCallback } from "react";
import { useChats, useSyncChats, useMarkChatRead } from "@/hooks/useChats";
import { ChatList } from "@/components/ChatList";
import { ChatWindow } from "@/components/ChatWindow";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, ArrowLeft } from "lucide-react";

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

  const handleBack = useCallback(() => {
    setSelectedChatId(null);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {selectedChatId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="sm:hidden"
              data-testid="button-back-to-chats"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-semibold">Чаты с покупателями</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {chats.length} {chats.length === 1 ? "чат" : chats.length < 5 ? "чата" : "чатов"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncChats.mutate()}
          disabled={syncChats.isPending}
          className="text-xs sm:text-sm"
        >
          {syncChats.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1.5 sm:mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1.5 sm:mr-2" />
          )}
          <span className="hidden sm:inline">Синхронизировать</span>
          <span className="sm:hidden">Синхр.</span>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden flex" style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}>
        <div className={`w-full sm:w-80 border-r border-border shrink-0 ${selectedChatId ? 'hidden sm:block' : 'block'}`}>
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

        <div className={`flex-1 min-w-0 ${!selectedChatId ? 'hidden sm:flex' : 'flex'}`}>
          <ChatWindow chat={selectedChat} onBack={handleBack} />
        </div>
      </div>
    </div>
  );
};
