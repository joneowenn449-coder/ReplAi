import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Bot, BookOpen, ShieldCheck, ShieldX, Plus, Trash2, Star } from "lucide-react";
import { apiRequest } from "@/lib/api";

interface ExampleEntry {
  rating: number;
  text: string;
}

export function AISettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [responseExamples, setResponseExamples] = useState("");
  const [rules, setRules] = useState("");
  const [rulesDo, setRulesDo] = useState("");
  const [rulesDont, setRulesDont] = useState("");
  const [examplesV2, setExamplesV2] = useState<ExampleEntry[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await apiRequest("/api/admin/global-settings");
      setDefaultPrompt(data.default_prompt || "");
      setResponseExamples(data.response_examples || "");
      setRules(data.rules || "");
      setRulesDo(data.rules_do || "");
      setRulesDont(data.rules_dont || "");
      try {
        const parsed = JSON.parse(data.response_examples_v2 || "[]");
        if (Array.isArray(parsed) && parsed.length > 0) {
          setExamplesV2(parsed);
        }
      } catch {}
    } catch (e: any) {
      toast({ title: "Ошибка загрузки", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await apiRequest("/api/admin/global-settings", {
        method: "POST",
        body: JSON.stringify({
          settings: {
            default_prompt: defaultPrompt,
            response_examples: responseExamples,
            rules: rules,
            rules_do: rulesDo,
            rules_dont: rulesDont,
            response_examples_v2: JSON.stringify(examplesV2.filter(e => e.text.trim())),
          },
        }),
      });
      toast({ title: "Сохранено", description: "Настройки ИИ обновлены" });
    } catch (e: any) {
      toast({ title: "Ошибка сохранения", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function addExample() {
    setExamplesV2([...examplesV2, { rating: 5, text: "" }]);
  }

  function removeExample(index: number) {
    setExamplesV2(examplesV2.filter((_, i) => i !== index));
  }

  function updateExample(index: number, field: keyof ExampleEntry, value: any) {
    const updated = [...examplesV2];
    updated[index] = { ...updated[index], [field]: value };
    setExamplesV2(updated);
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
            <ShieldCheck className="w-5 h-5 text-green-600" />
            Обязательные правила
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="rules-do">
              Правила, которым ИИ ОБЯЗАН следовать при генерации ответов. Каждое правило с новой строки.
            </Label>
            <Textarea
              id="rules-do"
              data-testid="input-rules-do"
              value={rulesDo}
              onChange={(e) => setRulesDo(e.target.value)}
              placeholder={"- Всегда благодари за отзыв\n- Для негативных отзывов (1-3 звезды) предлагай связаться для решения проблемы\n- Используй вежливый тон\n- Пиши от лица бренда"}
              className="min-h-[120px] text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldX className="w-5 h-5 text-red-500" />
            Запрещено
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="rules-dont">
              Что ИИ НЕ ДОЛЖЕН делать. Каждое ограничение с новой строки.
            </Label>
            <Textarea
              id="rules-dont"
              data-testid="input-rules-dont"
              value={rulesDont}
              onChange={(e) => setRulesDont(e.target.value)}
              placeholder={'- Не упоминай конкурентов\n- Не используй слово "дешёвый"\n- Не обещай скидки и компенсации\n- Не извиняйся чрезмерно'}
              className="min-h-[120px] text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {rules && !rulesDo && !rulesDont && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-yellow-600">
              <ShieldCheck className="w-4 h-4" />
              Старые правила (устаревший формат)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="rules" className="text-xs text-muted-foreground">
                Эти правила будут использоваться, пока вы не заполните новые поля выше. Рекомендуем перенести правила в новые блоки.
              </Label>
              <Textarea
                id="rules"
                data-testid="input-rules"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className="min-h-[100px] text-sm"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Примеры идеальных ответов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Добавьте примеры ответов для разных рейтингов. При генерации ИИ получит до 3 примеров, подобранных по рейтингу текущего отзыва.
            </p>

            {examplesV2.map((example, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-3" data-testid={`example-entry-${index}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <Select
                      value={String(example.rating)}
                      onValueChange={(v) => updateExample(index, "rating", parseInt(v))}
                    >
                      <SelectTrigger className="w-[140px]" data-testid={`select-rating-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 звезда</SelectItem>
                        <SelectItem value="2">2 звезды</SelectItem>
                        <SelectItem value="3">3 звезды</SelectItem>
                        <SelectItem value="4">4 звезды</SelectItem>
                        <SelectItem value="5">5 звёзд</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExample(index)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    data-testid={`button-remove-example-${index}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Textarea
                  value={example.text}
                  onChange={(e) => updateExample(index, "text", e.target.value)}
                  placeholder="Пример идеального ответа для этого рейтинга..."
                  className="min-h-[80px] text-sm"
                  data-testid={`input-example-text-${index}`}
                />
              </div>
            ))}

            <Button
              variant="outline"
              onClick={addExample}
              className="w-full"
              data-testid="button-add-example"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить пример
            </Button>

            {responseExamples && examplesV2.length === 0 && (
              <div className="border-t pt-4">
                <Label className="text-xs text-muted-foreground block mb-2">
                  Старые примеры (текстовый формат, используются если нет примеров с рейтингом):
                </Label>
                <Textarea
                  data-testid="input-response-examples"
                  value={responseExamples}
                  onChange={(e) => setResponseExamples(e.target.value)}
                  className="min-h-[120px] text-sm"
                />
              </div>
            )}
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
