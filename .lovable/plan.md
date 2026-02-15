
# DRY-рефакторинг: устранение дублирования в хуках и компонентах

## Контекст

Два независимых баланса -- **Токены** (автоответы на отзывы) и **AI-запросы** (AI аналитик, отдельная опция) -- обслуживаются практически идентичным кодом с разницей только в именах таблиц и текстовых метках.

---

## 1. Общая утилита пагинации

**Файл:** `src/lib/fetchAllRows.ts` (новый)

Вынести функцию `fetchAllRows` из `src/hooks/useExportData.ts` в отдельный модуль, чтобы её можно было переиспользовать в любом месте (экспорт, отзывы и т.д.).

Затем обновить `src/hooks/useExportData.ts` -- заменить локальную функцию на импорт из `src/lib/fetchAllRows.ts`.

---

## 2. Компонент FullPageSpinner

**Файл:** `src/components/FullPageSpinner.tsx` (новый)

Общий компонент полноэкранного спиннера загрузки (Loader2 по центру экрана).

**Обновляемые файлы:**
- `src/components/ProtectedRoute.tsx` -- заменить inline-разметку спиннера на `<FullPageSpinner />`
- `src/components/AdminRoute.tsx` -- аналогично

---

## 3. Параметризованный хук баланса пользователя

**Файл:** `src/hooks/useBalance.ts` (новый)

Одна фабричная функция, принимающая тип баланса (`"tokens"` или `"ai"`), которая внутри маппит на нужную таблицу:
- `"tokens"` --> таблица `token_balances`
- `"ai"` --> таблица `ai_request_balances`

**Обновляемые файлы:**
- `src/hooks/useTokenBalance.ts` -- станет однострочным реэкспортом: `useBalance("tokens")`
- `src/hooks/useAiRequestBalance.ts` -- станет однострочным реэкспортом: `useBalance("ai")`

Обратная совместимость сохраняется: все существующие импорты `useTokenBalance` и `useAiRequestBalance` продолжат работать без изменений.

---

## 4. Объединение admin-хуков

**Файл:** `src/hooks/useAdmin.ts` (изменения)

### 4a. useAdminTransactions + useAdminAiTransactions --> один хук

Создать внутреннюю функцию `useTransactions(table, queryKeyPrefix, typeFilter)`, которая содержит всю логику запроса. Публичные хуки станут обёртками:

```
useAdminTransactions(filter) --> useTransactions("token_transactions", "admin-transactions", filter)
useAdminAiTransactions(filter) --> useTransactions("ai_request_transactions", "admin-ai-transactions", filter)
```

### 4b. useUpdateBalance + useUpdateAiBalance --> один хук

Создать внутреннюю функцию `useUpdateBalanceMutation(config)`, где `config` содержит:
- `balanceTable`: `"token_balances"` | `"ai_request_balances"`
- `transactionTable`: `"token_transactions"` | `"ai_request_transactions"`
- `invalidateKeys`: массив query-ключей для инвалидации
- `successMessage`: текст тоста
- `defaultTopupDesc` / `defaultDeductDesc`: дефолтные описания

Публичные хуки станут обёртками с предзаданными конфигами для токенов и AI-запросов соответственно.

Все экспорты сохраняются -- ни один внешний файл не нужно менять.

---

## 5. Объединение словарей меток в TransactionsTable

**Файл:** `src/components/admin/TransactionsTable.tsx` (изменения)

Общие метки (`bonus`, `purchase`, `admin_topup`, `admin_deduct`) вынести в один базовый объект, а специфичные (`deduct` для токенов, `usage` для AI) добавлять через spread:

```
const baseLabels = { bonus: "Бонус", purchase: "Покупка", admin_topup: "Пополнение (админ)", admin_deduct: "Списание (админ)" };
const tokenTypeLabels = { ...baseLabels, deduct: "Списание" };
const aiTypeLabels = { ...baseLabels, usage: "Использование" };
```

Аналогично для `filterOptions` -- общий массив + специфичный элемент.

---

## Итог изменений

| Файл | Действие |
|---|---|
| `src/lib/fetchAllRows.ts` | Создать |
| `src/components/FullPageSpinner.tsx` | Создать |
| `src/hooks/useBalance.ts` | Создать |
| `src/hooks/useTokenBalance.ts` | Упростить до реэкспорта |
| `src/hooks/useAiRequestBalance.ts` | Упростить до реэкспорта |
| `src/hooks/useExportData.ts` | Импортировать fetchAllRows |
| `src/hooks/useAdmin.ts` | Объединить дублирующиеся хуки |
| `src/components/ProtectedRoute.tsx` | Использовать FullPageSpinner |
| `src/components/AdminRoute.tsx` | Использовать FullPageSpinner |
| `src/components/admin/TransactionsTable.tsx` | Объединить словари меток |

Все публичные API (имена хуков, их сигнатуры) сохраняются -- рефакторинг не затрагивает остальные компоненты.
