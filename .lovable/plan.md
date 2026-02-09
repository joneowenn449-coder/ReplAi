
# Пакеты запросов для AI Аналитика

## Что будет сделано

Для AI аналитика создается **отдельная система учёта** — пакеты запросов (например, 50 за 300 рублей). У пользователя будет два независимых баланса:
- **Токены** (в шапке) — для отправки ответов на отзывы
- **Запросы AI** — для использования AI аналитика

## Изменения

### 1. Новая таблица `ai_request_balances`

Хранит текущий баланс запросов AI аналитика для каждого пользователя.

| Колонка | Тип | Описание |
|---------|-----|----------|
| id | uuid | PK |
| user_id | uuid | Пользователь |
| balance | integer | Остаток запросов (по умолчанию 0) |
| updated_at | timestamptz | Время последнего изменения |

RLS-политики: пользователь видит только свой баланс, админ видит все, сервис-роль управляет всем. Запись создается автоматически при регистрации (через обновление триггера `handle_new_user`).

### 2. Новая таблица `ai_request_transactions`

Лог всех операций с балансом AI-запросов (покупка пакета, списание за вопрос).

| Колонка | Тип | Описание |
|---------|-----|----------|
| id | uuid | PK |
| user_id | uuid | Пользователь |
| amount | integer | +50 (покупка) или -1 (использование) |
| type | text | "purchase" или "usage" |
| description | text | Описание операции |
| created_at | timestamptz | Когда произошло |

RLS: аналогично `token_transactions`.

### 3. Edge Function `ai-assistant` — добавить проверку и списание

Перед отправкой запроса к AI:
1. Получить `user_id` из JWT-токена авторизации
2. Проверить `ai_request_balances` — если баланс меньше 1, вернуть 402
3. После успешного стриминга ответа — списать 1 запрос и записать транзакцию

Важный нюанс: списание происходит **до** стриминга (т.к. стриминг идёт напрямую клиенту и после него нет возможности выполнить код). Проверяем баланс, списываем 1 запрос, потом стримим ответ.

### 4. Фронтенд: хук `useAiRequestBalance`

Новый хук аналогичный `useTokenBalance`, но читает из таблицы `ai_request_balances`.

### 5. Фронтенд: обновить `useAiAssistant`

- При ошибке 402 показывать: "У вас закончились запросы AI аналитика. Приобретите пакет запросов."
- После успешного сообщения инвалидировать кэш `ai-request-balance`

### 6. Фронтенд: показать баланс AI-запросов в компоненте `AiAssistant`

В шапке чата AI аналитика (рядом с "Знает все отзывы, товары и артикулы") показать: "Осталось X запросов". Если баланс 0, показать предупреждение и заблокировать отправку.

### 7. Обновить `handle_new_user` — стартовые AI-запросы

Добавить при регистрации 5 бесплатных запросов AI аналитика для пробного использования.

---

## Технические детали

### Миграция SQL

```sql
-- Таблица баланса AI-запросов
CREATE TABLE public.ai_request_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_request_balances ENABLE ROW LEVEL SECURITY;

-- Политики RLS
CREATE POLICY "Users can view own ai balance" ON public.ai_request_balances
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all ai balances" ON public.ai_request_balances
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update ai balances" ON public.ai_request_balances
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages ai balances" ON public.ai_request_balances
  AS RESTRICTIVE FOR ALL USING (true) WITH CHECK (true);

-- Таблица транзакций AI-запросов
CREATE TABLE public.ai_request_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL DEFAULT 'usage',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_request_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai transactions" ON public.ai_request_transactions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all ai transactions" ON public.ai_request_transactions
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role manages ai transactions" ON public.ai_request_transactions
  AS RESTRICTIVE FOR ALL USING (true) WITH CHECK (true);
```

### Обновление триггера `handle_new_user`

Добавить в тело функции:
```sql
INSERT INTO public.ai_request_balances (user_id, balance)
VALUES (NEW.id, 5);

INSERT INTO public.ai_request_transactions (user_id, amount, type, description)
VALUES (NEW.id, 5, 'bonus', 'Пробные запросы AI аналитика');
```

### Edge Function — проверка и списание (перед стримингом)

```typescript
// Get user from auth header
const authHeader = req.headers.get("Authorization");
const token = authHeader?.replace("Bearer ", "");
const { data: { user } } = await supabase.auth.getUser(token);
if (!user) return new Response(..., { status: 401 });

// Check AI request balance
const { data: aiBalance } = await supabase
  .from("ai_request_balances")
  .select("balance")
  .eq("user_id", user.id)
  .maybeSingle();

if (!aiBalance || aiBalance.balance < 1) {
  return new Response(
    JSON.stringify({ error: "У вас закончились запросы AI аналитика." }),
    { status: 402, headers: corsHeaders }
  );
}

// Deduct BEFORE streaming
await supabase
  .from("ai_request_balances")
  .update({ balance: aiBalance.balance - 1 })
  .eq("user_id", user.id);

await supabase.from("ai_request_transactions").insert({
  user_id: user.id, amount: -1, type: "usage",
  description: "Запрос к AI аналитику"
});

// Then proceed with streaming...
```

### Компонент AiAssistant — отображение баланса

В шапке чата добавить счётчик:
```tsx
<span className="text-xs text-muted-foreground">
  Осталось {aiBalance} запросов
</span>
```

При нулевом балансе — заблокировать поле ввода и кнопку, показать сообщение о необходимости покупки пакета.
