import { ArrowLeft, Coins, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";

const PACKAGES = [
  { tokens: 50, price: 290, icon: Coins, label: "Старт", description: "Для небольших магазинов", popular: false },
  { tokens: 200, price: 990, icon: Zap, label: "Бизнес", description: "Оптимальный выбор", popular: true },
  { tokens: 500, price: 1990, icon: Crown, label: "Про", description: "Для активных продавцов", popular: false },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [loadingPackage, setLoadingPackage] = useState<number | null>(null);

  const handlePurchase = async (tokens: number, price: number) => {
    setLoadingPackage(tokens);
    try {
      const data = await apiRequest("/api/functions/create-payment", {
        method: "POST",
        body: JSON.stringify({ amount: price, tokens }),
      });

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error("Не удалось создать платёж. Попробуйте позже.");
    } finally {
      setLoadingPackage(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4 sm:mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Назад
        </Button>

        <div className="text-center mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Пополнение токенов</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Токены расходуются на отправку ответов на отзывы — 1 ответ = 1 токен
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {PACKAGES.map((pkg) => {
            const Icon = pkg.icon;
            const pricePerToken = (pkg.price / pkg.tokens).toFixed(1);
            return (
              <Card
                key={pkg.tokens}
                className={`relative flex flex-col transition-shadow hover:shadow-lg ${
                  pkg.popular ? "border-primary ring-2 ring-primary/20" : ""
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Популярный
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{pkg.label}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center gap-4">
                  <div className="text-center">
                    <span className="text-4xl font-bold text-foreground">{pkg.tokens}</span>
                    <span className="text-muted-foreground ml-1">токенов</span>
                  </div>
                  <div className="text-2xl font-semibold text-foreground">{pkg.price} ₽</div>
                  <p className="text-sm text-muted-foreground">{pricePerToken} ₽ / токен</p>
                  <Button
                    className="w-full mt-auto"
                    size="lg"
                    onClick={() => handlePurchase(pkg.tokens, pkg.price)}
                    disabled={loadingPackage !== null}
                  >
                    {loadingPackage === pkg.tokens ? "Подождите…" : "Оплатить"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
