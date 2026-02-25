import { useState, useEffect } from "react";
import {
  useUpdateAdminNotes,
  useDeleteUser,
  useUserSessions,
  useAdminSetSubscription,
  useAdminCancelSubscription,
  type AdminUser,
} from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, MessageCircle,
  Trash2, Save, Store, CreditCard, StickyNote, Clock, Monitor,
  Smartphone, Tablet, Globe, BarChart3, Crown,
} from "lucide-react";
import { formatMsk, distanceToNowMsk } from "@/lib/dates";
import { SUBSCRIPTION_PLANS } from "@shared/subscriptionPlans";

interface UserDetailModalProps {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
}

const statusConfig: Record<AdminUser["status"], { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 no-default-hover-elevate",
  },
  trial: {
    label: "Trial",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 no-default-hover-elevate",
  },
  expired: {
    label: "Expired",
    className: "no-default-hover-elevate",
  },
};

export const UserDetailModal = ({ user, open, onClose }: UserDetailModalProps) => {
  const { user: currentUser } = useAuth();
  const updateAdminNotes = useUpdateAdminNotes();
  const deleteUser = useDeleteUser();
  const setSubscription = useAdminSetSubscription();
  const cancelSubscription = useAdminCancelSubscription();
  const { data: sessions, isLoading: sessionsLoading } = useUserSessions(open ? user?.id ?? null : null);

  const [notes, setNotes] = useState(user?.admin_notes || "");
  const [notesChanged, setNotesChanged] = useState(false);

  const [subPlanId, setSubPlanId] = useState(user?.subscription?.plan_id || "");
  const [subPhoto, setSubPhoto] = useState(user?.subscription?.photo_analysis_enabled || false);
  const [subAiAnalyst, setSubAiAnalyst] = useState(user?.subscription?.ai_analyst_enabled || false);
  const [subPeriodDays, setSubPeriodDays] = useState("30");
  const [subResetPeriod, setSubResetPeriod] = useState(false);
  const [showSubForm, setShowSubForm] = useState(false);
  const [showSubCancelConfirm, setShowSubCancelConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setNotes(user.admin_notes || "");
      setNotesChanged(false);
      setSubPlanId(user.subscription?.plan_id || "");
      setSubPhoto(user.subscription?.photo_analysis_enabled || false);
      setSubAiAnalyst(user.subscription?.ai_analyst_enabled || false);
      setShowSubForm(false);
      setShowSubCancelConfirm(false);
    }
  }, [user?.id, user?.admin_notes]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
      setNotesChanged(false);
      onClose();
    }
  };

  const handleNoteSave = () => {
    if (!user) return;
    updateAdminNotes.mutate(
      { userId: user.id, notes },
      { onSuccess: () => setNotesChanged(false) }
    );
  };

  const handleDelete = () => {
    if (!user) return;
    deleteUser.mutate(user.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onClose();
      },
    });
  };

  if (!user) return null;

  const sc = statusConfig[user.status];
  const userName = user.display_name || user.email || user.id.slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap" data-testid="text-detail-title">
            <span>{userName}</span>
            <Badge variant="outline" className={sc.className} data-testid="badge-detail-status">
              {sc.label}
            </Badge>
            {user.role === "admin" && (
              <Badge variant="default" className="no-default-hover-elevate" data-testid="badge-detail-role">admin</Badge>
            )}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs" data-testid="text-detail-id">
            {user.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Email</span>
              <p className="font-medium text-foreground" data-testid="text-detail-email">{user.email || "\u2014"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Телефон</span>
              <p className="font-medium text-foreground" data-testid="text-detail-phone">{user.phone || "\u2014"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Регистрация</span>
              <p className="font-medium text-foreground" data-testid="text-detail-registration">
                {user.created_at ? formatMsk(user.created_at, "dd MMM yyyy, HH:mm") : "—"}
              </p>
            </div>
            <div className="flex items-start gap-1.5">
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Последняя активность
                </span>
                <p className="font-medium text-foreground" data-testid="text-detail-last-seen">
                  {user.last_seen_at
                    ? distanceToNowMsk(user.last_seen_at)
                    : "\u2014"}
                </p>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <Store className="w-3.5 h-3.5" />
                Кабинеты WB
              </span>
              <p className="font-medium text-foreground" data-testid="text-detail-cabinets">{user.cabinetsCount}</p>
            </div>
            {user.telegram && (
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Telegram
                </span>
                <p className="font-medium text-foreground" data-testid="text-detail-telegram">
                  {user.telegram.username ? (
                    <a
                      href={`https://t.me/${user.telegram.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500"
                    >
                      @{user.telegram.username}
                    </a>
                  ) : (
                    user.telegram.firstName || "Подключён"
                  )}
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Метрики использования
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm" data-testid="section-usage-metrics">
              <div>
                <span className="text-muted-foreground">Статус API WB</span>
                <div className="mt-0.5">
                  <Badge
                    variant="outline"
                    className={
                      user.apiStatus === "connected_ok"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 no-default-hover-elevate"
                        : user.apiStatus === "error_401"
                        ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20 no-default-hover-elevate"
                        : "no-default-hover-elevate"
                    }
                    data-testid="badge-api-status"
                  >
                    {user.apiStatus === "connected_ok"
                      ? "Подключён"
                      : user.apiStatus === "error_401"
                      ? "Ошибка 401"
                      : "Не подключён"}
                  </Badge>
                  {user.apiStatusCheckedAt && (
                    <p className="text-xs text-muted-foreground mt-1" data-testid="text-api-checked-at">
                      {formatMsk(user.apiStatusCheckedAt, "dd MMM yyyy, HH:mm")}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Первый ответ (Time-to-Value)</span>
                <p className="font-medium text-foreground" data-testid="text-first-response">
                  {user.firstResponseDate ? formatMsk(user.firstResponseDate, "dd MMM yyyy") : "\u2014"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Расход токенов / день</span>
                <p className="font-medium text-foreground" data-testid="text-tokens-per-day">
                  {user.tokensSpentPerDay || 0}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Использование Vision</span>
                <p className="font-medium text-foreground" data-testid="text-vision-usage">
                  {user.visionUsagePercent}%
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Ср. отзывов / день</span>
                <p className="font-medium text-foreground" data-testid="text-avg-daily-reviews">
                  {user.avgDailyReviews}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">AI Аналитик</span>
                <p className="font-medium" data-testid="text-ai-analytics-sub">
                  {user.hasAiAnalyticsSub ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Активна</span>
                  ) : (
                    <span className="text-muted-foreground">Нет</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Подписка
            </h3>
            {user.subscription ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Тариф: </span>
                    <span className="font-medium">{SUBSCRIPTION_PLANS.find(p => p.id === user.subscription!.plan_id)?.name || user.subscription.plan_id}</span>
                  </div>
                  <div>
                    <Badge variant={user.subscription.status === "active" ? "default" : "secondary"} data-testid="badge-sub-status">
                      {user.subscription.status === "active" ? "Активна" : user.subscription.status === "cancelled" ? "Отменена" : user.subscription.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ответов: </span>
                    <span className="font-medium">{user.subscription.replies_used_this_period}</span>
                    {(() => {
                      const plan = SUBSCRIPTION_PLANS.find(p => p.id === user.subscription!.plan_id);
                      return plan ? <span className="text-muted-foreground"> / {plan.replyLimit === -1 ? "∞" : plan.replyLimit}</span> : null;
                    })()}
                  </div>
                  <div>
                    <span className="text-muted-foreground">До: </span>
                    <span className="font-medium">{user.subscription.current_period_end ? formatMsk(user.subscription.current_period_end, "dd.MM.yyyy") : "—"}</span>
                  </div>
                  <div className="col-span-2 flex gap-2">
                    {user.subscription.photo_analysis_enabled && <Badge variant="outline" data-testid="badge-sub-photo">Анализ фото</Badge>}
                    {user.subscription.ai_analyst_enabled && <Badge variant="outline" data-testid="badge-sub-ai">AI Аналитик</Badge>}
                    {!user.subscription.photo_analysis_enabled && !user.subscription.ai_analyst_enabled && (
                      <span className="text-xs text-muted-foreground">Модули не подключены</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSubForm(!showSubForm)}
                    data-testid="button-edit-subscription"
                  >
                    Изменить
                  </Button>
                  {!showSubCancelConfirm ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowSubCancelConfirm(true)}
                      data-testid="button-cancel-subscription"
                    >
                      Отменить подписку
                    </Button>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-destructive">Подтвердить?</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          cancelSubscription.mutate(user.id);
                          setShowSubCancelConfirm(false);
                        }}
                        disabled={cancelSubscription.isPending}
                        data-testid="button-confirm-cancel-subscription"
                      >
                        {cancelSubscription.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Да, отменить"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowSubCancelConfirm(false)}>Нет</Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground" data-testid="text-no-subscription">Подписка не активна</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSubForm(true)}
                  data-testid="button-assign-subscription"
                >
                  Назначить подписку
                </Button>
              </div>
            )}
            {showSubForm && (
              <div className="mt-3 p-3 rounded-md border border-border space-y-3" data-testid="form-subscription">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Тариф</label>
                  <Select value={subPlanId} onValueChange={setSubPlanId}>
                    <SelectTrigger data-testid="select-sub-plan">
                      <SelectValue placeholder="Выберите тариф" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBSCRIPTION_PLANS.map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} — {plan.price} ₽/мес ({plan.replyLimit === -1 ? "∞" : plan.replyLimit} ответов)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Анализ фото (+199 ₽)</label>
                  <Switch checked={subPhoto} onCheckedChange={setSubPhoto} data-testid="switch-sub-photo" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">AI Аналитик (+299 ₽)</label>
                  <Switch checked={subAiAnalyst} onCheckedChange={setSubAiAnalyst} data-testid="switch-sub-ai-analyst" />
                </div>
                {user.subscription ? (
                  <div className="flex items-center gap-2">
                    <Switch checked={subResetPeriod} onCheckedChange={setSubResetPeriod} data-testid="switch-sub-reset-period" />
                    <label className="text-sm">Сбросить период</label>
                  </div>
                ) : null}
                {(!user.subscription || subResetPeriod) && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Период (дней)</label>
                    <Input
                      type="number"
                      value={subPeriodDays}
                      onChange={(e) => setSubPeriodDays(e.target.value)}
                      min={1}
                      max={365}
                      className="w-32"
                      data-testid="input-sub-period"
                    />
                  </div>
                )}
                <Button
                  size="sm"
                  disabled={!subPlanId || setSubscription.isPending}
                  onClick={() => {
                    const payload: any = {
                      userId: user.id,
                      planId: subPlanId,
                      photoAnalysis: subPhoto,
                      aiAnalyst: subAiAnalyst,
                    };
                    if (!user.subscription || subResetPeriod) {
                      payload.periodDays = parseInt(subPeriodDays) || 30;
                    }
                    setSubscription.mutate(payload, {
                      onSuccess: () => setShowSubForm(false),
                    });
                  }}
                  data-testid="button-submit-subscription"
                >
                  {setSubscription.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
                  {user.subscription ? "Обновить подписку" : "Назначить подписку"}
                </Button>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              История платежей
              {user.paymentsCount > 0 && (
                <span className="text-muted-foreground font-normal">
                  ({user.paymentsCount} оплат на {user.totalPaid.toLocaleString("ru-RU")} \u20BD)
                </span>
              )}
            </h3>
            {user.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-payments">Платежей нет</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {user.payments.map((pay) => {
                  const payStatus = pay.status === "completed" ? "Оплачен" : pay.status === "pending" ? "Ожидание" : pay.status;
                  const payStatusClass =
                    pay.status === "completed"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
                  return (
                    <div
                      key={pay.id}
                      className="flex items-center justify-between gap-2 flex-wrap rounded-md border border-border px-3 py-2 text-sm"
                      data-testid={`row-payment-${pay.id}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{Number(pay.amount).toLocaleString("ru-RU")} \u20BD</span>
                        <span className="text-muted-foreground">{pay.tokens} токенов</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`${payStatusClass} no-default-hover-elevate`}>
                          {payStatus}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {pay.created_at ? formatMsk(pay.created_at, "dd.MM.yyyy HH:mm") : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Сессии и устройства
              {sessions && sessions.length > 0 && (
                <span className="text-muted-foreground font-normal">
                  ({sessions.length})
                </span>
              )}
            </h3>
            {sessionsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Загрузка...
              </div>
            ) : !sessions || sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-sessions">Сессий нет</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {sessions.map((s) => {
                  const DeviceIcon = s.device_type === "mobile" ? Smartphone
                    : s.device_type === "tablet" ? Tablet
                    : Monitor;
                  const browserStr = [s.browser, s.browser_version].filter(Boolean).join(" ");
                  const osStr = [s.os, s.os_version].filter(Boolean).join(" ");
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 flex-wrap rounded-md border border-border px-3 py-2 text-sm"
                      data-testid={`row-session-${s.id}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <DeviceIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate">{s.ip_address || "?"}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {[browserStr, osStr, s.device].filter(Boolean).join(" / ")}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {s.created_at ? formatMsk(s.created_at, "dd.MM.yyyy HH:mm") : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <StickyNote className="w-4 h-4" />
              Заметки администратора
            </h3>
            <Textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesChanged(true);
              }}
              placeholder="Заметки о пользователе..."
              className="resize-none text-sm"
              rows={3}
              data-testid="textarea-admin-notes"
            />
            {notesChanged && (
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  onClick={handleNoteSave}
                  disabled={updateAdminNotes.isPending}
                  data-testid="button-save-notes"
                >
                  {updateAdminNotes.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <Save className="w-4 h-4 mr-1.5" />
                  )}
                  Сохранить
                </Button>
              </div>
            )}
          </div>

          {user.id !== currentUser?.id && (
            <>
              <Separator />
              <div>
                {!showDeleteConfirm ? (
                  <Button
                    variant="outline"
                    className="text-destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    data-testid="button-detail-delete"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Удалить пользователя
                  </Button>
                ) : (
                  <div className="rounded-lg border border-destructive/30 p-3 space-y-3">
                    <p className="text-sm text-destructive font-medium">
                      Все данные пользователя будут безвозвратно удалены.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                        data-testid="button-detail-cancel-delete"
                      >
                        Отмена
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleteUser.isPending}
                        data-testid="button-detail-confirm-delete"
                      >
                        {deleteUser.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                        Подтвердить удаление
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
