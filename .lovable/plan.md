
# Индикатор непрочитанных чатов

## Проблема

В базе данных есть поле `is_read` (у всех чатов сейчас `false`), но в интерфейсе это никак не отображается. Нужно:
1. Визуально выделять непрочитанные чаты в списке
2. Помечать чат как прочитанный при открытии

## Что будет сделано

### 1. Визуальный индикатор в списке чатов (`ChatList.tsx`)

Для непрочитанных чатов (`is_read === false`):
- Добавить фиолетовую точку-индикатор справа от даты
- Сделать имя клиента жирным (font-semibold вместо font-medium)
- Сделать текст последнего сообщения чуть ярче (не muted)

### 2. Функция пометки как прочитанного (`useChats.ts`)

Добавить мутацию `useMarkChatRead`, которая:
- Обновляет `is_read = true` в таблице `chats` по `chat_id`
- Инвалидирует кеш списка чатов для обновления UI

### 3. Вызов при открытии чата (`ChatsSection.tsx`)

При выборе чата в списке (`onSelectChat`):
- Если чат не прочитан -- вызвать `markChatRead`
- Индикатор исчезнет автоматически после обновления кеша

### 4. Сброс `is_read` при новых сообщениях (`sync-chats`)

В edge function `sync-chats` при обнаружении новых сообщений от клиента -- ставить `is_read = false`, чтобы чат снова подсвечивался.

## Затрагиваемые файлы

| Файл | Изменение |
|------|-----------|
| `src/components/ChatList.tsx` | Добавить точку-индикатор и выделение текста для непрочитанных |
| `src/hooks/useChats.ts` | Добавить хук `useMarkChatRead` |
| `src/components/ChatsSection.tsx` | Вызывать `markChatRead` при выборе чата |
| `supabase/functions/sync-chats/index.ts` | Ставить `is_read = false` при новых сообщениях от клиента |

## Технические детали

### ChatList.tsx -- индикатор

```text
+------------------------------------------+
| [A] Александр            7 фев  (*)      |  <-- точка-индикатор
|     Товар XYZ                             |
|     Последнее сообщение...       (bold)   |
+------------------------------------------+
| [С] Светлана             6 фев           |  <-- прочитанный, без точки
|     Товар ABC                             |
|     Последнее сообщение...     (muted)    |
+------------------------------------------+
```

- Точка: `w-2 h-2 rounded-full bg-primary` рядом с датой
- Непрочитанный: `font-semibold` на имени, `text-foreground` на последнем сообщении
- Прочитанный: `font-medium` на имени, `text-muted-foreground` на сообщении (как сейчас)

### useMarkChatRead

```typescript
export function useMarkChatRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (chatId: string) => {
      const { error } = await supabase
        .from("chats")
        .update({ is_read: true })
        .eq("chat_id", chatId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}
```

### sync-chats -- сброс is_read

При upsert чата, если последнее сообщение от клиента новее текущего `last_message_at`, ставить `is_read: false`.
