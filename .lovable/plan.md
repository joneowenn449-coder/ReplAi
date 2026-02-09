
# Списание токенов при отправке ответа на отзыв

## Что будет сделано

При отправке ответа на отзыв (кнопка "Отправить") система будет проверять баланс токенов пользователя. Если токенов нет -- покажет понятное сообщение. Если есть -- отправит ответ и спишет 1 токен.

## Изменения

### 1. Edge Function `send-reply` (бэкенд)

Добавить три шага перед отправкой ответа на Wildberries:

1. **Проверка баланса** -- запрос в таблицу `token_balances` по `user_id`
2. **Отказ при нулевом балансе** -- возврат HTTP 402 с сообщением "Недостаточно токенов"
3. **После успешной отправки** -- уменьшение баланса на 1 и запись в `token_transactions` с типом `usage` и ссылкой на `review_id`

Порядок действий в функции:
```
Авторизация -> Проверка баланса -> Получение отзыва -> Отправка на WB -> Списание токена -> Ответ
```

Токен списывается только после успешной отправки на WB, чтобы пользователь не терял токены при ошибках API.

### 2. Фронтенд: `src/hooks/useReviews.ts`

Обновить хук `useSendReply`:
- В `onError` проверять, содержит ли ошибка текст о нехватке токенов (или код 402)
- Показывать специальное сообщение: "Недостаточно токенов для отправки ответа. Пополните баланс."
- После успешной отправки инвалидировать кэш `token_balance`, чтобы счётчик в шапке обновился

---

## Технические детали

### Edge Function -- новый блок кода (вставляется после авторизации, перед получением отзыва):

```typescript
// Check token balance
const { data: balance } = await supabase
  .from("token_balances")
  .select("balance")
  .eq("user_id", userId)
  .maybeSingle();

if (!balance || balance.balance < 1) {
  return new Response(
    JSON.stringify({ error: "Недостаточно токенов. Пополните баланс." }),
    { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

### Edge Function -- списание (вставляется после успешного обновления статуса отзыва):

```typescript
// Deduct 1 token
await supabase
  .from("token_balances")
  .update({ balance: balance.balance - 1 })
  .eq("user_id", userId);

// Log transaction
await supabase
  .from("token_transactions")
  .insert({
    user_id: userId,
    amount: -1,
    type: "usage",
    description: "Отправка ответа на отзыв",
    review_id: review_id,
  });
```

### Фронтенд -- обновление `useSendReply`:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["reviews"] });
  queryClient.invalidateQueries({ queryKey: ["token_balance"] });
  toast.success("Ответ отправлен на WB");
},
onError: (error) => {
  const msg = error.message || "";
  if (msg.includes("токенов") || msg.includes("402")) {
    toast.error("Недостаточно токенов для отправки. Пополните баланс.");
  } else {
    toast.error(`Ошибка отправки: ${msg}`);
  }
},
```
