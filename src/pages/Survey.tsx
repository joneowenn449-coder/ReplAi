import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Star, CheckCircle2 } from "lucide-react";

function RatingScale({ value, onChange, max = 10, labels }: {
  value: number | null;
  onChange: (v: number) => void;
  max?: number;
  labels?: [string, string];
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-lg text-sm font-medium border transition-all ${
              value === n
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background border-border hover:border-primary/50 hover:bg-primary/5"
            }`}
            data-testid={`rating-${n}`}
          >
            {n}
          </button>
        ))}
      </div>
      {labels && (
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
    </div>
  );
}

const IMPROVE_OPTIONS = [
  { id: "ai_quality", label: "Качество ответов ИИ" },
  { id: "speed", label: "Скорость работы интерфейса" },
  { id: "telegram", label: "Функции Telegram-бота" },
  { id: "analytics", label: "Аналитика по отзывам" },
  { id: "chats", label: "Работа с чатами покупателей" },
  { id: "mobile", label: "Мобильная версия" },
  { id: "recommendations", label: "Рекомендации товаров в ответах" },
];

const Survey = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useState("");
  const [q1, setQ1] = useState<number | null>(null);
  const [q2, setQ2] = useState<number | null>(null);
  const [q3, setQ3] = useState("");
  const [q4, setQ4] = useState("");
  const [q5, setQ5] = useState("");
  const [q6, setQ6] = useState("");
  const [q7, setQ7] = useState("");
  const [q8, setQ8] = useState<number | null>(null);
  const [q9, setQ9] = useState("");
  const [q10, setQ10] = useState("");
  const [q11, setQ11] = useState("");
  const [q12, setQ12] = useState("");
  const [q13, setQ13] = useState<number | null>(null);
  const [q14, setQ14] = useState("");
  const [q15, setQ15] = useState("");
  const [q16, setQ16] = useState("");
  const [q17, setQ17] = useState("");
  const [q18, setQ18] = useState("");
  const [q19, setQ19] = useState("");
  const [q20, setQ20] = useState("");
  const [q21, setQ21] = useState<string[]>([]);
  const [q21Other, setQ21Other] = useState("");
  const [q22, setQ22] = useState<number | null>(null);
  const [q23, setQ23] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      const answers = {
        q1_overall: q1,
        q2_intuitive: q2,
        q3_liked: q3,
        q4_annoying: q4,
        q5_connect_easy: q5,
        q6_modes_clear: q6,
        q7_setup_time: q7,
        q8_ai_quality: q8,
        q9_publish_rate: q9,
        q10_fix_what: q10,
        q11_photos: q11,
        q12_telegram_use: q12,
        q13_telegram_convenient: q13,
        q14_telegram_missing: q14,
        q15_analyst_use: q15,
        q16_analyst_insights: q16,
        q17_analyst_questions: q17,
        q18_price: q18,
        q19_free_tokens: q19,
        q20_payment_format: q20,
        q21_priorities: [...q21, ...(q21Other ? [`other:${q21Other}`] : [])],
        q22_nps: q22,
        q23_missing: q23,
      };

      const resp = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respondent_name: name, answers }),
      });

      if (!resp.ok) throw new Error("Ошибка отправки");

      setSubmitted(true);
      toast({ title: "Спасибо!", description: "Ваши ответы успешно отправлены" });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function togglePriority(id: string) {
    setQ21((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Спасибо за обратную связь!</h2>
            <p className="text-muted-foreground">
              Ваши ответы помогут нам сделать сервис лучше. Мы ценим ваше время и мнение.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="w-6 h-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-survey-title">
              Обратная связь по ReplAi
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Помогите нам улучшить сервис. Опрос занимает 5-7 минут. Все поля необязательны — отвечайте на то, что актуально.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <Label htmlFor="name">Ваше имя (необязательно)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как к вам обращаться"
              className="mt-1.5"
              data-testid="input-name"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Блок 1 — Общее впечатление</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>1. Как бы вы оценили сервис в целом?</Label>
              <RatingScale value={q1} onChange={setQ1} max={10} labels={["Ужасно", "Отлично"]} />
            </div>
            <div className="space-y-2">
              <Label>2. Насколько понятен интерфейс при первом использовании?</Label>
              <RatingScale value={q2} onChange={setQ2} max={5} labels={["Совсем непонятен", "Всё интуитивно"]} />
            </div>
            <div className="space-y-2">
              <Label>3. Что вам понравилось больше всего?</Label>
              <Textarea value={q3} onChange={(e) => setQ3(e.target.value)} placeholder="Ваш ответ..." className="min-h-[80px]" data-testid="input-q3" />
            </div>
            <div className="space-y-2">
              <Label>4. Что раздражает или мешает в работе?</Label>
              <Textarea value={q4} onChange={(e) => setQ4(e.target.value)} placeholder="Ваш ответ..." className="min-h-[80px]" data-testid="input-q4" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Блок 2 — Подключение и настройка</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>5. Легко ли было подключить WB-кабинет?</Label>
              <RadioGroup value={q5} onValueChange={setQ5}>
                <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="q5-yes" /><Label htmlFor="q5-yes" className="font-normal">Да, легко</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="no" id="q5-no" /><Label htmlFor="q5-no" className="font-normal">Нет, были затруднения</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="not_tried" id="q5-not" /><Label htmlFor="q5-not" className="font-normal">Ещё не пробовал(а)</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>6. Понятно ли, как настроить режимы ответов для разных рейтингов?</Label>
              <RadioGroup value={q6} onValueChange={setQ6}>
                <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="q6-yes" /><Label htmlFor="q6-yes" className="font-normal">Да</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="partly" id="q6-partly" /><Label htmlFor="q6-partly" className="font-normal">Частично</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="no" id="q6-no" /><Label htmlFor="q6-no" className="font-normal">Нет, непонятно</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>7. Сколько времени заняла настройка от регистрации до первого ответа?</Label>
              <RadioGroup value={q7} onValueChange={setQ7}>
                <div className="flex items-center gap-2"><RadioGroupItem value="<5min" id="q7-5" /><Label htmlFor="q7-5" className="font-normal">Менее 5 минут</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="5-15min" id="q7-15" /><Label htmlFor="q7-15" className="font-normal">5-15 минут</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value=">15min" id="q7-more" /><Label htmlFor="q7-more" className="font-normal">Более 15 минут</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="failed" id="q7-fail" /><Label htmlFor="q7-fail" className="font-normal">Не получилось настроить</Label></div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Блок 3 — Качество AI-ответов</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>8. Как оцениваете качество автоматических ответов?</Label>
              <RatingScale value={q8} onChange={setQ8} max={5} labels={["Очень плохо", "Отлично"]} />
            </div>
            <div className="space-y-2">
              <Label>9. Какой процент ответов вы публикуете без правок?</Label>
              <RadioGroup value={q9} onValueChange={setQ9}>
                <div className="flex items-center gap-2"><RadioGroupItem value="0-25" id="q9-1" /><Label htmlFor="q9-1" className="font-normal">0-25%</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="25-50" id="q9-2" /><Label htmlFor="q9-2" className="font-normal">25-50%</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="50-75" id="q9-3" /><Label htmlFor="q9-3" className="font-normal">50-75%</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="75-100" id="q9-4" /><Label htmlFor="q9-4" className="font-normal">75-100%</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>10. Что чаще всего приходится исправлять в ответах?</Label>
              <Textarea value={q10} onChange={(e) => setQ10(e.target.value)} placeholder="Ваш ответ..." className="min-h-[80px]" data-testid="input-q10" />
            </div>
            <div className="space-y-2">
              <Label>11. Устраивает ли вас работа с фотографиями (понимает ли ИИ, что на фото)?</Label>
              <RadioGroup value={q11} onValueChange={setQ11}>
                <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="q11-yes" /><Label htmlFor="q11-yes" className="font-normal">Да, хорошо понимает</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="partly" id="q11-partly" /><Label htmlFor="q11-partly" className="font-normal">Частично</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="no" id="q11-no" /><Label htmlFor="q11-no" className="font-normal">Нет, плохо</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="not_tried" id="q11-not" /><Label htmlFor="q11-not" className="font-normal">Не пробовал(а)</Label></div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Блок 4 — Telegram-бот</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>12. Пользуетесь ли вы Telegram-ботом?</Label>
              <RadioGroup value={q12} onValueChange={setQ12}>
                <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="q12-yes" /><Label htmlFor="q12-yes" className="font-normal">Да, активно</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="sometimes" id="q12-sometimes" /><Label htmlFor="q12-sometimes" className="font-normal">Иногда</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="no" id="q12-no" /><Label htmlFor="q12-no" className="font-normal">Нет</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="didnt_know" id="q12-didnt" /><Label htmlFor="q12-didnt" className="font-normal">Не знал(а) о нём</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>13. Удобно ли управлять ответами через бот?</Label>
              <RatingScale value={q13} onChange={setQ13} max={5} labels={["Неудобно", "Очень удобно"]} />
            </div>
            <div className="space-y-2">
              <Label>14. Каких функций не хватает в боте?</Label>
              <Textarea value={q14} onChange={(e) => setQ14(e.target.value)} placeholder="Ваш ответ..." className="min-h-[80px]" data-testid="input-q14" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Блок 5 — AI-аналитик</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>15. Пользовались ли аналитиком отзывов?</Label>
              <RadioGroup value={q15} onValueChange={setQ15}>
                <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="q15-yes" /><Label htmlFor="q15-yes" className="font-normal">Да</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="no" id="q15-no" /><Label htmlFor="q15-no" className="font-normal">Нет</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="didnt_know" id="q15-didnt" /><Label htmlFor="q15-didnt" className="font-normal">Не знал(а) об этой функции</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>16. Если да — помог ли он найти полезные инсайты?</Label>
              <Textarea value={q16} onChange={(e) => setQ16(e.target.value)} placeholder="Ваш ответ..." className="min-h-[80px]" data-testid="input-q16" />
            </div>
            <div className="space-y-2">
              <Label>17. Какие вопросы вы хотели бы ему задавать?</Label>
              <Textarea value={q17} onChange={(e) => setQ17(e.target.value)} placeholder="Ваш ответ..." className="min-h-[80px]" data-testid="input-q17" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Блок 6 — Ценообразование</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>18. Адекватна ли стоимость токенов?</Label>
              <RadioGroup value={q18} onValueChange={setQ18}>
                <div className="flex items-center gap-2"><RadioGroupItem value="cheap" id="q18-cheap" /><Label htmlFor="q18-cheap" className="font-normal">Дёшево</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="normal" id="q18-normal" /><Label htmlFor="q18-normal" className="font-normal">Нормально</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="expensive" id="q18-exp" /><Label htmlFor="q18-exp" className="font-normal">Дорого</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>19. Хватает ли 50 бесплатных токенов для оценки сервиса?</Label>
              <RadioGroup value={q19} onValueChange={setQ19}>
                <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="q19-yes" /><Label htmlFor="q19-yes" className="font-normal">Да, хватает</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="barely" id="q19-barely" /><Label htmlFor="q19-barely" className="font-normal">Впритык</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="no" id="q19-no" /><Label htmlFor="q19-no" className="font-normal">Нет, мало</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>20. Какой формат оплаты был бы удобнее?</Label>
              <RadioGroup value={q20} onValueChange={setQ20}>
                <div className="flex items-center gap-2"><RadioGroupItem value="packs" id="q20-packs" /><Label htmlFor="q20-packs" className="font-normal">Разовые пакеты токенов</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="subscription" id="q20-sub" /><Label htmlFor="q20-sub" className="font-normal">Подписка (ежемесячная)</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="per_cabinet" id="q20-cab" /><Label htmlFor="q20-cab" className="font-normal">Оплата за кабинет</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="both" id="q20-both" /><Label htmlFor="q20-both" className="font-normal">И пакеты, и подписка на выбор</Label></div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Блок 7 — Приоритеты</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>21. Что важнее всего улучшить? (выберите до 3)</Label>
              <div className="space-y-2">
                {IMPROVE_OPTIONS.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`q21-${opt.id}`}
                      checked={q21.includes(opt.id)}
                      onCheckedChange={() => togglePriority(opt.id)}
                      disabled={!q21.includes(opt.id) && q21.length >= 3}
                      data-testid={`checkbox-${opt.id}`}
                    />
                    <Label htmlFor={`q21-${opt.id}`} className="font-normal">{opt.label}</Label>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="q21-other"
                    checked={q21.includes("other")}
                    onCheckedChange={() => togglePriority("other")}
                    disabled={!q21.includes("other") && q21.length >= 3}
                  />
                  <Label htmlFor="q21-other" className="font-normal">Другое:</Label>
                  <Input
                    value={q21Other}
                    onChange={(e) => setQ21Other(e.target.value)}
                    placeholder="Укажите..."
                    className="flex-1 h-8"
                    data-testid="input-q21-other"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>22. Готовы ли вы рекомендовать сервис коллегам?</Label>
              <RatingScale value={q22} onChange={setQ22} max={10} labels={["Точно нет", "Обязательно да"]} />
            </div>
            <div className="space-y-2">
              <Label>23. Что бы вы добавили в сервис, чего сейчас нет?</Label>
              <Textarea value={q23} onChange={(e) => setQ23(e.target.value)} placeholder="Ваши идеи и пожелания..." className="min-h-[100px]" data-testid="input-q23" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pb-8">
          <Button
            type="submit"
            disabled={submitting}
            size="lg"
            className="px-8"
            data-testid="button-submit-survey"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Отправить ответы
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Survey;
