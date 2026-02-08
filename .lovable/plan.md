

# Создание админ-панели и назначение роли администратора

## Текущий статус

- Аккаунт `tygrosyss@gmail.com` имеет роль `user` -- нужно добавить роль `admin`
- Страница `/admin` не существует -- нужно создать с нуля
- Инфраструктура ролей (таблица `user_roles`, функция `has_role`, enum `app_role`) уже готова

## Что будет сделано

### Шаг 1: Назначить роль admin вашему аккаунту

SQL-миграция для добавления роли `admin` к аккаунту `tygrosyss@gmail.com`.

### Шаг 2: Защищённый маршрут для админов

Компонент `AdminRoute`, который:
- Проверяет аутентификацию (как ProtectedRoute)
- Проверяет роль `admin` через запрос к `user_roles`
- Если не админ -- редирект на главную `/`
- Показывает загрузку пока идёт проверка

### Шаг 3: Страница админ-панели `/admin`

Основная страница с тремя вкладками:

**Вкладка "Пользователи":**
- Таблица всех пользователей: email, имя, телефон, дата регистрации, баланс токенов, роль
- Кнопка "Пополнить баланс" -- ввод суммы, создание транзакции type='admin_topup'
- Кнопка "Списать токены" -- ввод суммы, создание транзакции type='admin_deduct'

**Вкладка "Транзакции":**
- Таблица всех транзакций по всем пользователям
- Колонки: пользователь, сумма, тип, описание, дата
- Фильтры по типу транзакции (bonus, deduct, purchase, admin_topup)

**Вкладка "Обзор":**
- Общее количество пользователей
- Суммарный баланс всех токенов
- Количество транзакций за сегодня
- Общее количество отзывов в системе

### Шаг 4: Навигация

- Добавить ссылку "Админ" в хедер (только для пользователей с ролью admin)
- Добавить маршрут `/admin` в `App.tsx`

## Технические детали

### Новые файлы:
- `src/pages/Admin.tsx` -- основная страница админки
- `src/components/AdminRoute.tsx` -- защита маршрута по роли
- `src/components/admin/UsersTable.tsx` -- таблица пользователей с управлением балансом
- `src/components/admin/TransactionsTable.tsx` -- история транзакций
- `src/components/admin/AdminOverview.tsx` -- карточки со статистикой
- `src/hooks/useAdmin.ts` -- хуки для загрузки данных админки и действий (пополнение/списание)

### Изменяемые файлы:
- `src/App.tsx` -- добавить роут `/admin` с AdminRoute
- `src/components/Header.tsx` -- добавить ссылку на админку для админов

### RLS-политики:
Доступ к данным всех пользователей уже обеспечен существующими RLS-политиками с `has_role(auth.uid(), 'admin')` на таблицах `profiles`, `token_balances`, `token_transactions`.

Для управления балансами (UPDATE на `token_balances`, INSERT на `token_transactions`) потребуется добавить RLS-политики для админов.

### SQL-миграция:
```sql
-- 1. Назначить роль admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'tygrosyss@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. RLS: админы могут обновлять балансы
CREATE POLICY "Admins can update token balances"
ON public.token_balances FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 3. RLS: админы могут создавать транзакции
CREATE POLICY "Admins can insert token transactions"
ON public.token_transactions FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));
```
