import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  useSettings,
  useUpdateSettings,
  useValidateApiKey,
  useDeleteApiKey,
  DEFAULT_REPLY_MODES,
  ReplyModes,
  ReplyMode,
  Settings,
} from "@/hooks/useReviews";
import { toast } from "sonner";
import { Check, Pencil, Trash2, Loader2, KeyRound, Star } from "lucide-react";
import { RecommendationsSection } from "@/components/RecommendationsSection";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****...****" + key.slice(-4);
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const validateApiKey = useValidateApiKey();
  const deleteApiKey = useDeleteApiKey();

  const [prompt, setPrompt] = useState("");
  const [brandName, setBrandName] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [replyModes, setReplyModes] = useState<ReplyModes>(DEFAULT_REPLY_MODES);

  const hasKey = !!settings?.wb_api_key;

  useEffect(() => {
    if (settings?.ai_prompt_template) {
      setPrompt(settings.ai_prompt_template);
    }
    if (settings?.brand_name !== undefined) {
      setBrandName(settings.brand_name);
    }
  }, [settings?.ai_prompt_template, settings?.brand_name]);

  useEffect(() => {
    if (settings?.reply_modes) {
      setReplyModes(settings.reply_modes);
    }
  }, [settings?.reply_modes]);

  useEffect(() => {
    if (!open) {
      setIsEditingKey(false);
      setApiKeyInput("");
    }
  }, [open]);

  const handleSaveSettings = () => {
    updateSettings.mutate(
      { ai_prompt_template: prompt, brand_name: brandName } as Partial<Settings>,
      {
        onSuccess: () => {
          toast.success("Настройки сохранены");
        },
      }
    );
  };

  const handleToggleRating = (rating: string, checked: boolean) => {
    const newModes: ReplyModes = {
      ...replyModes,
      [rating]: (checked ? "auto" : "manual") as ReplyMode,
    };
    setReplyModes(newModes);
    updateSettings.mutate(
      { reply_modes: newModes },
      {
        onSuccess: () => {
          toast.success("Режим обновлён");
        },
      }
    );
  };

  const handleValidateKey = () => {
    if (!apiKeyInput.trim()) return;
    validateApiKey.mutate(apiKeyInput.trim(), {
      onSuccess: () => {
        setApiKeyInput("");
        setIsEditingKey(false);
      },
    });
  };

  const handleDeleteKey = () => {
    deleteApiKey.mutate(undefined, {
      onSuccess: () => {
        setIsEditingKey(false);
        setApiKeyInput("");
      },
    });
  };

  const handleCancelEdit = () => {
    setIsEditingKey(false);
    setApiKeyInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-4 sm:p-5">
        <DialogHeader className="pb-2">
          <DialogTitle>Настройки</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-4">
          {/* API Key Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium text-foreground">
                API-ключ Wildberries
              </label>
            </div>

            {hasKey && !isEditingKey ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md bg-muted border border-border">
                  <Check className="w-4 h-4 text-success shrink-0" />
                  <span className="text-sm font-mono text-foreground truncate">
                    {maskKey(settings.wb_api_key!)}
                  </span>
                  <span className="text-xs text-success font-medium ml-auto shrink-0">
                    Подключено
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsEditingKey(true)}
                  title="Изменить ключ"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      title="Удалить ключ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить API-ключ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Синхронизация отзывов и отправка ответов перестанут
                        работать до добавления нового ключа.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteKey}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Удалить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Вставьте API-ключ Wildberries..."
                  className="font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleValidateKey}
                    disabled={
                      !apiKeyInput.trim() || validateApiKey.isPending
                    }
                    className="flex-1"
                  >
                    {validateApiKey.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Проверка...
                      </>
                    ) : (
                      "Проверить подключение"
                    )}
                  </Button>
                  {isEditingKey && (
                    <Button variant="outline" onClick={handleCancelEdit}>
                      Отмена
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ключ будет проверен тестовым запросом к WB API и сохранён
                  только при успешном подключении.
                </p>
              </div>
            )}
          </div>

          {/* Reply Modes by Rating Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground block">
              Режим ответов по рейтингу
            </label>
            <p className="text-xs text-muted-foreground">
              Авто — ответ отправляется сразу, Ручной — попадает на согласование.
            </p>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const key = String(rating);
                const isAuto = replyModes[key] === "auto";
                return (
                  <div
                    key={rating}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: rating }).map((_, i) => (
                        <Star
                          key={i}
                          className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                      {Array.from({ length: 5 - rating }).map((_, i) => (
                        <Star
                          key={`empty-${i}`}
                          className="w-3.5 h-3.5 text-muted-foreground/30"
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {isAuto ? "Авто" : "Ручной"}
                      </span>
                      <Switch
                        checked={isAuto}
                        onCheckedChange={(checked) =>
                          handleToggleRating(key, checked)
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations Section */}
          <RecommendationsSection />

          {/* Brand Name Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground block">
              Название бренда (по умолчанию)
            </label>
            <Input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Например: LUNÉRA"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Бренд автоматически определяется из WB для каждого отзыва. Это значение используется как запасное, если бренд не определён.
            </p>
          </div>

          {/* AI Prompt Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground block">
              Промпт для генерации ответов
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] text-sm"
              placeholder="Опишите, как ИИ должен отвечать на отзывы..."
            />
            <p className="text-xs text-muted-foreground">
              Этот промпт будет использоваться как системная инструкция при
              генерации ответов на отзывы.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
