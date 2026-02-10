
# Исправления в админ-панели: иконка и пополнение AI-запросов

## Проблема 1: Иконка
Для кнопки "Пополнить AI запросы" используется иконка `BrainCircuit` (фиолетовый мозг) вместо `Plus`. Нужно заменить на `Plus` с другим цветом, чтобы визуально отличать от токенов.

## Проблема 2: Ошибка при пополнении AI-запросов
Таблица `ai_request_balances` пуста. При попытке пополнить баланс вызывается `.single()`, который падает с ошибкой, если записи нет. Нужно использовать `.maybeSingle()` и создавать запись при её отсутствии (upsert).

## Изменения

### Файл: `src/components/admin/UsersTable.tsx`
- Строка 119-121: заменить `BrainCircuit` на `Plus` для кнопки пополнения AI-запросов (оставить цвет `text-primary` для отличия от токенов).

### Файл: `src/hooks/useAdmin.ts`
- Функция `useUpdateAiBalance` (строка 217-222): заменить `.single()` на `.maybeSingle()` и добавить upsert-логику -- если запись не найдена, создать новую с начальным балансом равным `amount`.
- Аналогично проверить `useUpdateBalance` (строка 162-167) на тот же случай и добавить upsert.

### Техническая деталь upsert:
```typescript
const { data: current } = await supabase
  .from("ai_request_balances")
  .select("balance")
  .eq("user_id", userId)
  .maybeSingle();

if (!current) {
  // Создать запись
  const newBalance = type === "admin_topup" ? amount : 0;
  await supabase.from("ai_request_balances").insert({ user_id: userId, balance: newBalance });
  delta = type === "admin_topup" ? amount : -amount; // но deduct при 0 = ошибка
} else {
  const delta = type === "admin_topup" ? amount : -amount;
  const newBalance = current.balance + delta;
  if (newBalance < 0) throw new Error("Баланс не может быть отрицательным");
  await supabase.from("ai_request_balances").update({ balance: newBalance }).eq("user_id", userId);
}
```
