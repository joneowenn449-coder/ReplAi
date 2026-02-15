import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Bot, BookOpen, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/api";

export function AISettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [responseExamples, setResponseExamples] = useState("");
  const [rules, setRules] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const resp = await apiRequest("GET", "/api/admin/global-settings");
      const data = await resp.json();
      setDefaultPrompt(data.default_prompt || "");
      setResponseExamples(data.response_examples || "");
      setRules(data.rules || "");
    } catch (e: any) {
      toast({ title: "Ошибка загрузки", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await apiRequest("POST", "/api/admin/global-settings", {
        settings: {
          default_prompt: defaultPrompt,
          response_examples: responseExamples,
          rules: rules,
        },
      });
      toast({ title: "Сохранено", description: "Настройки ИИ обновлены" });
    } catch (e: any) {
      toast({ title: "Ошибка сохранения", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="loading-ai-settings">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Системный промпт по умолчанию
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="default-prompt">
              Основная инструкция для ИИ. Используется, если у кабинета нет собственного промпта.
            </Label>
            <Textarea
              id="default-prompt"
              data-testid="input-default-prompt"
              value={defaultPrompt}
              onChange={(e) => setDefaultPrompt(e.target.value)}
              placeholder="Ты — менеджер бренда на Wildberries. Напиши вежливый ответ на отзыв покупателя. 2-4 предложения."
              className="min-h-[120px] text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Если оставить пустым, будет использован встроенный промпт по умолчанию.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Правила и ограничения
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="rules">
              Правила, которым ИИ должен следовать при генерации ответов. Добавляются к промпту автоматически.
            </Label>
            <Textarea
              id="rules"
              data-testid="input-rules"
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder={"- Не упоминай конкурентов\n- Не используй слово \"дешёвый\"\n- Всегда благодари за отзыв\n- Для негативных отзывов (1-3 звезды) предлагай связаться для решения проблемы"}
              className="min-h-[150px] text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Примеры ответов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="examples">
              Образцы хороших ответов для разных ситуаций. ИИ будет ориентироваться на них при генерации.
            </Label>
            <Textarea
              id="examples"
              data-testid="input-response-examples"
              value={responseExamples}
              onChange={(e) => setResponseExamples(e.target.value)}
              placeholder={"Пример 1 (позитивный отзыв, 5 звёзд):\n\"Спасибо за ваш отзыв! Мы рады, что товар вам понравился. Будем ждать вас снова!\"\n\nПример 2 (негативный отзыв, 1-2 звезды):\n\"Благодарим за обратную связь. Нам очень жаль, что товар не оправдал ожиданий. Свяжитесь с нами для решения вопроса.\""}
              className="min-h-[200px] text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          data-testid="button-save-ai-settings"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Сохранить настройки
        </Button>
      </div>
    </div>
  );
}
