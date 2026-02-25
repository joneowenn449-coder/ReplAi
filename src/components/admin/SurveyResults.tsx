import { useState, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ClipboardList, User, Calendar, TrendingUp, AlertTriangle, BarChart3, MessageSquare, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, Minus, Target, Star, Copy, Check, Link } from "lucide-react";
import { formatMsk } from "@/lib/dates";
import { apiRequest } from "@/lib/api";

const QUESTION_LABELS: Record<string, string> = {
  q1_overall: "1. Оценка сервиса в целом (1-10)",
  q2_intuitive: "2. Понятность интерфейса (1-5)",
  q3_liked: "3. Что понравилось",
  q4_annoying: "4. Что раздражает/мешает",
  q5_connect_easy: "5. Подключение WB-кабинета",
  q6_modes_clear: "6. Настройка режимов ответов",
  q7_setup_time: "7. Время настройки",
  q8_ai_quality: "8. Качество AI-ответов (1-5)",
  q9_publish_rate: "9. % ответов без правок",
  q10_fix_what: "10. Что исправляют в ответах",
  q11_photos: "11. Работа с фото",
  q12_telegram_use: "12. Использование Telegram-бота",
  q13_telegram_convenient: "13. Удобство бота (1-5)",
  q14_telegram_missing: "14. Недостающие функции бота",
  q15_analyst_use: "15. Использование аналитика",
  q16_analyst_insights: "16. Полезность аналитика",
  q17_analyst_questions: "17. Желаемые вопросы аналитику",
  q18_price: "18. Стоимость токенов",
  q19_free_tokens: "19. Достаточность бесплатных токенов",
  q20_payment_format: "20. Удобный формат оплаты",
  q21_priorities: "21. Приоритеты улучшений",
  q22_nps: "22. NPS (рекомендация, 1-10)",
  q23_missing: "23. Что добавить в сервис",
};

const PRIORITY_LABELS: Record<string, string> = {
  ai_quality: "Качество ответов ИИ",
  speed: "Скорость интерфейса",
  telegram: "Функции Telegram-бота",
  analytics: "Аналитика по отзывам",
  chats: "Работа с чатами",
  mobile: "Мобильная версия",
  recommendations: "Рекомендации товаров",
};

const RADIO_LABELS: Record<string, Record<string, string>> = {
  q5_connect_easy: { yes: "Да, легко", no: "Были затруднения", not_tried: "Не пробовал(а)" },
  q6_modes_clear: { yes: "Да", partly: "Частично", no: "Непонятно" },
  q7_setup_time: { "<5min": "< 5 мин", "5-15min": "5-15 мин", ">15min": "> 15 мин", failed: "Не получилось" },
  q9_publish_rate: { "0-25": "0-25%", "25-50": "25-50%", "50-75": "50-75%", "75-100": "75-100%" },
  q11_photos: { yes: "Хорошо", partly: "Частично", no: "Плохо", not_tried: "Не пробовал" },
  q12_telegram_use: { yes: "Активно", sometimes: "Иногда", no: "Нет", didnt_know: "Не знал" },
  q15_analyst_use: { yes: "Да", no: "Нет", didnt_know: "Не знал" },
  q18_price: { cheap: "Дёшево", normal: "Нормально", expensive: "Дорого" },
  q19_free_tokens: { yes: "Хватает", barely: "Впритык", no: "Мало" },
  q20_payment_format: { packs: "Пакеты", subscription: "Подписка", per_cabinet: "За кабинет", both: "И то, и другое" },
};

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function collectNumeric(responses: any[], key: string): number[] {
  return responses.map(r => r.answers?.[key]).filter((v): v is number => typeof v === "number");
}

function collectRadio(responses: any[], key: string): Record<string, number> {
  const counts: Record<string, number> = {};
  responses.forEach(r => {
    const v = r.answers?.[key];
    if (v && typeof v === "string") {
      counts[v] = (counts[v] || 0) + 1;
    }
  });
  return counts;
}

function collectTexts(responses: any[], key: string): string[] {
  return responses.map(r => r.answers?.[key]).filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function collectPriorities(responses: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  responses.forEach(r => {
    const arr = r.answers?.q21_priorities;
    if (Array.isArray(arr)) {
      arr.forEach((p: string) => {
        if (p.startsWith("other:")) {
          counts["other"] = (counts["other"] || 0) + 1;
        } else {
          counts[p] = (counts[p] || 0) + 1;
        }
      });
    }
  });
  return counts;
}

function NpsGauge({ score }: { score: number }) {
  const color = score >= 50 ? "text-green-500" : score >= 0 ? "text-yellow-500" : "text-red-500";
  const bg = score >= 50 ? "bg-green-500/10" : score >= 0 ? "bg-yellow-500/10" : "bg-red-500/10";
  const label = score >= 50 ? "Отлично" : score >= 0 ? "Нормально" : "Критично";
  return (
    <div className={`rounded-xl p-4 ${bg} text-center`} data-testid="nps-gauge">
      <div className={`text-3xl font-bold ${color}`}>{Math.round(score)}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function MiniBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-6 text-right shrink-0">{value}</span>
    </div>
  );
}

function RatingDistribution({ values, maxVal, labels }: { values: number[]; maxVal: number; labels?: string[] }) {
  const counts: Record<number, number> = {};
  values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const maxCount = Math.max(...Object.values(counts), 1);
  return (
    <div className="space-y-1">
      {Array.from({ length: maxVal }, (_, i) => i + 1).map(n => (
        <div key={n} className="flex items-center gap-2 text-xs">
          <span className="w-4 text-right text-muted-foreground">{labels?.[n - 1] || n}</span>
          <MiniBar value={counts[n] || 0} max={maxCount} />
        </div>
      ))}
    </div>
  );
}

function RadioDistribution({ counts, labels }: { counts: Record<string, number>; labels: Record<string, string> }) {
  const maxCount = Math.max(...Object.values(counts), 1);
  const entries = Object.entries(labels);
  return (
    <div className="space-y-1">
      {entries.map(([key, label]) => (
        <div key={key} className="flex items-center gap-2 text-xs">
          <span className="w-24 text-right text-muted-foreground truncate" title={label}>{label}</span>
          <MiniBar value={counts[key] || 0} max={maxCount} />
        </div>
      ))}
    </div>
  );
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
        onClick={() => setOpen(!open)}
        data-testid={`toggle-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        {icon}
        <span className="font-medium text-sm flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <CardContent className="pt-0 pb-4">{children}</CardContent>}
    </Card>
  );
}

function SurveyLinkBlock() {
  const [copied, setCopied] = useState(false);
  const surveyUrl = `${window.location.origin}/survey`;

  const handleCopy = () => {
    navigator.clipboard.writeText(surveyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg" data-testid="survey-link-block">
      <Link className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground shrink-0">Ссылка на опрос:</span>
      <code className="text-sm bg-background px-2 py-0.5 rounded border truncate flex-1" data-testid="survey-link-url">{surveyUrl}</code>
      <button
        onClick={handleCopy}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        data-testid="button-copy-survey-link"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "Скопировано" : "Копировать"}
      </button>
    </div>
  );
}

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined || value === "") return "\u2014";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function SurveyResults() {
  const { data: responses, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/survey-responses"],
    queryFn: async () => {
      return await apiRequest("/api/admin/survey-responses");
    },
  });

  const analytics = useMemo(() => {
    if (!responses || responses.length === 0) return null;

    const q1Vals = collectNumeric(responses, "q1_overall");
    const q2Vals = collectNumeric(responses, "q2_intuitive");
    const q8Vals = collectNumeric(responses, "q8_ai_quality");
    const q13Vals = collectNumeric(responses, "q13_telegram_convenient");
    const q22Vals = collectNumeric(responses, "q22_nps");

    const promoters = q22Vals.filter(v => v >= 9).length;
    const detractors = q22Vals.filter(v => v <= 6).length;
    const npsScore = q22Vals.length > 0
      ? ((promoters - detractors) / q22Vals.length) * 100
      : 0;

    const priorities = collectPriorities(responses);
    const sortedPriorities = Object.entries(priorities)
      .sort((a, b) => b[1] - a[1]);

    const metrics = [
      { key: "q1_overall", label: "Общая оценка", avg: avg(q1Vals), max: 10, threshold: 6, count: q1Vals.length },
      { key: "q2_intuitive", label: "Понятность UI", avg: avg(q2Vals), max: 5, threshold: 3, count: q2Vals.length },
      { key: "q8_ai_quality", label: "Качество AI", avg: avg(q8Vals), max: 5, threshold: 3, count: q8Vals.length },
      { key: "q13_telegram", label: "Удобство бота", avg: avg(q13Vals), max: 5, threshold: 3, count: q13Vals.length },
      { key: "q22_nps", label: "NPS (рекомендация)", avg: avg(q22Vals), max: 10, threshold: 6, count: q22Vals.length },
    ].filter(m => m.count > 0);

    const criticalZones = metrics
      .map(m => ({
        ...m,
        normalizedScore: m.avg / m.max,
        isCritical: m.avg < m.threshold,
      }))
      .sort((a, b) => a.normalizedScore - b.normalizedScore);

    const radioQuestions = [
      { key: "q5_connect_easy", label: "Подключение WB-кабинета" },
      { key: "q6_modes_clear", label: "Настройка режимов" },
      { key: "q7_setup_time", label: "Время настройки" },
      { key: "q9_publish_rate", label: "% без правок" },
      { key: "q11_photos", label: "Работа с фото" },
      { key: "q12_telegram_use", label: "Использование бота" },
      { key: "q15_analyst_use", label: "Использование аналитика" },
      { key: "q18_price", label: "Стоимость токенов" },
      { key: "q19_free_tokens", label: "Бесплатные токены" },
      { key: "q20_payment_format", label: "Формат оплаты" },
    ];

    const textQuestions = [
      { key: "q3_liked", label: "Что понравилось", icon: "thumbsup" },
      { key: "q4_annoying", label: "Что раздражает/мешает", icon: "thumbsdown" },
      { key: "q10_fix_what", label: "Что исправляют в AI-ответах", icon: "edit" },
      { key: "q14_telegram_missing", label: "Чего не хватает в боте", icon: "telegram" },
      { key: "q16_analyst_insights", label: "Полезность аналитика", icon: "analytics" },
      { key: "q17_analyst_questions", label: "Вопросы к аналитику", icon: "question" },
      { key: "q23_missing", label: "Что добавить в сервис", icon: "plus" },
    ];

    return {
      total: responses.length,
      q1Vals, q2Vals, q8Vals, q13Vals, q22Vals,
      avgOverall: avg(q1Vals),
      avgAI: avg(q8Vals),
      avgTelegram: avg(q13Vals),
      npsScore,
      promoters,
      detractors,
      passives: q22Vals.length - promoters - detractors,
      npsTotal: q22Vals.length,
      criticalZones,
      sortedPriorities,
      radioQuestions,
      textQuestions,
    };
  }, [responses]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="loading-survey-results">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!responses || responses.length === 0) {
    return (
      <div className="space-y-4">
        <SurveyLinkBlock />
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Ответов пока нет</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SurveyLinkBlock />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="summary-cards">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{analytics!.total}</div>
            <div className="text-xs text-muted-foreground mt-1">Ответов</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {analytics!.avgOverall > 0 ? analytics!.avgOverall.toFixed(1) : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Общая оценка / 10</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {analytics!.avgAI > 0 ? analytics!.avgAI.toFixed(1) : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Качество AI / 5</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            {analytics!.npsTotal > 0 ? (
              <NpsGauge score={analytics!.npsScore} />
            ) : (
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">—</div>
                <div className="text-xs text-muted-foreground mt-1">NPS</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {analytics!.npsTotal > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              NPS — разбивка
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg bg-green-500/10 p-3">
                <ThumbsUp className="w-4 h-4 text-green-500 mx-auto mb-1" />
                <div className="font-bold text-green-600">{analytics!.promoters}</div>
                <div className="text-xs text-muted-foreground">Промоутеры (9-10)</div>
              </div>
              <div className="rounded-lg bg-yellow-500/10 p-3">
                <Minus className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                <div className="font-bold text-yellow-600">{analytics!.passives}</div>
                <div className="text-xs text-muted-foreground">Нейтралы (7-8)</div>
              </div>
              <div className="rounded-lg bg-red-500/10 p-3">
                <ThumbsDown className="w-4 h-4 text-red-500 mx-auto mb-1" />
                <div className="font-bold text-red-600">{analytics!.detractors}</div>
                <div className="text-xs text-muted-foreground">Критики (1-6)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {analytics!.criticalZones.some(z => z.isCritical) && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              Критические зоны — требуют внимания
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics!.criticalZones.filter(z => z.isCritical).map(zone => (
                <div key={zone.key} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{zone.label}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${(zone.avg / zone.max) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-red-600">
                        {zone.avg.toFixed(1)} / {zone.max}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {analytics!.criticalZones.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4" />
              Все оценки — от худших к лучшим
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics!.criticalZones.map(zone => {
                const pct = (zone.avg / zone.max) * 100;
                const color = zone.isCritical ? "bg-red-500" : pct >= 70 ? "bg-green-500" : "bg-yellow-500";
                return (
                  <div key={zone.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{zone.label}</span>
                      <span className="font-medium">{zone.avg.toFixed(1)} / {zone.max}</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Распределение числовых оценок
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {analytics!.q1Vals.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Общая оценка (1-10)</div>
                <RatingDistribution values={analytics!.q1Vals} maxVal={10} />
              </div>
            )}
            {analytics!.q2Vals.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Понятность UI (1-5)</div>
                <RatingDistribution values={analytics!.q2Vals} maxVal={5} />
              </div>
            )}
            {analytics!.q8Vals.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Качество AI (1-5)</div>
                <RatingDistribution values={analytics!.q8Vals} maxVal={5} />
              </div>
            )}
            {analytics!.q13Vals.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Удобство бота (1-5)</div>
                <RatingDistribution values={analytics!.q13Vals} maxVal={5} />
              </div>
            )}
            {analytics!.q22Vals.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">NPS — рекомендация (1-10)</div>
                <RatingDistribution values={analytics!.q22Vals} maxVal={10} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Распределение ответов (выбор)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {analytics!.radioQuestions.map(rq => {
              const counts = collectRadio(responses!, rq.key);
              const labelsMap = RADIO_LABELS[rq.key];
              if (!labelsMap || Object.keys(counts).length === 0) return null;
              return (
                <div key={rq.key}>
                  <div className="text-xs font-medium text-muted-foreground mb-2">{rq.label}</div>
                  <RadioDistribution counts={counts} labels={labelsMap} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {analytics!.sortedPriorities.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />
              Приоритеты улучшений (рейтинг)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics!.sortedPriorities.map(([key, count], idx) => {
                const label = PRIORITY_LABELS[key] || (key === "other" ? "Другое" : key);
                const maxCount = analytics!.sortedPriorities[0][1];
                const pct = (count / maxCount) * 100;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-5 text-xs font-bold text-muted-foreground text-right">
                      {idx + 1}.
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-0.5">
                        <span>{label}</span>
                        <span className="text-muted-foreground">{count} голос{count === 1 ? "" : count < 5 ? "а" : "ов"}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium flex items-center gap-2 px-1">
          <MessageSquare className="w-4 h-4" />
          Текстовые ответы по категориям
        </h3>
        {analytics!.textQuestions.map(tq => {
          const texts = collectTexts(responses!, tq.key);
          if (texts.length === 0) return null;
          return (
            <CollapsibleSection
              key={tq.key}
              title={`${tq.label} (${texts.length})`}
              icon={
                tq.icon === "thumbsup" ? <ThumbsUp className="w-4 h-4 text-green-500" /> :
                tq.icon === "thumbsdown" ? <ThumbsDown className="w-4 h-4 text-red-500" /> :
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              }
            >
              <div className="space-y-2">
                {texts.map((text, i) => (
                  <div key={i} className="text-sm bg-muted/50 rounded-lg px-3 py-2">
                    {text}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          );
        })}
      </div>

      <CollapsibleSection
        title={`Сырые ответы (${responses.length})`}
        icon={<ClipboardList className="w-4 h-4 text-muted-foreground" />}
      >
        <div className="space-y-4">
          {responses.map((resp: any, idx: number) => (
            <div key={resp.id || idx} className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-4 flex-wrap mb-3 text-sm">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  {resp.respondent_name || "Аноним"}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {resp.created_at ? formatMsk(resp.created_at, "dd.MM.yyyy HH:mm") : "\u2014"}
                </span>
              </div>
              <div className="space-y-1.5">
                {Object.entries(QUESTION_LABELS).map(([key, label]) => {
                  const val = resp.answers?.[key];
                  if (val === null || val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) return null;
                  return (
                    <div key={key} className="grid grid-cols-[1fr_1fr] gap-2 text-xs border-b border-border/30 pb-1 last:border-0">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{formatValue(key, val)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
