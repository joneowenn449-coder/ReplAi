import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  MessageSquare,
} from "lucide-react";
import {
  useConversationList,
  useCreateConversation,
  useRenameConversation,
  useTogglePin,
  useDeleteConversation,
  type AiConversation,
} from "@/hooks/useAiConversations";
import { isToday, isYesterday } from "date-fns";

type Props = {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
};

export function AiChatSidebar({ activeId, onSelect, onNewChat }: Props) {
  const { data: conversations = [], isLoading } = useConversationList();
  const renameMutation = useRenameConversation();
  const togglePinMutation = useTogglePin();
  const deleteMutation = useDeleteConversation();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingId]);

  const startRename = (conv: AiConversation) => {
    setRenamingId(conv.id);
    setRenameValue(conv.title);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      renameMutation.mutate({ id: renamingId, title: renameValue.trim() });
    }
    setRenamingId(null);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
    if (activeId === id) onNewChat();
  };

  // Group conversations
  const pinned = conversations.filter((c) => c.is_pinned);
  const unpinned = conversations.filter((c) => !c.is_pinned);

  const todayItems = unpinned.filter((c) => isToday(new Date(c.updated_at)));
  const yesterdayItems = unpinned.filter((c) => isYesterday(new Date(c.updated_at)));
  const olderItems = unpinned.filter(
    (c) => !isToday(new Date(c.updated_at)) && !isYesterday(new Date(c.updated_at))
  );

  const renderItem = (conv: AiConversation) => {
    const isActive = conv.id === activeId;
    const isRenaming = conv.id === renamingId;

    return (
      <div
        key={conv.id}
        className={`group flex items-center gap-1.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all duration-150 ${
          isActive
            ? "bg-secondary/80 text-foreground"
            : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
        }`}
        onClick={() => !isRenaming && onSelect(conv.id)}
      >
        <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-50" />
        {isRenaming ? (
          <Input
            ref={renameRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenamingId(null);
            }}
            className="h-6 text-[13px] px-1.5 py-0 border-border/50 bg-background"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-[13px] truncate leading-tight">
            {conv.title}
          </span>
        )}
        {!isRenaming && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-secondary transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinMutation.mutate({ id: conv.id, is_pinned: !conv.is_pinned });
                }}
              >
                {conv.is_pinned ? (
                  <>
                    <PinOff className="w-3.5 h-3.5 mr-2" /> Открепить
                  </>
                ) : (
                  <>
                    <Pin className="w-3.5 h-3.5 mr-2" /> Закрепить
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  startRename(conv);
                }}
              >
                <Pencil className="w-3.5 h-3.5 mr-2" /> Переименовать
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(conv.id);
                }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  const renderSection = (label: string, items: AiConversation[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-3">
        <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">
          {label}
        </div>
        <div className="space-y-0.5">{items.map(renderItem)}</div>
      </div>
    );
  };

  return (
    <div className="w-64 border-r border-border/40 flex flex-col bg-background/50 shrink-0">
      <div className="p-3 border-b border-border/40">
        <Button
          onClick={onNewChat}
          variant="outline"
          className="w-full justify-start gap-2 rounded-xl h-9 text-[13px] font-medium border-border/50 hover:bg-secondary/60"
        >
          <Plus className="w-4 h-4" />
          Новый чат
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="text-center py-8 text-[12px] text-muted-foreground/50">
              Загрузка...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-[12px] text-muted-foreground/50">
              Нет чатов
            </div>
          ) : (
            <>
              {renderSection("Закреплённые", pinned)}
              {renderSection("Сегодня", todayItems)}
              {renderSection("Вчера", yesterdayItems)}
              {renderSection("Ранее", olderItems)}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
