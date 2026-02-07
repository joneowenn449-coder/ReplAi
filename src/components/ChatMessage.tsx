import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/hooks/useChats";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessageBubble = ({ message }: ChatMessageProps) => {
  const isSeller = message.sender === "seller";

  return (
    <div
      className={cn("flex", isSeller ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isSeller
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-secondary text-secondary-foreground rounded-bl-md"
        )}
      >
        {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.attachments.map((att, i) => (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md",
                  isSeller ? "bg-primary-foreground/20" : "bg-muted"
                )}
              >
                {att.type === "image" ? "🖼" : "📎"}{" "}
                {att.name || `Файл ${i + 1}`}
              </span>
            ))}
          </div>
        )}

        <p
          className={cn(
            "text-[11px] mt-1",
            isSeller ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        >
          {format(new Date(message.sent_at), "d MMM, HH:mm", { locale: ru })}
        </p>
      </div>
    </div>
  );
};
