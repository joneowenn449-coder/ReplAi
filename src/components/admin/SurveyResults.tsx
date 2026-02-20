import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ClipboardList, User, Calendar } from "lucide-react";
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

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function SurveyResults() {
  const { data: responses, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/survey-responses"],
    queryFn: async () => {
      const resp = await apiRequest("GET", "/api/admin/survey-responses");
      return resp.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="loading-survey-results">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!responses || responses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Ответов пока нет</p>
          <p className="text-xs text-muted-foreground mt-1">
            Отправьте ссылку на опрос: <code className="bg-muted px-1.5 py-0.5 rounded">/survey</code>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Всего ответов: <span className="font-medium text-foreground">{responses.length}</span>
        </p>
      </div>

      {responses.map((resp: any, idx: number) => (
        <Card key={resp.id || idx}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-muted-foreground" />
                {resp.respondent_name || "Аноним"}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground font-normal">
                <Calendar className="w-3.5 h-3.5" />
                {resp.created_at ? new Date(resp.created_at).toLocaleString("ru-RU") : "—"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(QUESTION_LABELS).map(([key, label]) => {
                const val = resp.answers?.[key];
                if (val === null || val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) return null;
                return (
                  <div key={key} className="grid grid-cols-[1fr_1fr] gap-2 text-sm border-b border-border/50 pb-2 last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{formatValue(key, val)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
