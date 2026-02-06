import { Star, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewCardProps {
  id: string;
  rating: number;
  authorName: string;
  date: string;
  productName: string;
  productArticle: string;
  status: "new" | "pending" | "auto" | "sent";
  images?: string[];
  text?: string;
}

export const ReviewCard = ({
  rating,
  authorName,
  date,
  productName,
  productArticle,
  status,
  images = [],
  text,
}: ReviewCardProps) => {
  const statusLabels = {
    new: "Новый",
    pending: "Ожидает",
    auto: "Автоответ",
    sent: "Отправлено",
  };

  const statusClasses = {
    new: "badge-new",
    pending: "badge-pending",
    auto: "badge-auto",
    sent: "badge-sent",
  };

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
        <div className="flex gap-2 flex-wrap">
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
    </div>
  );
};
