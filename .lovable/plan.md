
# Улучшение UX кнопок управления балансом

## Проблема

Сейчас в колонке «Действия» расположены 4 безликие иконки (+, -, +, -), разделённые тонкой полоской. Из скриншота непонятно, какие кнопки относятся к токенам, а какие — к AI запросам.

## Решение

Заменить ряд иконок на две компактные кнопочные группы с подписями. Каждая группа будет иметь метку («Токены» / «AI») и две кнопки (+/-) рядом:

```
Токены       AI запросы
[+] [-]      [+] [-]
```

### Файл: `src/components/admin/UsersTable.tsx`

Строки 108-127 — заменить текущий `div` с кнопками на:

```tsx
<div className="flex items-center justify-end gap-3">
  {/* Группа: Токены */}
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-[10px] text-muted-foreground leading-none">Токены</span>
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="icon" className="h-7 w-7" title="Пополнить токены"
        onClick={() => openDialog(user.id, userName(user), "admin_topup", "token")}>
        <Plus className="w-3.5 h-3.5 text-success" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" title="Списать токены"
        onClick={() => openDialog(user.id, userName(user), "admin_deduct", "token")}>
        <Minus className="w-3.5 h-3.5 text-destructive" />
      </Button>
    </div>
  </div>

  {/* Группа: AI запросы */}
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-[10px] text-muted-foreground leading-none">AI</span>
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="icon" className="h-7 w-7" title="Пополнить AI запросы"
        onClick={() => openDialog(user.id, userName(user), "admin_topup", "ai")}>
        <Plus className="w-3.5 h-3.5 text-primary" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" title="Списать AI запросы"
        onClick={() => openDialog(user.id, userName(user), "admin_deduct", "ai")}>
        <Minus className="w-3.5 h-3.5 text-destructive" />
      </Button>
    </div>
  </div>
</div>
```

Кнопки визуально сгруппированы с подписями, и сразу понятно, какая пара за что отвечает.
