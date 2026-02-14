import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentReturn() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "completed" | "pending">("checking");

  useEffect(() => {
    const checkPayment = async () => {
      // Check the most recent payment for this user
      const { data } = await supabase
        .from("payments")
        .select("status")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.status === "completed") {
        setStatus("completed");
      } else {
        setStatus("pending");
        // Retry after a few seconds in case webhook hasn't arrived yet
        setTimeout(async () => {
          const { data: retryData } = await supabase
            .from("payments")
            .select("status")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (retryData?.status === "completed") {
            setStatus("completed");
          }
        }, 5000);
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
