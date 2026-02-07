

# Улучшение визуального выделения непрочитанных чатов

## Проблема

Сейчас разница между прочитанным и непрочитанным чатом минимальна: `font-medium` vs `font-semibold`. Это слабо заметно визуально.

## Решение

### Файл: `src/components/ChatList.tsx`

Три изменения для усиления контраста:

1. **Имя клиента (строка 51):** заменить `font-semibold` на `font-bold` для непрочитанных
   - Было: `chat.is_read ? "font-medium" : "font-semibold"`
   - Станет: `chat.is_read ? "font-normal" : "font-bold"`

2. **Текст последнего сообщения (строка 73):** добавить `font-semibold` для непрочитанных
   - Было: `chat.is_read ? "text-muted-foreground" : "text-foreground"`
   - Станет: `chat.is_read ? "text-muted-foreground font-normal" : "text-foreground font-semibold"`

3. **Фон строки (строка 40-42):** добавить лёгкую подсветку для непрочитанных
   - Добавить условие: `!chat.is_read && selectedChatId !== chat.chat_id && "bg-primary/5"`

Итого: непрочитанные чаты будут выделяться жирным шрифтом в имени и тексте сообщения, плюс лёгким фоном -- разница станет хорошо заметна.
