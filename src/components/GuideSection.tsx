import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import {
  Key,
  Settings,
  RefreshCw,
  Sparkles,
  Send,
  Bot,
  BarChart3,
  MessageCircle,
  CircleDollarSign,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface StepProps {
  number: number;
  title: string;
  description: string;
  icon: ReactNode;
  tips?: string[];
}

const Step = ({ number, title, description, icon, tips }: StepProps) => (
  <Card className="p-5" data-testid={`card-guide-step-${number}`}>
    <div className="flex items-start gap-4">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
        <span className="text-lg font-bold">{number}</span>
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        {tips && tips.length > 0 && (
          <div className="space-y-1 pt-1">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                <span className="text-xs text-muted-foreground">{tip}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </Card>
);

interface FaqItemProps {
  question: string;
  answer: string;
}

const FaqItem = ({ question, answer }: FaqItemProps) => (
  <div className="space-y-1">
    <div className="flex items-start gap-2">
      <HelpCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      <span className="text-sm font-medium text-foreground">{question}</span>
    </div>
    <p className="text-sm text-muted-foreground pl-6">{answer}</p>
  </div>
);

export const GuideSection = () => {
  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Добро пожаловать в ReplAi! Здесь всё просто. Следуйте шагам ниже, и через пару минут сервис начнёт работать.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-primary" />
          Начало работы
        </h2>

        <div className="space-y-3">
          <Step
            number={1}
            title="Получите API-ключ Wildberries"
            icon={<Key className="w-4 h-4" />}
            description="Зайдите в личный кабинет продавца на Wildberries. Откройте раздел «Настройки» → «Доступ к API». Создайте новый ключ — поставьте галочку на разделе «Вопросы и отзывы» (и «Чат с покупателями», если хотите управлять чатами). Скопируйте полученный ключ."
            tips={[
              "Ключ выглядит как длинная строка из букв и цифр",
              "Сохраните его — Wildberries покажет его только один раз",
            ]}
          />

          <Step
            number={2}
            title="Вставьте ключ в настройки"
            icon={<Settings className="w-4 h-4" />}
            description="Нажмите на иконку вашего профиля в правом верхнем углу → «Настройки». Раскройте раздел «API-ключ Wildberries» и вставьте скопированный ключ. Нажмите «Сохранить». Сервис проверит ключ и подтвердит подключение."
            tips={[
              "Если ключ верный — вы увидите зелёную галочку",
              "Сервис сразу начнёт загружать ваши отзывы",
            ]}
          />

          <Step
            number={3}
            title="Дождитесь загрузки отзывов"
            icon={<RefreshCw className="w-4 h-4" />}
            description="После подключения ключа сервис автоматически загрузит ваши отзывы с Wildberries. Это займёт от нескольких секунд до минуты, в зависимости от количества отзывов. Вы увидите их на вкладке «Отзывы»."
            tips={[
              "Отзывы обновляются автоматически каждые 5 минут",
              "Можно обновить вручную кнопкой «Синхронизировать»",
            ]}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-primary" />
          Настройка ответов
        </h2>

        <div className="space-y-3">
          <Step
            number={4}
            title="Выберите режим ответов"
            icon={<Sparkles className="w-4 h-4" />}
            description="В настройках откройте раздел «Режим ответов по рейтингу». Для каждой оценки (от 1 до 5 звёзд) вы можете выбрать: «Авто» — ИИ сам напишет и отправит ответ, или «Ручной» — ИИ подготовит черновик, а вы решите, отправлять его или нет."
            tips={[
              "Для положительных отзывов (4-5 звёзд) удобен автоматический режим",
              "Для негативных (1-3 звёзд) лучше использовать ручной — чтобы проверить ответ перед отправкой",
            ]}
          />

          <Step
            number={5}
            title="Добавьте рекомендации товаров (по желанию)"
            icon={<Send className="w-4 h-4" />}
            description="В настройках есть раздел «Рекомендации товаров». Добавьте туда артикулы товаров, которые вы хотите продвигать. ИИ будет ненавязчиво упоминать их в ответах на подходящие отзывы — это помогает увеличить продажи."
            tips={[
              "Укажите артикул WB и название товара",
              "ИИ сам решит, в каких ответах уместно упомянуть рекомендацию",
            ]}
          />

          <Step
            number={6}
            title="Настройте стиль общения (по желанию)"
            icon={<MessageCircle className="w-4 h-4" />}
            description="В разделе «Стиль общения» вы можете написать, как именно ИИ должен отвечать. Например: «Обращайся на ты, будь дружелюбным» или «Используй формальный стиль». Также укажите название вашего бренда — ИИ будет использовать его в ответах."
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-primary" />
          Ежедневная работа
        </h2>

        <div className="space-y-3">
          <Step
            number={7}
            title="Просматривайте и отправляйте ответы"
            icon={<Send className="w-4 h-4" />}
            description="На вкладке «Отзывы» вы видите все новые отзывы. Если режим «Ручной» — раскройте черновик ИИ, проверьте его. Можете отредактировать или перегенерировать. Когда всё готово — нажмите «Отправить». Ответ уйдёт на Wildberries."
            tips={[
              "Каждая отправка ответа тратит 1 токен",
              "Автоответы отправляются сами — вам ничего делать не нужно",
            ]}
          />

          <Step
            number={8}
            title="Используйте AI-аналитика"
            icon={<Bot className="w-4 h-4" />}
            description="На вкладке «AI аналитик» вы можете задавать вопросы об отзывах на обычном языке. Например: «Какие товары чаще всего ругают?», «Покажи отзывы с фото за последнюю неделю», «Какие проблемы у товара с артикулом 12345?». ИИ проанализирует ваши отзывы и даст ответ."
          />

          <Step
            number={9}
            title="Следите за статистикой"
            icon={<BarChart3 className="w-4 h-4" />}
            description="На вкладке «Сводка» вы видите общую картину: сколько отзывов пришло, какой средний рейтинг, сколько ответов отправлено. Это помогает понять, как идут дела с отзывами на ваши товары."
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-primary" />
          Токены и оплата
        </h2>

        <Card className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <CircleDollarSign className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-foreground">Как работают токены</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Каждый отправленный ответ на отзыв стоит <span className="font-medium text-foreground">1 токен</span>. При регистрации вы получаете <span className="font-medium text-foreground">10 бесплатных токенов</span>, чтобы попробовать сервис.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Когда токены закончатся, вы можете купить ещё — нажмите на баланс токенов в правом верхнем углу. Токены <span className="font-medium text-foreground">не сгорают</span> — используйте их в любое время.
              </p>
              <div className="space-y-1 pt-1">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                  <span className="text-xs text-muted-foreground">Генерация черновика — бесплатно</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                  <span className="text-xs text-muted-foreground">Отправка ответа на WB — 1 токен</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                  <span className="text-xs text-muted-foreground">AI-аналитик — бесплатно (отдельный лимит запросов)</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-primary" />
          Частые вопросы
        </h2>

        <Card className="p-5 space-y-4">
          <FaqItem
            question="Безопасно ли давать API-ключ?"
            answer="Да. API-ключ позволяет только работать с отзывами и чатами — он не даёт доступа к вашим деньгам, заказам или другим данным на Wildberries. Ключ хранится в зашифрованном виде."
          />
          <FaqItem
            question="Что если ИИ напишет плохой ответ?"
            answer="Используйте ручной режим для важных отзывов — вы всегда можете отредактировать или перегенерировать ответ перед отправкой. В автоматическом режиме ИИ обучен писать корректные и вежливые ответы."
          />
          <FaqItem
            question="Можно ли подключить несколько магазинов?"
            answer="Да! Нажмите на название магазина в верхнем левом углу и выберите «Создать кабинет». У каждого магазина будет свой API-ключ и настройки."
          />
          <FaqItem
            question="Как часто обновляются отзывы?"
            answer="Автоматически каждые 5 минут. Также вы можете нажать кнопку «Синхронизировать» для мгновенного обновления."
          />
          <FaqItem
            question="Токены могут сгореть?"
            answer="Нет, купленные токены не имеют срока действия. Используйте их когда угодно."
          />
        </Card>
      </div>
    </div>
  );
};
