import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";

export default function PaymentReturn() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "completed" | "pending">("checking");

  useEffect(() => {
    const checkPayment = async () => {
      try {
        const data = await apiRequest("/api/payments/latest");
        if (data?.status === "completed") {
          setStatus("completed");
        } else {
          setStatus("pending");
          setTimeout(async () => {
            try {
              const retryData = await apiRequest("/api/payments/latest");
              if (retryData?.status === "completed") {
                setStatus("completed");
              }
            } catch {}
          }, 5000);
        }
      } catch {
        setStatus("pending");
      }
    };

    checkPayment();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          {status === "checking" && (
            <>
              <Clock className="w-12 h-12 text-muted-foreground mx-auto animate-pulse" />
              <h2 className="text-xl font-semibold text-foreground">Проверяем оплату…</h2>
            </>
          )}

          {status === "completed" && (
            <>
              <CheckCircle className="w-12 h-12 text-[hsl(var(--success))] mx-auto" />
              <h2 className="text-xl font-semibold text-foreground">Оплата прошла успешно!</h2>
              <p className="text-muted-foreground">Токены зачислены на ваш баланс.</p>
            </>
          )}

          {status === "pending" && (
            <>
              <Clock className="w-12 h-12 text-[hsl(var(--warning))] mx-auto" />
              <h2 className="text-xl font-semibold text-foreground">Ожидаем подтверждения</h2>
              <p className="text-muted-foreground">
                Платёж обрабатывается. Токены будут зачислены автоматически.
              </p>
            </>
          )}

          <Button onClick={() => navigate("/")} variant="outline" className="gap-2 mt-4">
            <ArrowLeft className="w-4 h-4" />
            Вернуться на главную
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
