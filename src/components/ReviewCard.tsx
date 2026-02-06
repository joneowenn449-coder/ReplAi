import { useState } from "react";
import { Star, ExternalLink, Send, RefreshCw, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSendReply, useGenerateReply } from "@/hooks/useReviews";

interface ReviewCardProps {
  id: string;
  rating: number;
  authorName: string;
date: string;
  productName: string;
  productArticle: string;
  status: "new" | "pending" | "auto" | "sent" | "archived";
  images?: string[];
  text?: string | null;
  aiDraft?: string | null;
  sentAnswer?: string | null;
}

export const ReviewCard = ({
  id,
  rating,
  authorName,
  date,
  productName,
  productArticle,
  status,
  images = [],
  text,
  aiDraft,
  sentAnswer,
}: ReviewCardProps) => {
  const [showDraft, setShowDraft] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedText, setEditedText] = useState(aiDraft || "");

  const sendReply = useSendReply();
  const generateReply = useGenerateReply();

  const statusLabels: Record<string, string> = {
    new: "Новый",
    pending: "Ожидает",
    auto: "Автоответ",
    sent: "Отправлено",
    archived: "Архив",
  };

  const statusClasses: Record<string, string> = {
    new: "badge-new",
    pending: "badge-pending",
    auto: "badge-auto",
    sent: "badge-sent",
    archived: "badge-sent",
  };

  const handleSend = () => {
    const textToSend = editMode ? editedText : undefined;
    sendReply.mutate({ reviewId: id, answerText: textToSend });
    setEditMode(false);
  };

  const handleRegenerate = () => {
    generateReply.mutate(id);
  };

  const isArchived = status === "archived";
  const hasDraft = aiDraft && status !== "sent" && !isArchived;
  const hasAnswer = sentAnswer && (status === "sent" || isArchived);

  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "w-4 h-4",
                  i < rating
                    ? "fill-warning text-warning"
                    : "fill-muted text-muted"
                )}
              />
            ))}
          </div>
          <span className="font-medium text-foreground">{authorName}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground text-sm">{date}</span>
        </div>
        <span className={statusClasses[status]}>{statusLabels[status]}</span>
      </div>

      <p className="text-foreground mb-2">{productName}</p>

      <a
        href={`https://www.wildberries.ru/catalog/${productArticle}/detail.aspx`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary text-sm hover:underline inline-flex items-center gap-1 mb-3"
      >
        Арт. WB: {productArticle}
        <ExternalLink className="w-3 h-3" />
      </a>

      {text && (
        <p className="text-muted-foreground text-sm mb-3">{text}</p>
      )}

      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {images.map((img, i) => (
            <div
              key={i}
              className="w-16 h-16 rounded-lg bg-muted overflow-hidden"
            >
              <img
                src={img}
                alt={`Фото ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* AI Draft section */}
      {hasDraft && (
        <div className="mt-3 border-t border-border pt-3">
          <button
            onClick={() => setShowDraft(!showDraft)}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {showDraft ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Черновик ИИ
          </button>

          {showDraft && (
            <div className="mt-3 space-y-3">
              {editMode ? (
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
              ) : (
                <p className="text-sm text-foreground bg-secondary/50 rounded-lg p-3">
                  {aiDraft}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={sendReply.isPending}
                  className="gap-1"
                >
                  <Send className="w-3 h-3" />
                  {sendReply.isPending ? "Отправка..." : "Отправить"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={generateReply.isPending}
                  className="gap-1"
                >
                  <RefreshCw className={cn("w-3 h-3", generateReply.isPending && "animate-spin")} />
                  Перегенерировать
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditMode(!editMode);
                    setEditedText(aiDraft || "");
                  }}
                  className="gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  {editMode ? "Отмена" : "Редактировать"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sent answer */}
      {hasAnswer && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs font-medium text-success mb-1">Отправленный ответ:</p>
          <p className="text-sm text-foreground bg-success/5 rounded-lg p-3 border border-success/20">
            {sentAnswer}
          </p>
        </div>
      )}
    </div>
  );
};
