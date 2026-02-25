import { ArrowLeft, Check, Camera, BarChart3, Crown, Loader2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useSubscription, useCancelSubscription } from "@/hooks/useSubscription";
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_MODULES, calculateTotalPrice } from "@shared/subscriptionPlans";

export default function Pricing() {
  const navigate = useNavigate();
  const { data, isLoading } = useSubscription();
  const cancelSub = useCancelSubscription();

  const subscription = data?.subscription;

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [photoModule, setPhotoModule] = useState(false);
  const [aiAnalystModule, setAiAnalystModule] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const activePlanId = subscription?.plan_id;
  const effectivePlan = selectedPlan || activePlanId;
  const effectivePhoto = selectedPlan ? photoModule : (subscription?.photo_analysis_enabled || false);
  const effectiveAiAnalyst = selectedPlan ? aiAnalystModule : (subscription?.ai_analyst_enabled || false);

  const totalPrice = useMemo(() => {
    if (!effectivePlan) return 0;
    return calculateTotalPrice(effectivePlan, effectivePhoto, effectiveAiAnalyst);
  }, [effectivePlan, effectivePhoto, effectiveAiAnalyst]);

  const currentPlan = useMemo(() => {
    return SUBSCRIPTION_PLANS.find(p => p.id === activePlanId);
  }, [activePlanId]);

  const handleSubscribe = () => {
    toast.error("Оплата временно недоступна. Для подключения тарифа обратитесь к администратору.");
  };

  const handleCancel = async () => {
    try {
      await cancelSub.mutateAsync();
      toast.success("Подписка отменена. Доступ сохранится до конца оплаченного периода.");
      setShowCancel(false);
    } catch (err: any) {
      toast.error(err.message || "Ошибка отмены");
    }
  };

  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
  const daysLeft = periodEnd ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4 sm:mb-6 gap-2" data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
          Назад
        </Button>

        <div className="text-center mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-pricing-title">Тарифы и подписка</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Выберите тариф и подключайте модули по необходимости
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {subscription && currentPlan && (
              <Card className="mb-8 border-primary/30" data-testid="card-current-plan">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-lg" data-testid="text-current-plan-name">
                          Тариф: {currentPlan.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          subscription.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`} data-testid="badge-subscription-status">
                          {subscription.status === "active" ? "Активна" : subscription.status === "cancelled" ? "Отменена" : subscription.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid="text-period-info">
                        {periodEnd && `До ${periodEnd.toLocaleDateString("ru-RU")} (${daysLeft} дн.)`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-foreground" data-testid="text-usage">
                        {subscription.replies_used_this_period}
                        {currentPlan.replyLimit > 0 ? ` / ${currentPlan.replyLimit}` : " / ∞"}
                      </div>
                      <p className="text-xs text-muted-foreground">ответов использовано</p>
                      {currentPlan.replyLimit > 0 && (
                        <div className="w-48 h-2 bg-muted rounded-full mt-2 ml-auto">
                          <div
                            className="h-2 bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(100, (subscription.replies_used_this_period / currentPlan.replyLimit) * 100)}%` }}
                            data-testid="bar-usage"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {subscription.status === "active" && (
                    <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="flex items-center gap-4 flex-1 flex-wrap">
                        {subscription.photo_analysis_enabled && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Camera className="w-4 h-4 text-primary" /> Анализ фото
                          </span>
                        )}
                        {subscription.ai_analyst_enabled && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <BarChart3 className="w-4 h-4 text-primary" /> AI Аналитик
                          </span>
                        )}
                      </div>
                      {!showCancel ? (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setShowCancel(true)} data-testid="button-show-cancel">
                          Отменить подписку
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Уверены?</span>
                          <Button variant="destructive" size="sm" onClick={handleCancel} disabled={cancelSub.isPending} data-testid="button-confirm-cancel">
                            {cancelSub.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Да, отменить"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setShowCancel(false)} data-testid="button-cancel-cancel">
                            Нет
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {subscription.status === "cancelled" && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                        <AlertTriangle className="w-4 h-4" />
                        Подписка отменена. Доступ сохранится до {periodEnd?.toLocaleDateString("ru-RU")}.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5 mb-8">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isCurrent = activePlanId === plan.id && !selectedPlan;
                const isSelected = selectedPlan === plan.id;
                return (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col cursor-pointer transition-all hover:shadow-lg ${
                      isSelected ? "border-primary ring-2 ring-primary/30" :
                      isCurrent ? "border-primary/50 bg-primary/5" :
                      plan.popular ? "border-primary/30" : ""
                    }`}
                    onClick={() => {
                      if (isCurrent) { setSelectedPlan(null); return; }
                      setSelectedPlan(plan.id);
                      setPhotoModule(false);
                      setAiAnalystModule(false);
                    }}
                    data-testid={`card-plan-${plan.id}`}
                  >
                    {plan.popular && !isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                        Популярный
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Текущий
                      </div>
                    )}
                    <CardHeader className="text-center pt-7 pb-3">
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      <CardDescription className="text-xs">{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col items-center gap-2 pb-5">
                      <div className="text-3xl font-bold text-foreground">{plan.price.toLocaleString("ru-RU")} ₽</div>
                      <p className="text-xs text-muted-foreground">/ месяц</p>
                      <div className="text-sm font-medium text-foreground mt-1">
                        {plan.replyLimit === -1 ? "Безлимит ответов" : `${plan.replyLimit.toLocaleString("ru-RU")} ответов`}
                      </div>
                      {plan.replyLimit > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {(plan.price / plan.replyLimit).toFixed(1)} ₽ / ответ
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4" data-testid="text-modules-title">Модули</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SUBSCRIPTION_MODULES.map((mod) => {
                  const isEnabled = mod.id === "photo_analysis"
                    ? (subscription && !selectedPlan ? subscription.photo_analysis_enabled : photoModule)
                    : (subscription && !selectedPlan ? subscription.ai_analyst_enabled : aiAnalystModule);

                  const canToggle = subscription && !selectedPlan && subscription.status === "active";

                  return (
                    <Card key={mod.id} className={`transition-all ${isEnabled ? "border-primary/30 bg-primary/5" : ""}`} data-testid={`card-module-${mod.id}`}>
                      <CardContent className="p-5 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          {mod.id === "photo_analysis" ? <Camera className="w-5 h-5 text-primary" /> : <BarChart3 className="w-5 h-5 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-sm">{mod.name}</h3>
                            <span className="text-sm font-bold text-foreground whitespace-nowrap">+{mod.price} ₽/мес</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{mod.description}</p>
                          <div className="mt-3">
                            {canToggle ? (
                              <Badge variant={isEnabled ? "default" : "secondary"} data-testid={`badge-module-${mod.id}`}>
                                {isEnabled ? "Активен" : "Выкл"}
                              </Badge>
                            ) : selectedPlan ? (
                              <Switch
                                checked={!!isEnabled}
                                onCheckedChange={(checked) => {
                                  if (mod.id === "photo_analysis") setPhotoModule(checked);
                                  else setAiAnalystModule(checked);
                                }}
                                data-testid={`switch-module-${mod.id}`}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">Выберите тариф для подключения</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {subscription && subscription.status === "active" && !selectedPlan && (
                <p className="text-xs text-muted-foreground mt-3">
                  Для подключения или отключения модулей обратитесь к администратору.
                </p>
              )}
            </div>

            {(selectedPlan || (!subscription && effectivePlan)) && (
              <Card className="border-primary/30" data-testid="card-checkout">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Итого к оплате</p>
                      <div className="text-3xl font-bold text-foreground" data-testid="text-total-price">
                        {totalPrice.toLocaleString("ru-RU")} ₽<span className="text-base font-normal text-muted-foreground"> / мес</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {SUBSCRIPTION_PLANS.find(p => p.id === effectivePlan) && (
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {SUBSCRIPTION_PLANS.find(p => p.id === effectivePlan)!.name}
                          </span>
                        )}
                        {effectivePhoto && <span className="text-xs bg-muted px-2 py-1 rounded">+ Анализ фото</span>}
                        {effectiveAiAnalyst && <span className="text-xs bg-muted px-2 py-1 rounded">+ AI Аналитик</span>}
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="min-w-[180px]"
                      onClick={handleSubscribe}
                      data-testid="button-subscribe"
                    >
                      {activePlanId ? "Сменить тариф" : "Оплатить"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
