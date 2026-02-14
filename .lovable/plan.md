
# Исправление: спиннер синхронизации показывается во всех кабинетах

## Проблема

Кнопка "Синхронизировать" показывает анимацию загрузки во всех кабинетах, хотя синхронизация запущена только для одного. Причина -- состояние `syncReviews.isPending` глобальное и не привязано к конкретному кабинету.

## Решение

Отслеживать ID кабинета, для которого запущена синхронизация, и показывать спиннер только если активный кабинет совпадает.

## Что изменится

### 1. `src/pages/Index.tsx`

- Добавить `useState` для хранения `syncingCabinetId`
- В `handleSync` записывать ID текущего активного кабинета
- Сбрасывать `syncingCabinetId` при завершении (успех или ошибка)
- Передавать в `ApiStatus` флаг `isSyncing` только если `syncingCabinetId === activeCabinet?.id`

### 2. `src/hooks/useReviews.ts`

- Добавить в `useSyncReviews` поддержку колбэков `onSuccess`/`onError` через параметры, чтобы `Index.tsx` мог сбрасывать `syncingCabinetId`
- Или альтернативно: обработку вынести полностью в `Index.tsx` через `mutateAsync`

## Технические детали

Изменение в `src/pages/Index.tsx`:

```typescript
const [syncingCabinetId, setSyncingCabinetId] = useState<string | null>(null);

const handleSync = () => {
  if (!activeCabinet?.id) return;
  setSyncingCabinetId(activeCabinet.id);
  syncReviews.mutate(undefined, {
    onSettled: () => setSyncingCabinetId(null),
  });
};

// В JSX:
isSyncing={syncReviews.isPending && syncingCabinetId === activeCabinet?.id}
```

### Затрагиваемые файлы

- `src/pages/Index.tsx` -- добавить отслеживание кабинета при синхронизации
