
# Списание токенов при автоответах

## Проблема

Функция `sync-reviews` отправляет автоответы на WB, но не списывает токены и не записывает транзакции. Списание реализовано только в `send-reply` (ручная отправка). В результате автоответы бесплатны, что противоречит модели монетизации (1 ответ = 1 токен).

## Решение

Добавить в `sync-reviews` (функция `processUserReviews`) логику:

1. **Проверка баланса перед автоответом** -- если токенов < 1, пропустить автоответ и оставить отзыв в статусе `pending`.
2. **Списание токена после успешной отправки** -- уменьшить `balance` на 1 в `token_balances`.
3. **Запись транзакции** -- вставить запись в `token_transactions` с `type: 'usage'` и описанием "Автоответ на отзыв".
4. Та же логика для retry pending-отзывов (строки 305-325).

## Технические детали

**Файл**: `supabase/functions/sync-reviews/index.ts`

### Изменение 1: Получить баланс пользователя в начале `processUserReviews`

```typescript
const { data: tokenBalance } = await supabase
  .from("token_balances")
  .select("balance")
  .eq("user_id", userId)
  .maybeSingle();

let currentBalance = tokenBalance?.balance ?? 0;
```

### Изменение 2: Проверка и списание при автоответе (строка ~256)

Перед `sendWBAnswer` добавить проверку баланса. После успешной отправки -- списать токен:

```typescript
if (modeForRating === "auto" && aiDraft) {
  if (currentBalance < 1) {
    console.log(`[sync-reviews] user=${userId} insufficient tokens, skipping auto-reply for ${wbId}`);
    status = "pending";
  } else {
    try {
      await sendWBAnswer(WB_API_KEY, wbId, aiDraft);
      status = "auto";
      autoSentCount++;

      // Deduct token
      currentBalance -= 1;
      await supabase
        .from("token_balances")
        .update({ balance: currentBalance })
        .eq("user_id", userId);

      await supabase.from("token_transactions").insert({
        user_id: userId,
        amount: -1,
        type: "usage",
        description: "Автоответ на отзыв",
        review_id: null, // will be set after insert
      });

      await delay(350);
    } catch (e) { ... }
  }
}
```

### Изменение 3: Та же логика для retry pending (строка ~311)

Добавить аналогичную проверку баланса и списание для блока retry pending-отзывов.

### Изменение 4: Привязка review_id к транзакции

После insert отзыва, если статус `auto`, обновить транзакцию с `review_id`. Альтернативно -- вставлять транзакцию после insert отзыва, когда `id` уже известен.
