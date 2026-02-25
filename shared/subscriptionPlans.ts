export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  replyLimit: number;
  description: string;
  popular?: boolean;
}

export interface SubscriptionModule {
  id: string;
  name: string;
  price: number;
  description: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { id: "micro", name: "Micro", price: 490, replyLimit: 200, description: "Для небольших магазинов" },
  { id: "start", name: "Старт", price: 990, replyLimit: 500, description: "Для растущего бизнеса" },
  { id: "standard", name: "Standard", price: 1490, replyLimit: 1000, description: "Оптимальный выбор", popular: true },
  { id: "business", name: "Business", price: 3990, replyLimit: 5000, description: "Для крупных продавцов" },
  { id: "enterprise", name: "Enterprise", price: 9900, replyLimit: -1, description: "Безлимитный доступ" },
];

export const SUBSCRIPTION_MODULES: SubscriptionModule[] = [
  { id: "photo_analysis", name: "Анализ фото", price: 199, description: "GPT-4o Vision анализирует фото в отзывах для более точных ответов" },
  { id: "ai_analyst", name: "AI Аналитик", price: 299, description: "Безлимитные запросы к AI-аналитику для анализа продаж и отзывов" },
];

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(p => p.id === planId);
}

export function calculateTotalPrice(planId: string, photoAnalysis: boolean, aiAnalyst: boolean): number {
  const plan = getPlanById(planId);
  if (!plan) return 0;
  let total = plan.price;
  if (photoAnalysis) total += SUBSCRIPTION_MODULES[0].price;
  if (aiAnalyst) total += SUBSCRIPTION_MODULES[1].price;
  return total;
}

export function isUnlimited(plan: SubscriptionPlan): boolean {
  return plan.replyLimit === -1;
}
