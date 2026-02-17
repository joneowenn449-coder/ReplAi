import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4" data-testid="cookie-banner">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" data-testid="text-cookie-message">
              Мы используем cookie для улучшения работы сервиса. Продолжая, вы соглашаетесь с{" "}
              <a href="/privacy" className="text-primary underline underline-offset-4" data-testid="link-cookie-privacy">
                политикой конфиденциальности
              </a>
              .
            </p>
            <Button
              size="sm"
              onClick={handleAccept}
              className="shrink-0"
              data-testid="button-cookie-accept"
            >
              Принять
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CookieBanner;
