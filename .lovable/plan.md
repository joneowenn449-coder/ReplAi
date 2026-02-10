
# Исправление дублирования сообщений в чатах

## Проблема

При отправке сообщения оно дублируется: одно сообщение от продавца (фиолетовое), второе — то же самое, но как от клиента (серое). Причина в двух местах:

1. **Разные event_id**: `send-chat-message` сохраняет сообщение с `event_id = seller_123_abc`, а `sync-chats` позже получает то же сообщение из WB API с другим `event_id` от WB. Upsert по `event_id` не распознаёт дубликат.

2. **Неверное определение отправителя**: в `sync-chats` sender определяется через `event.isManager`, но WB API для seller-сообщений может использовать другое поле или структуру.

## Решение

### 1. sync-chats: пропускать сообщения, уже сохранённые через send-chat-message

Перед upsert проверять, нет ли в таблице `chat_messages` для этого `chat_id` сообщения с `sender = 'seller'` и тем же текстом, отправленного примерно в то же время (разница менее 60 секунд). Если есть — обновить `event_id` на WB-шный вместо вставки дубликата.

**Файл**: `supabase/functions/sync-chats/index.ts`

В цикле обработки событий (около строки 159), перед upsert:
- Если `sender === "seller"`, выполнить SELECT по `chat_id`, `sender = 'seller'`, `text = messageText`, и `sent_at` в пределах 60 секунд.
- Если найден — обновить его `event_id` на WB-шный и пропустить insert.

### 2. sync-chats: улучшить определение sender

**Файл**: `supabase/functions/sync-chats/index.ts`, строка 154

Текущее:
```
const sender = event.isManager || event.is_manager ? "seller" : "client";
```

Улучшить логику: WB API также может передавать тип события или другие признаки seller-сообщений. Добавить проверку `event.message?.senderType` или аналогичных полей, а также считать seller-ом сообщения где `event.senderType === "seller"` или `event.direction === "out"`.

### 3. Защита на уровне запроса (дополнительно)

В `useChatMessages` добавить клиентскую дедупликацию: фильтровать сообщения с одинаковым текстом и временем (разница менее 60 секунд) от одного sender, оставляя только одно.

**Файл**: `src/hooks/useChats.ts`, в `queryFn` функции `useChatMessages` — после получения данных, перед return, прогнать дедупликацию.

## Технические детали

### Файл: `supabase/functions/sync-chats/index.ts`

Изменение 1 — перед upsert (строка ~160):
```typescript
// Если это seller-сообщение, проверяем нет ли уже такого (от send-chat-message)
if (sender === "seller" && messageText) {
  const { data: existing } = await supabase
    .from("chat_messages")
    .select("id, event_id")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .eq("sender", "seller")
    .eq("text", messageText)
    .gte("sent_at", new Date(new Date(sentAt).getTime() - 120000).toISOString())
    .lte("sent_at", new Date(new Date(sentAt).getTime() + 120000).toISOString())
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Обновить event_id на реальный WB-шный, чтобы в будущем upsert работал корректно
    if (existing.event_id.startsWith("seller_")) {
      await supabase
        .from("chat_messages")
        .update({ event_id: String(eventId) })
        .eq("id", existing.id);
    }
    continue; // Пропустить — сообщение уже есть
  }
}
```

Изменение 2 — улучшение определения sender (строка 154): расширить проверку дополнительными полями WB API.

### Файл: `src/hooks/useChats.ts`

Клиентская дедупликация в `useChatMessages` как страховка:
```typescript
// Дедупликация: если два сообщения с одинаковым текстом от одного sender
// в пределах 2 минут — оставить только первое
const deduplicated = data.filter((msg, index, arr) => {
  if (index === 0) return true;
  return !arr.slice(0, index).some(
    (prev) =>
      prev.sender === msg.sender &&
      prev.text === msg.text &&
      Math.abs(new Date(prev.sent_at).getTime() - new Date(msg.sent_at).getTime()) < 120000
  );
});
```
