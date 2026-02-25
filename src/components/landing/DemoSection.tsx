import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star, Sparkles, Loader2, ThumbsUp, ThumbsDown,
  Camera, HelpCircle, Meh
} from "lucide-react";

interface DemoReview {
  id: string;
  label: string;
  icon: typeof Star;
  iconColor: string;
  rating: number;
  userName: string;
  productName: string;
  productArticle: string;
  text: string;
  pros: string | null;
  cons: string | null;
  hasPhoto: boolean;
  aiResponse: string;
}

const demoReviews: DemoReview[] = [
  {
    id: "negative",
    label: "Негативный",
    icon: ThumbsDown,
    iconColor: "text-red-500",
    rating: 2,
    userName: "Анна М.",
    productName: "Кроссовки спортивные беговые",
    productArticle: "198245637",
    text: "Заказывала 38 размер, пришли явно маломерки. Нога еле влезает, хотя всегда ношу 38. Подошва жёсткая, бегать в них невозможно. За такую цену ожидала лучше.",
    pros: null,
    cons: "Маломерят, жёсткая подошва",
    hasPhoto: false,
    aiResponse: "Анна, здравствуйте! Благодарим за обратную связь и приносим извинения за доставленные неудобства. Действительно, данная модель может немного маломерить — рекомендуем при следующем заказе выбрать размер на один больше. Подошва в первые дни может казаться жёсткой, но она разнашивается в течение 3-5 дней активной носки. Если кроссовки всё же не подойдут, вы всегда можете оформить возврат. Будем рады, если дадите нашей обуви ещё один шанс!",
  },
  {
    id: "positive",
    label: "Позитивный",
    icon: ThumbsUp,
    iconColor: "text-green-500",
    rating: 5,
    userName: "Елена К.",
    productName: "Сумка кожаная шоппер на плечо",
    productArticle: "245891023",
    text: "Потрясающая сумка! Кожа мягкая, приятная на ощупь. Вместительная, влезает ноутбук 13 дюймов. Цвет как на фото. Очень довольна покупкой, буду заказывать ещё!",
    pros: "Качество кожи, вместительность, цвет соответствует",
    cons: null,
    hasPhoto: true,
    aiResponse: "Елена, большое спасибо за такой тёплый отзыв и прекрасные фото! Рады, что сумка оправдала ожидания — мы тщательно отбираем кожу для этой модели. Кстати, к этому шопперу отлично подойдёт наш кожаный кошелёк из той же коллекции (арт. 245891087) — выполнен из такой же мягкой кожи и доступен в том же цвете. Спасибо, что выбираете нас!",
  },
  {
    id: "question",
    label: "Вопрос",
    icon: HelpCircle,
    iconColor: "text-blue-500",
    rating: 4,
    userName: "Дмитрий В.",
    productName: "Свитер шерстяной оверсайз",
    productArticle: "312567890",
    text: "Свитер хороший, тёплый и мягкий. Но подскажите, можно ли его стирать в машинке? И не скатается ли шерсть после нескольких стирок? Хочу понять, как за ним ухаживать.",
    pros: "Тёплый, мягкий, приятный к телу",
    cons: null,
    hasPhoto: false,
    aiResponse: "Дмитрий, спасибо за отзыв и отличный вопрос! Стирать свитер в машинке можно — используйте деликатный режим при 30°C и специальное средство для шерсти. Рекомендуем стирать в мешке для стирки и сушить в расправленном виде на горизонтальной поверхности. При соблюдении этих правил шерсть не скатывается даже после множества стирок. Если потребуется дополнительная консультация по уходу — пишите, будем рады помочь!",
  },
  {
    id: "neutral",
    label: "Нейтральный",
    icon: Meh,
    iconColor: "text-amber-500",
    rating: 3,
    userName: "Ольга С.",
    productName: "Платье летнее миди с принтом",
    productArticle: "456123789",
    text: "Платье в целом неплохое, ткань приятная, принт яркий. Но село немного странно — в талии свободно, а в бёдрах узковато. Швы ровные, качество пошива нормальное.",
    pros: "Приятная ткань, яркий принт, ровные швы",
    cons: "Странная посадка, узковато в бёдрах",
    hasPhoto: false,
    aiResponse: "Ольга, благодарим за подробный и честный отзыв! Рады, что качество ткани и принт вам понравились. Учитываем ваше замечание по посадке — передадим информацию в отдел конструирования для улучшения лекал. Если вам нравится этот фасон, обратите внимание на нашу модель с эластичной вставкой в поясе (арт. 456123801) — она более универсальна по посадке. Спасибо за обратную связь, она помогает нам становиться лучше!",
  },
];

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" data-testid="demo-rating-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export default function DemoSection() {
  const [activeId, setActiveId] = useState(demoReviews[0].id);
  const [showResponse, setShowResponse] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [typingDone, setTypingDone] = useState(false);

  const active = demoReviews.find((r) => r.id === activeId)!;

  const resetResponse = useCallback(() => {
    setShowResponse(false);
    setIsGenerating(false);
    setDisplayedText("");
    setTypingDone(false);
  }, []);

  useEffect(() => {
    resetResponse();
  }, [activeId, resetResponse]);

  useEffect(() => {
    if (!showResponse || isGenerating) return;

    const fullText = active.aiResponse;
    if (displayedText.length >= fullText.length) {
      setTypingDone(true);
      return;
    }

    const charsPerTick = Math.max(1, Math.floor(fullText.length / 60));
    const timer = setTimeout(() => {
      setDisplayedText(fullText.slice(0, displayedText.length + charsPerTick));
    }, 20);

    return () => clearTimeout(timer);
  }, [showResponse, isGenerating, displayedText, active.aiResponse]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setShowResponse(true);
    setDisplayedText("");
    setTypingDone(false);

    setTimeout(() => {
      setIsGenerating(false);
    }, 1200);
  };

  return (
    <section className="py-16 md:py-24 px-4" data-testid="section-demo">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <h2
            className="text-2xl md:text-3xl font-bold tracking-tight"
            data-testid="text-demo-title"
          >
            Попробуйте сами
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Выберите пример отзыва и посмотрите, как ИИ формирует ответ
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2" data-testid="demo-tabs">
          {demoReviews.map((r) => {
            const Icon = r.icon;
            return (
              <Button
                key={r.id}
                variant={activeId === r.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveId(r.id)}
                className="rounded-full"
                data-testid={`button-demo-tab-${r.id}`}
              >
                <Icon className={`w-3.5 h-3.5 mr-1.5 ${activeId === r.id ? "" : r.iconColor}`} />
                {r.label}
              </Button>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <Card data-testid="card-demo-review">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs font-normal">
                  Арт. {active.productArticle}
                </Badge>
                <RatingStars rating={active.rating} />
              </div>

              <div>
                <p className="font-semibold text-sm text-foreground">{active.productName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">от {active.userName}</p>
              </div>

              <p className="text-sm text-foreground leading-relaxed" data-testid="text-demo-review-text">
                {active.text}
              </p>

              {active.pros && (
                <div className="flex items-start gap-2 text-xs">
                  <ThumbsUp className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">Достоинства:</span> {active.pros}
                  </span>
                </div>
              )}

              {active.cons && (
                <div className="flex items-start gap-2 text-xs">
                  <ThumbsDown className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">Недостатки:</span> {active.cons}
                  </span>
                </div>
              )}

              {active.hasPhoto && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Покупатель прикрепил фото</span>
                </div>
              )}

              {!showResponse && (
                <Button
                  onClick={handleGenerate}
                  className="w-full mt-2"
                  data-testid="button-demo-generate"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Сгенерировать ответ
                </Button>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-demo-response">
            <CardContent className="p-5 space-y-3">
              {!showResponse ? (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3" data-testid="demo-placeholder">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-[200px]">
                    Нажмите «Сгенерировать ответ», чтобы увидеть результат
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Ответ ReplAi</p>
                      <p className="text-xs text-muted-foreground">
                        {isGenerating
                          ? "Анализирует отзыв..."
                          : typingDone
                            ? "Готово"
                            : "Печатает..."}
                      </p>
                    </div>
                    {active.rating <= 3 && (
                      <Badge variant="outline" className="ml-auto text-xs bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                        GPT-4o
                      </Badge>
                    )}
                    {active.rating >= 4 && (
                      <Badge variant="outline" className="ml-auto text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                        Gemini Flash
                      </Badge>
                    )}
                  </div>

                  {isGenerating ? (
                    <div className="flex items-center justify-center py-8" data-testid="demo-loading">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <p
                      className="text-sm text-foreground leading-relaxed whitespace-pre-wrap"
                      data-testid="text-demo-response"
                    >
                      {displayedText}
                      {!typingDone && (
                        <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-text-bottom" />
                      )}
                    </p>
                  )}

                  {typingDone && (
                    <div className="pt-2 border-t border-border mt-3">
                      <p className="text-xs text-muted-foreground">
                        {active.rating <= 3
                          ? "Негативные отзывы обрабатываются моделью GPT-4o для максимально точного и эмпатичного ответа."
                          : active.hasPhoto
                            ? "Фото покупателя проанализировано GPT-4o Vision для учёта визуального контекста."
                            : "Позитивные отзывы обрабатываются Gemini Flash — быстро и с умными допродажами."}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
