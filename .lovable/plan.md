
# Баланс токенов и кнопка "Пополнить" в шапке

## Что будет сделано

Баланс токенов будет вынесен из выпадающего меню профиля прямо в шапку -- слева от аватарки. Рядом с балансом появится яркая фиолетовая кнопка "Пополнить". Кнопка пока будет фиктивной (показывает toast "Скоро будет доступно"), но визуально готовой к подключению оплаты.

## Визуальная структура шапки

```text
[Логотип ReplAi]                    [Coins 42 токена] [Пополнить] [Аватарка]
```

## Изменения

### Файл: `src/components/Header.tsx`

1. **Добавить блок баланса перед аватаркой** -- между логотипом и DropdownMenu вставить `div` с:
   - Иконка `Coins` (фиолетовая)
   - Число токенов (жирным)
   - Текст "токенов"
   - Кнопка "Пополнить" -- стиль `bg-primary text-white`, компактный размер `sm`

2. **Кнопка "Пополнить"** -- при нажатии показывает `toast.info("Раздел оплаты скоро будет доступен")`

3. **Убрать баланс из DropdownMenu** -- он больше не нужен внутри меню, так как уже виден в шапке

4. Добавить импорт `toast` из `sonner`

### Итоговый JSX (область между логотипом и меню профиля):

```tsx
<div className="flex items-center gap-3">
  {/* Token balance */}
  {tokenBalance !== null && tokenBalance !== undefined && (
    <div className="flex items-center gap-2 mr-1">
      <div className="flex items-center gap-1.5 text-sm">
        <Coins className="w-4 h-4 text-primary" />
        <span className="font-semibold">{tokenBalance}</span>
        <span className="text-muted-foreground">токенов</span>
      </div>
      <Button
        size="sm"
        className="bg-primary hover:bg-primary/90 text-white text-xs h-8 px-3"
        onClick={() => toast.info("Раздел оплаты скоро будет доступен")}
      >
        Пополнить
      </Button>
    </div>
  )}

  {/* Profile Dropdown */}
  <DropdownMenu>
    ...
  </DropdownMenu>
</div>
```

Баланс внутри DropdownMenu (строки 61-71) будет удалён.
