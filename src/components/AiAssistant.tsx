import { useState, useRef, useEffect } from "react";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { useAiRequestBalance } from "@/hooks/useAiRequestBalance";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";

const QUICK_QUESTIONS = [
  "📊 Статистика по всем товарам",
  "😤 Основные жалобы покупателей",
  "⭐ Какие товары лучше всего оценены?",
  "📉 Отзывы с оценкой ниже 3",
  "💡 Что чаще всего хвалят покупатели?",
];

export function AiAssistant() {
  const { messages, isLoading, sendMessage, clearMessages } = useAiAssistant();
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

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading || !hasBalance) return;
    setInput("");
    sendMessage(text);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickQuestion = (q: string) => {
    if (isLoading || !hasBalance) return;
    sendMessage(q);
  };

  const handleTextareaInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              AI Аналитик
            </h3>
            <p className="text-xs text-muted-foreground">
              Знает все отзывы, товары и артикулы
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!balanceLoading && aiBalance !== null && aiBalance !== undefined && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs text-muted-foreground">
              <Zap className="w-3 h-3" />
              <span>{aiBalance} запросов</span>
            </div>
          )}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Очистить
            </Button>
          )}
        </div>
      </div>

      {/* Balance exhausted warning */}
      {balanceExhausted && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-sm text-destructive flex items-center gap-2">
          <Zap className="w-4 h-4" />
          У вас закончились запросы AI аналитика. Приобретите пакет запросов для продолжения.
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Привет! Я AI-аналитик
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Я знаю все о ваших товарах и отзывах на Wildberries. 
                  Задайте вопрос или выберите из готовых:
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQuickQuestion(q)}
                    disabled={!hasBalance}
                    className="px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {msg.content}
                  {msg.role === "assistant" &&
                    i === messages.length - 1 &&
                    isLoading && (
                      <span className="inline-block w-1.5 h-4 bg-primary/60 ml-0.5 animate-pulse rounded-sm" />
                    )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-secondary rounded-xl px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Анализирую отзывы...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-3 bg-card">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleTextareaInput}
            placeholder={balanceExhausted ? "Запросы закончились — приобретите пакет" : "Задайте вопрос о товарах и отзывах..."}
            className="resize-none min-h-[40px] max-h-[120px] text-sm"
            rows={1}
            disabled={isLoading || balanceExhausted}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !hasBalance}
            size="icon"
            className="flex-shrink-0 h-10 w-10"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
