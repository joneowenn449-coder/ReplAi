

# Интеграция Робокассы для приёма платежей

## Что будет сделано

Полный платёжный цикл: пользователь выбирает пакет токенов или AI-запросов, оплачивает через Робокассу, баланс пополняется автоматически.

## Архитектура

```text
Пользователь
    |
    | 1. Выбирает пакет (токены или AI-запросы)
    v
[create-payment]  Edge Function
    |
    | 2. Создаёт запись в БД, генерирует подписанную ссылку
    v
Робокасса  -->  payment URL (редирект)
    |
    | 3. Пользователь оплачивает на стороне Робокассы
    v
Робокасса  -->  ResultURL callback (payment.succeeded)
    |
    | 4. POST /robokassa-webhook
    v
[robokassa-webhook]  Edge Function
    |
    | 5. Проверка подписи, зачисление баланса
    v
База данных (token_balances / ai_request_balances)
```

## Отличия от ЮKassa

Робокасса работает иначе: вместо REST API с Basic Auth используется **формирование подписанной ссылки** на оплату. Подпись формируется через хеш (MD5 или SHA256) из параметров + пароля. Результат оплаты приходит на ResultURL (webhook) тоже с подписью, которую нужно проверить.

## Шаг 1. Секреты

Потребуется добавить три секрета:
- **ROBOKASSA_MERCHANT_LOGIN** -- логин магазина из ЛК Робокассы
- **ROBOKASSA_PASSWORD1** -- пароль 1 (для формирования ссылки на оплату)
- **ROBOKASSA_PASSWORD2** -- пароль 2 (для проверки подписи в ResultURL)

## Шаг 2. Таблица payments

Новая таблица для отслеживания платежей:

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | PK |
| user_id | uuid | Кто платит |
| inv_id | serial | Уникальный номер счёта для Робокассы |
| amount_rub | numeric | Сумма в рублях |
| package_type | text | "tokens" или "ai_requests" |
| package_quantity | integer | Количество токенов/запросов |
| status | text | pending / succeeded / canceled |
| created_at | timestamptz | Время создания |
| updated_at | timestamptz | Время обновления |

RLS: пользователь видит только свои платежи, service role управляет всеми.

## Шаг 3. Edge Function: create-payment

- Принимает от фронтенда: `package_type`, `package_quantity`, `amount_rub`
- Авторизует пользователя через JWT
- Создаёт запись в таблице `payments` со статусом `pending`
- Формирует подпись: `MD5(MerchantLogin:OutSum:InvId:Password1)`
- Возвращает URL для редиректа:
  `https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=...&OutSum=...&InvId=...&SignatureValue=...&Description=...`
- В тестовом режиме: `&IsTest=1`

## Шаг 4. Edge Function: robokassa-webhook

- Принимает POST от Робокассы на ResultURL (без JWT -- verify_jwt = false)
- Получает параметры: `OutSum`, `InvId`, `SignatureValue`
- Проверяет подпись: `MD5(OutSum:InvId:Password2)` должен совпасть с `SignatureValue`
- Находит платёж в таблице по `inv_id`
- Обновляет статус на `succeeded`
- Зачисляет баланс в `token_balances` или `ai_request_balances`
- Записывает транзакцию в `token_transactions` или `ai_request_transactions`
- Возвращает `OK{InvId}` -- обязательный формат ответа для Робокассы

## Шаг 5. UI -- модальное окно "Пополнить"

Заменяем toast-заглушку кнопки "Пополнить" в Header на модальное окно:

**Токены (для ответов на отзывы):**
- Пакеты с разным количеством (50, 100, 500) -- цены настроите позже

**AI-запросы (для аналитика):**
- Пакеты запросов (10, 50, 100) -- цены настроите позже

После выбора пакета -- вызов `create-payment`, редирект на Робокассу.

## Шаг 6. Страница возврата

После оплаты Робокасса перенаправляет на SuccessURL. Страница показывает статус платежа и обновлённый баланс.

## Технические детали

### Новые файлы:
- `supabase/functions/create-payment/index.ts` -- создание платежа и генерация ссылки
- `supabase/functions/robokassa-webhook/index.ts` -- обработка ResultURL
- `src/components/TopUpDialog.tsx` -- модальное окно выбора пакета
- `src/pages/PaymentReturn.tsx` -- страница возврата после оплаты
- `src/hooks/usePayments.ts` -- хук для работы с платежами

### Изменяемые файлы:
- `src/components/Header.tsx` -- подключить TopUpDialog вместо toast-заглушки
- `src/App.tsx` -- добавить маршрут `/payment/return`
- `supabase/config.toml` -- добавить конфигурацию новых функций (verify_jwt = false)

### Миграция БД:
- Создание таблицы `payments` с RLS-политиками
- Создание sequence для `inv_id` (Робокасса требует числовой ID)

### Формат подписи Робокассы:
```text
-- Для создания платежа (Password1):
SignatureValue = MD5("MerchantLogin:OutSum:InvId:Password1")

-- Для проверки webhook (Password2):
SignatureValue = MD5("OutSum:InvId:Password2")

-- Ответ webhook:
OK{InvId}
```

### Настройка в ЛК Робокассы:
После деплоя нужно будет указать в настройках магазина Робокассы:
- **Result URL**: `https://yzlrebnfslyvqscjmmwh.supabase.co/functions/v1/robokassa-webhook`
- **Success URL**: `https://<ваш-домен>/payment/return?status=success`
- **Fail URL**: `https://<ваш-домен>/payment/return?status=fail`
- **Метод отправки**: POST

