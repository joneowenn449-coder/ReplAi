import { useState, useEffect } from "react";
import { Star, ExternalLink, Send, RefreshCw, Pencil, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  status: "pending" | "auto" | "sent" | "archived";
  images?: string[];
  text?: string | null;
  pros?: string | null;
  cons?: string | null;
  aiDraft?: string | null;
  sentAnswer?: string | null;
  isEdited?: boolean;
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
  pros,
  cons,
  aiDraft,
  sentAnswer,
  isEdited,
}: ReviewCardProps) => {
  const [showDraft, setShowDraft] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedText, setEditedText] = useState(aiDraft || "");

  // Sent answer editing states
  const [sentActionsOpen, setSentActionsOpen] = useState(false);
  const [sentEditMode, setSentEditMode] = useState(false);
  const [editingSentText, setEditingSentText] = useState(sentAnswer || "");

  const sendReply = useSendReply();
  const generateReply = useGenerateReply();

  // Sync editedText when aiDraft changes (e.g. after regeneration)
  useEffect(() => {
    if (!editMode) {
      setEditedText(aiDraft || "");
    }
  }, [aiDraft]);

  const statusLabels: Record<string, string> = {
    pending: "Ожидает",
    auto: "Автоответ",
    sent: "Отправлено",
    archived: "Архив",
  };

  const statusClasses: Record<string, string> = {
    pending: "badge-pending",
    auto: "badge-auto",
    sent: "badge-sent",
    archived: "badge-sent",
  };

  const handleSend = (customText?: string) => {
    const textToSend = customText || (editMode ? editedText : aiDraft) || undefined;
    sendReply.mutate({ reviewId: id, answerText: textToSend });
    setEditMode(false);
  };

  const handleRegenerate = () => {
    generateReply.mutate(id);
    setSentActionsOpen(false);
    setSentEditMode(false);
  };

  const handleSentEdit = () => {
    setSentEditMode(true);
    setEditingSentText(sentAnswer || "");
  };

  const handleSentSend = () => {
    sendReply.mutate({ reviewId: id, answerText: editingSentText });
    setSentEditMode(false);
    setSentActionsOpen(false);
  };

  const handleSentCancel = () => {
    setSentEditMode(false);
    setEditingSentText(sentAnswer || "");
  };

  const isArchived = status === "archived";
  const hasDraft = aiDraft && status !== "sent" && !isArchived;
  const hasAnswer = sentAnswer && (status === "sent" || status === "auto" || isArchived);

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

      {(text || pros || cons) && (
        <div className="space-y-2 mb-3">
          {text && (
            <p className="text-foreground text-sm">«{text}»</p>
          )}
          {pros && (
            <div className="flex items-start gap-1.5">
              <ThumbsUp className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <span className="text-sm text-foreground">{pros}</span>
            </div>
          )}
          {cons && (
            <div className="flex items-start gap-1.5">
              <ThumbsDown className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <span className="text-sm text-foreground">{cons}</span>
            </div>
          )}
        </div>
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
                  onClick={() => handleSend()}
                  disabled={sendReply.isPending || generateReply.isPending}
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
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-medium text-success">Отправленный ответ:</p>
            {status === "auto" && (
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0">Автоответ</Badge>
            )}
            {status === "sent" && (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0">Ручной</Badge>
            )}
            {isEdited && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0">Редактировано</Badge>
            )}
          </div>

          {sentEditMode && !isEdited ? (
            <div className="space-y-3">
              <Textarea
                value={editingSentText}
                onChange={(e) => setEditingSentText(e.target.value)}
                className="min-h-[80px] text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSentSend}
                  disabled={sendReply.isPending || generateReply.isPending || !editingSentText.trim()}
                  className="gap-1"
                >
                  <Send className="w-3 h-3" />
                  {sendReply.isPending ? "Отправка..." : "Отправить"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSentCancel}
                >
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            <div
              {...(!isEdited ? {
                onClick: () => setSentActionsOpen(!sentActionsOpen),
                className: "cursor-pointer group",
              } : {})}
            >
              <p className={cn(
                "text-sm text-foreground bg-success/5 rounded-lg p-3 border border-success/20 transition-colors",
                !isEdited && "group-hover:border-primary/30"
              )}>
                {sentAnswer}
              </p>
              {!isEdited && !sentActionsOpen && (
                <p className="text-[11px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Нажмите, чтобы изменить ответ
                </p>
              )}
            </div>
          )}

          {!isEdited && sentActionsOpen && !sentEditMode && (
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); handleRegenerate(); }}
                disabled={generateReply.isPending}
                className="gap-1"
              >
                <RefreshCw className={cn("w-3 h-3", generateReply.isPending && "animate-spin")} />
                Перегенерировать
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); handleSentEdit(); }}
                className="gap-1"
              >
                <Pencil className="w-3 h-3" />
                Редактировать
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
