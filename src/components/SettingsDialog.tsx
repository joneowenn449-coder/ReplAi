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
  useValidateApiKey,
  useDeleteApiKey,
  DEFAULT_REPLY_MODES,
  ReplyModes,
  ReplyMode,
} from "@/hooks/useReviews";
import { useActiveCabinet, useUpdateCabinet, useDeleteCabinet } from "@/hooks/useCabinets";
import type { WbCabinet } from "@/hooks/useCabinets";
import { toast } from "sonner";
import { Check, Pencil, Trash2, Loader2, KeyRound, Star, Download } from "lucide-react";
import { RecommendationsSection } from "@/components/RecommendationsSection";
import { useExportData } from "@/hooks/useExportData";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****...****" + key.slice(-4);
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { data: activeCabinet } = useActiveCabinet();
  const updateCabinet = useUpdateCabinet();
  const validateApiKey = useValidateApiKey();
  const deleteApiKey = useDeleteApiKey();
  const deleteCabinet = useDeleteCabinet();
  const { exportAll, isExporting } = useExportData();
  const [prompt, setPrompt] = useState("");
  const [brandName, setBrandName] = useState("");
  const [cabinetName, setCabinetName] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [replyModes, setReplyModes] = useState<ReplyModes>(DEFAULT_REPLY_MODES);

  const cabinet = activeCabinet;
  const hasKey = !!cabinet?.wb_api_key;

  useEffect(() => {
    if (cabinet) {
      setPrompt(cabinet.ai_prompt_template || "");
      setBrandName(cabinet.brand_name || "");
      setCabinetName(cabinet.name || "");
      setReplyModes((cabinet.reply_modes as ReplyModes) || DEFAULT_REPLY_MODES);
    }
  }, [cabinet?.id, cabinet?.ai_prompt_template, cabinet?.brand_name, cabinet?.name, cabinet?.reply_modes]);

  useEffect(() => {
    if (!open) {
      setIsEditingKey(false);
      setApiKeyInput("");
    }
  }, [open]);

  const handleSaveSettings = () => {
    if (!cabinet) return;
    updateCabinet.mutate(
      {
        id: cabinet.id,
        updates: {
          ai_prompt_template: prompt,
          brand_name: brandName,
          name: cabinetName,
        } as Partial<WbCabinet>,
      },
      {
        onSuccess: () => {
          toast.success("Настройки сохранены");
        },
      }
    );
  };

  const handleToggleRating = (rating: string, checked: boolean) => {
    if (!cabinet) return;
    const newModes: ReplyModes = {
      ...replyModes,
      [rating]: (checked ? "auto" : "manual") as ReplyMode,
    };
    setReplyModes(newModes);
    updateCabinet.mutate(
      {
        id: cabinet.id,
        updates: { reply_modes: newModes } as Partial<WbCabinet>,
      },
      {
        onSuccess: () => {
          toast.success("Режим обновлён");
        },
      }
    );
  };

  const handleValidateKey = () => {
    if (!apiKeyInput.trim() || !cabinet) return;
    validateApiKey.mutate({ apiKey: apiKeyInput.trim(), cabinetId: cabinet.id }, {
      onSuccess: () => {
        setApiKeyInput("");
        setIsEditingKey(false);
      },
    });
  };

  const handleDeleteKey = () => {
    if (!cabinet) return;
    deleteApiKey.mutate(cabinet.id, {
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
          <DialogTitle>Настройки кабинета</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-4">
          {/* Cabinet Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground block">
              Название кабинета
            </label>
            <Input
              value={cabinetName}
              onChange={(e) => setCabinetName(e.target.value)}
              placeholder="Например: Магазин Одежда"
              className="text-sm"
            />
          </div>

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
                    {maskKey(cabinet!.wb_api_key!)}
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

          {/* Company Vibe Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              ✨ Вайб компании
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] text-sm"
              placeholder="Опиши тон, стиль и правила ответов бренда."
            />
            <p className="text-xs text-muted-foreground">
              Это описание тона и правил — основа для всех ответов ИИ на отзывы. Всё, что ты напишешь здесь, будет учтено при формировании ответов.
            </p>
          </div>

          {/* Export Data Section */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-sm font-medium text-foreground block">
              📦 Экспорт данных
            </label>
            <p className="text-xs text-muted-foreground">
              Скачать все данные (отзывы, чаты, сообщения, рекомендации, настройки) в CSV-файлах.
            </p>
            <Button
              variant="outline"
              onClick={exportAll}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Подготовка файлов...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Скачать все данные (CSV)
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={updateCabinet.isPending}
          >
            {updateCabinet.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
