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
import {
  useSettings,
  useUpdateSettings,
  useValidateApiKey,
  useDeleteApiKey,
} from "@/hooks/useReviews";
import { toast } from "sonner";
import { Check, Pencil, Trash2, Loader2, KeyRound } from "lucide-react";

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
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isEditingKey, setIsEditingKey] = useState(false);

  const hasKey = !!settings?.wb_api_key;

  useEffect(() => {
    if (settings?.ai_prompt_template) {
      setPrompt(settings.ai_prompt_template);
    }
  }, [settings?.ai_prompt_template]);

  useEffect(() => {
    if (!open) {
      setIsEditingKey(false);
      setApiKeyInput("");
    }
  }, [open]);

  const handleSavePrompt = () => {
    updateSettings.mutate(
      { ai_prompt_template: prompt },
      {
        onSuccess: () => {
          toast.success("Настройки сохранены");
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Настройки</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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

          {/* AI Prompt Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground block">
              Промпт для генерации ответов
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[160px] text-sm"
              placeholder="Опишите, как ИИ должен отвечать на отзывы..."
            />
            <p className="text-xs text-muted-foreground">
              Этот промпт будет использоваться как системная инструкция при
              генерации ответов на отзывы.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSavePrompt}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? "Сохранение..." : "Сохранить промпт"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
