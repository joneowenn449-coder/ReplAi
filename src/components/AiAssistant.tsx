import { useState, useRef, useEffect, useCallback } from "react";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { useAiRequestBalance } from "@/hooks/useAiRequestBalance";
import { useCreateConversation } from "@/hooks/useAiConversations";
import { AiChatSidebar } from "@/components/AiChatSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Loader2,
  Sparkles,
  Zap,
  History,
} from "lucide-react";

const QUICK_QUESTIONS = [
  "Статистика по всем товарам",
  "Основные жалобы покупателей",
  "Какие товары лучше всего оценены?",
  "Отзывы с оценкой ниже 3",
  "Что чаще всего хвалят покупатели?",
];

export function AiAssistant() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const createConversation = useCreateConversation();
  const { messages, isLoading, isLoadingHistory, sendMessage, clearMessages } = useAiAssistant(activeConversationId);
  const { data: aiBalance, isLoading: balanceLoading } = useAiRequestBalance();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasBalance = aiBalance !== null && aiBalance !== undefined && aiBalance > 0;
  const balanceExhausted = aiBalance !== null && aiBalance !== undefined && aiBalance <= 0 && !balanceLoading;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (activeConversationId) return activeConversationId;
    const conv = await createConversation.mutateAsync("Новый чат");
    setActiveConversationId(conv.id);
    return conv.id;
  }, [activeConversationId, createConversation]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || !hasBalance) return;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    const convId = await ensureConversation();
    sendMessage(text, convId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickQuestion = async (q: string) => {
    if (isLoading || !hasBalance) return;
    const convId = await ensureConversation();
    sendMessage(q, convId);
  };

  const handleTextareaInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    clearMessages();
    setShowSidebar(false);
  };

  const handleSelectChat = (id: string) => {
    setActiveConversationId(id);
    setShowSidebar(false);
  };

  const isEmpty = messages.length === 0 && !isLoadingHistory;

  return (
    <div className="flex h-[calc(100vh-180px)] bg-background rounded-2xl border border-border/60 overflow-hidden shadow-sm relative">
      {showSidebar && (
        <div
          className="fixed inset-0 z-10 bg-black/30 sm:hidden"
          onClick={() => setShowSidebar(false)}
          data-testid="backdrop-ai-sidebar"
        />
      )}
      <div className={`${showSidebar ? 'block absolute inset-0 z-20 sm:relative sm:inset-auto' : 'hidden sm:block'}`}>
        <AiChatSidebar
          activeId={activeConversationId}
          onSelect={handleSelectChat}
          onNewChat={handleNewChat}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-border/40 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
              className="sm:hidden shrink-0"
              data-testid="button-ai-sidebar-toggle"
            >
              <History className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-primary" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground">
                AI Аналитик
              </h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground hidden sm:block">
                Знает все отзывы, товары и артикулы
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!balanceLoading && aiBalance !== null && aiBalance !== undefined && (
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-secondary/60 text-[10px] sm:text-[11px] text-muted-foreground font-medium">
                <Zap className="w-3 h-3" />
                <span>{aiBalance}</span>
                <span className="hidden sm:inline">запросов</span>
              </div>
            )}
          </div>
        </div>

        {balanceExhausted && (
          <div className="px-3 sm:px-5 py-2 sm:py-2.5 bg-destructive/8 border-b border-destructive/15 text-[12px] sm:text-[13px] text-destructive flex items-center gap-2">
            <Zap className="w-4 h-4 shrink-0" />
            <span>Запросы закончились. Приобретите пакет для продолжения.</span>
          </div>
        )}

        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="px-3 sm:px-5 py-4 sm:py-5 space-y-4 sm:space-y-5">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : isEmpty ? (
              <div className="flex flex-col items-center justify-center py-10 sm:py-16 space-y-6 sm:space-y-8">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-primary/8 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-primary/70" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                    Привет! Я AI-аналитик
                  </h3>
                  <p className="text-[12px] sm:text-[13px] text-muted-foreground max-w-sm leading-relaxed px-4">
                    Я знаю все о ваших товарах и отзывах. 
                    Задайте вопрос или выберите из готовых:
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-md px-2">
                  {QUICK_QUESTIONS.map((q, idx) => (
                    <button
                      key={q}
                      onClick={() => handleQuickQuestion(q)}
                      disabled={!hasBalance}
                      className="px-3 sm:px-3.5 py-1.5 sm:py-2 text-[12px] sm:text-[13px] rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm text-foreground hover:bg-secondary/80 hover:border-border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      data-testid={`button-quick-question-${idx}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-3.5 sm:px-5 py-3 sm:py-3.5 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground text-[13px] sm:text-[14px] leading-relaxed"
                        : "bg-secondary/50 backdrop-blur-sm text-foreground"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none
                        prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground prose-headings:mt-4 prose-headings:mb-2
                        prose-p:leading-relaxed prose-p:text-[13px] sm:prose-p:text-[14px] prose-p:text-foreground prose-p:my-1.5
                        prose-li:text-[13px] sm:prose-li:text-[14px] prose-li:text-foreground prose-li:my-0.5
                        prose-strong:font-semibold prose-strong:text-foreground
                        prose-ul:my-2 prose-ol:my-2
                        prose-h3:text-[14px] sm:prose-h3:text-[15px] prose-h2:text-base">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                        {i === messages.length - 1 && isLoading && (
                          <span className="inline-block w-1.5 h-4 bg-primary/50 ml-0.5 animate-pulse rounded-sm" />
                        )}
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-secondary/50 backdrop-blur-sm rounded-2xl px-3.5 sm:px-5 py-3 sm:py-3.5 text-[13px] sm:text-[14px] text-muted-foreground flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-primary/60" />
                  Анализирую отзывы...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border/40 p-2.5 sm:p-3 bg-background/80 backdrop-blur-sm">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleTextareaInput}
              placeholder={balanceExhausted ? "Запросы закончились" : "Задайте вопрос..."}
              className="resize-none min-h-[40px] sm:min-h-[42px] max-h-[120px] text-[13px] sm:text-[14px] rounded-2xl border-border/50 bg-secondary/30 shadow-sm focus-visible:ring-primary/30 placeholder:text-muted-foreground/60"
              rows={1}
              disabled={isLoading || balanceExhausted}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !hasBalance}
              size="icon"
              className="flex-shrink-0 h-[40px] w-[40px] sm:h-[42px] sm:w-[42px] rounded-xl shadow-sm transition-all duration-200"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
