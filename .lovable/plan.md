

# Исправление видимости кнопки трёх точек

## Проблема

Кнопка с тремя точками не видна, потому что `span` с классом `flex-1 truncate` занимает всё доступное пространство, а кнопка слишком маленькая и выталкивается за границы контейнера или сжимается до нуля.

## Решение

Добавить `shrink-0` к кнопке трёх точек, чтобы она не сжималась, и ограничить текст чата по ширине с помощью `min-w-0` на span.

## Технические детали

**Файл:** `src/components/AiChatSidebar.tsx`

1. **Строка 109** — добавить `min-w-0` к span текста:
   - Было: `flex-1 text-[13px] truncate leading-tight`
   - Станет: `flex-1 min-w-0 text-[13px] truncate leading-tight`

2. **Строка 117** — добавить `shrink-0` к кнопке меню:
   - Было: `opacity-40 hover:opacity-100 p-0.5 rounded-md hover:bg-secondary transition-opacity`
   - Станет: `shrink-0 opacity-40 hover:opacity-100 p-0.5 rounded-md hover:bg-secondary transition-opacity`

Два минимальных изменения — текст будет обрезаться корректно, а кнопка всегда останется видимой.
