import { cn } from "@/lib/utils";
import type { Chat } from "@/hooks/useChats";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle } from "lucide-react";

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
}

export const ChatList = ({
  chats,
  selectedChatId,
  onSelectChat,
}: ChatListProps) => {
  if (chats.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-2 p-4">
          <MessageCircle className="w-8 h-8 mx-auto opacity-40" />
          <p className="text-sm">Нет чатов</p>
          <p className="text-xs">
            Нажмите «Синхронизировать» чтобы загрузить чаты с WB
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">
        {chats.map((chat) => (
          <button
            key={chat.chat_id}
            onClick={() => onSelectChat(chat.chat_id)}
            className={cn(
              "w-full text-left px-4 py-3 transition-colors hover:bg-secondary/50",
              selectedChatId === chat.chat_id && "bg-secondary"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium shrink-0 mt-0.5">
                {chat.client_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">
                    {chat.client_name}
                  </span>
                  {chat.last_message_at && (
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {format(new Date(chat.last_message_at), "d MMM", {
                        locale: ru,
                      })}
                    </span>
                  )}
                </div>
                {chat.product_name && (
                  <p className="text-xs text-muted-foreground truncate">
                    {chat.product_name}
                  </p>
                )}
                {chat.last_message_text && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {chat.last_message_text}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};
