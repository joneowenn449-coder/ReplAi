
# Исправление кнопки "Админ-панель" в меню профиля

## Проблема

Radix UI `DropdownMenuItem` при закрытии меню вызывает `event.preventDefault()` на событии клика, что блокирует переход по React Router `Link`. В результате при нажатии "Админ-панель" меню просто закрывается, но навигация не происходит.

## Решение

Заменить подход `asChild` + `Link` на `onClick` + `useNavigate` из React Router. Это надёжный способ, который не конфликтует с поведением Radix UI.

## Что изменится

### Файл: `src/components/Header.tsx`

1. Добавить импорт `useNavigate` из `react-router-dom`
2. Убрать `Link` из импортов (если больше нигде не используется)
3. Заменить пункт "Админ-панель" с `DropdownMenuItem asChild` + `Link` на обычный `DropdownMenuItem` с `onClick={() => navigate('/admin')}`

### Было:
```tsx
<DropdownMenuItem asChild className="cursor-pointer">
  <Link to="/admin" className="flex items-center">
    <Shield className="w-4 h-4 mr-2" />
    Админ-панель
  </Link>
</DropdownMenuItem>
```

### Станет:
```tsx
<DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
  <Shield className="w-4 h-4 mr-2" />
  Админ-панель
</DropdownMenuItem>
```

Минимальное изменение -- всего несколько строк в одном файле.
