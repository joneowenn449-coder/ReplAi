import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Check, Pencil, Trash2, Loader2, KeyRound, Star, ChevronRight, MessageCircle, Link2, Unlink, Copy, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/api";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RecommendationsSection } from "@/components/RecommendationsSection";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSection?: "telegram";
}

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****...****" + key.slice(-4);
}

const OWNER_USER_ID = "5339ed4d-37c9-4fc1-bed9-dc4604bdffe6";

export const SettingsDialog = ({ open, onOpenChange, initialSection }: SettingsDialogProps) => {
  const { user } = useAuth();
  const isTelegramAvailable = user?.id === OWNER_USER_ID;
  const { data: activeCabinet } = useActiveCabinet();
  const updateCabinet = useUpdateCabinet();
  const validateApiKey = useValidateApiKey();
  const deleteApiKey = useDeleteApiKey();
  const deleteCabinet = useDeleteCabinet();

  const [prompt, setPrompt] = useState("");
  const [brandName, setBrandName] = useState("");
  const [cabinetName, setCabinetName] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [apiKeySectionOpen, setApiKeySectionOpen] = useState(false);
  const [ratingSectionOpen, setRatingSectionOpen] = useState(false);
  const [replyModes, setReplyModes] = useState<ReplyModes>(DEFAULT_REPLY_MODES);
  const [vibeSectionOpen, setVibeSectionOpen] = useState(false);
  const [telegramSectionOpen, setTelegramSectionOpen] = useState(false);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [telegramLinkLoading, setTelegramLinkLoading] = useState(false);
  const [telegramUnlinkLoading, setTelegramUnlinkLoading] = useState(false);
  const queryClient = useQueryClient();

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
      setTelegramLink(null);
      setApiKeySectionOpen(false);
      setRatingSectionOpen(false);
      setVibeSectionOpen(false);
      setTelegramSectionOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && initialSection === "telegram") {
      if (isTelegramAvailable) {
        setTelegramSectionOpen(true);
      }
      setTimeout(() => {
        document.getElementById("settings-telegram-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [open, initialSection, isTelegramAvailable]);

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
          <Collapsible open={apiKeySectionOpen} onOpenChange={setApiKeySectionOpen}>
            <div className="space-y-3">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover-elevate rounded-md py-1 px-1 -mx-1" data-testid="trigger-section-api-key">
                  <ChevronRight
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      apiKeySectionOpen ? "rotate-90" : ""
                    }`}
                  />
                  <KeyRound className="w-4 h-4 text-muted-foreground" />
                  <label className="text-sm font-medium text-foreground cursor-pointer">
                    API-ключ Wildberries
                  </label>
                  {hasKey && (
                    <span className="text-xs text-success font-medium ml-auto">
                      Подключено
                    </span>
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-3 pt-1">
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
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Reply Modes by Rating Section */}
          <Collapsible open={ratingSectionOpen} onOpenChange={setRatingSectionOpen}>
            <div className="space-y-3">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover-elevate rounded-md py-1 px-1 -mx-1" data-testid="trigger-section-rating-modes">
                  <ChevronRight
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      ratingSectionOpen ? "rotate-90" : ""
                    }`}
                  />
                  <label className="text-sm font-medium text-foreground cursor-pointer">
                    Режим ответов по рейтингу
                  </label>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-3 pt-1">
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
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Recommendations Section */}
          <RecommendationsSection />

          {/* Telegram Bot Section */}
          <Collapsible open={isTelegramAvailable ? telegramSectionOpen : false} onOpenChange={isTelegramAvailable ? setTelegramSectionOpen : undefined}>
            <div id="settings-telegram-section" className="space-y-3">
              <CollapsibleTrigger asChild disabled={!isTelegramAvailable}>
                <div className={`flex items-center gap-2 rounded-md py-1 px-1 -mx-1 ${isTelegramAvailable ? "cursor-pointer hover-elevate" : ""}`} data-testid="trigger-section-telegram">
                  {isTelegramAvailable && (
                    <ChevronRight
                      className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                        telegramSectionOpen ? "rotate-90" : ""
                      }`}
                    />
                  )}
                  <MessageCircle className={`w-4 h-4 ${isTelegramAvailable ? "text-muted-foreground" : "text-muted-foreground/50"}`} />
                  <span className={`text-sm font-medium ${isTelegramAvailable ? "text-foreground" : "text-muted-foreground"}`}>
                    Telegram-бот
                  </span>
                  {!isTelegramAvailable ? (
                    <Badge variant="secondary" className="ml-auto text-[10px] no-default-active-elevate">
                      Скоро
                    </Badge>
                  ) : cabinet?.telegram_chat_id ? (
                    <span className="text-xs text-success font-medium ml-auto">
                      Подключен
                    </span>
                  ) : null}
                </div>
              </CollapsibleTrigger>
              {!isTelegramAvailable && (
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground pl-5">
                    Уведомления об отзывах и управление ответами прямо в Telegram. Функция в разработке.
                  </p>
                </div>
              )}
              <CollapsibleContent>
                <div className="space-y-3 pt-1">
                  {cabinet?.telegram_chat_id ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted border border-border">
                        <Check className="w-4 h-4 text-success shrink-0" />
                        <span className="text-sm text-foreground">Telegram подключен</span>
                        <span className="text-xs text-success font-medium ml-auto">Подключен</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={telegramUnlinkLoading}
                        data-testid="button-telegram-unlink"
                        onClick={async () => {
                          if (!cabinet) return;
                          setTelegramUnlinkLoading(true);
                          try {
                            await apiRequest("/api/functions/telegram-unlink", {
                              method: "POST",
                              body: JSON.stringify({ cabinetId: cabinet.id }),
                            });
                            queryClient.invalidateQueries({ queryKey: ["wb_cabinets"] });
                            toast.success("Telegram отключен");
                          } catch (e: any) {
                            toast.error(e.message || "Ошибка отключения");
                          } finally {
                            setTelegramUnlinkLoading(false);
                          }
                        }}
                      >
                        {telegramUnlinkLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Отключение...
                          </>
                        ) : (
                          <>
                            <Unlink className="w-4 h-4 mr-2" />
                            Отключить Telegram
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Подключите Telegram-бот для получения уведомлений об отзывах и управления ответами прямо из мессенджера.
                      </p>
                      {!telegramLink ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={telegramLinkLoading}
                          data-testid="button-telegram-link"
                          onClick={async () => {
                            if (!cabinet) return;
                            setTelegramLinkLoading(true);
                            try {
                              const result = await apiRequest("/api/functions/telegram-link", {
                                method: "POST",
                                body: JSON.stringify({ cabinetId: cabinet.id }),
                              }) as { link: string };
                              setTelegramLink(result.link);
                            } catch (e: any) {
                              toast.error(e.message || "Ошибка генерации ссылки");
                            } finally {
                              setTelegramLinkLoading(false);
                            }
                          }}
                        >
                          {telegramLinkLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Генерация ссылки...
                            </>
                          ) : (
                            <>
                              <Link2 className="w-4 h-4 mr-2" />
                              Подключить Telegram
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Нажмите на ссылку или скопируйте и откройте в Telegram:
                          </p>
                          <div className="flex items-center gap-2">
                            <a
                              href={telegramLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary underline break-all flex-1"
                              data-testid="link-telegram-connect"
                            >
                              {telegramLink}
                            </a>
                            <Button
                              variant="outline"
                              size="icon"
                              data-testid="button-copy-telegram-link"
                              onClick={() => {
                                navigator.clipboard.writeText(telegramLink);
                                toast.success("Ссылка скопирована");
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Ссылка действительна 10 минут.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Company Vibe Section */}
          <Collapsible open={vibeSectionOpen} onOpenChange={setVibeSectionOpen}>
            <div className="space-y-3">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover-elevate rounded-md py-1 px-1 -mx-1" data-testid="trigger-section-vibe">
                  <ChevronRight
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      vibeSectionOpen ? "rotate-90" : ""
                    }`}
                  />
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  <label className="text-sm font-medium text-foreground cursor-pointer">
                    Вайб компании
                  </label>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-4 pt-1">
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground block">
                      Тон и правила ответов
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
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
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
