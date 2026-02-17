import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to="/auth" data-testid="link-back-home">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </Link>

        <Card>
          <CardContent className="p-6 md:p-8 space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-privacy-title">
              Политика конфиденциальности сервиса ReplAi
            </h1>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Общие положения</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Настоящая политика составлена в соответствии с ФЗ-152 «О персональных данных».
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Сбор данных</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Мы обрабатываем Email пользователя, IP-адрес, данные файлов cookie и технические логи.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Цели</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Данные используются для обеспечения работы сервиса, защиты от спама и улучшения интерфейса.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Защита</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Мы не передаем данные третьим лицам, кроме случаев, предусмотренных законом РФ.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Права</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Пользователь может отозвать согласие, удалив аккаунт или написав в поддержку.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Контакты</h2>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
                <p>ИП Киянова Ксения Юрьевна</p>
                <p>ИНН: 263215052470</p>
                <p>E-mail: LuneraBag@yandex.ru</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
