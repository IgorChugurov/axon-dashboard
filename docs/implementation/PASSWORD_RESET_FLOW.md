# Password Reset Flow (Сброс пароля)

## Как это работает

### 1. Пользователь запрашивает сброс пароля

**Где:** Страница `/auth/reset-password` (без токена) или `/login` (ссылка "Forgot password?")

**Что происходит:**

- Пользователь вводит email
- Вызывается `resetPassword(email)` из SDK
- SDK отправляет запрос в Supabase: `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/auth/reset-password' })`
- Supabase отправляет письмо с ссылкой на сброс пароля

### 2. Пользователь переходит по ссылке из письма

**Ссылка из письма:**

```
https://your-project.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=http://localhost:3000/auth/reset-password
```

**Что происходит:**

1. Supabase обрабатывает токен на своем домене (`/auth/v1/verify`)
2. Supabase редиректит на наш `redirect_to` с токеном в hash:
   ```
   http://localhost:3000/auth/reset-password#access_token=...&type=recovery
   ```

### 3. Страница `/auth/reset-password` обрабатывает токен

**Что происходит:**

1. Страница проверяет наличие токена в hash URL
2. Создается Supabase клиент, который автоматически обрабатывает токен из hash
3. Проверяется, установлена ли сессия (токен валидный)
4. Если сессия установлена → показывается форма `UpdatePasswordForm`
5. Если сессии нет → показывается форма `ResetPasswordForm` (для запроса нового письма)

### 4. Пользователь вводит новый пароль

**Форма `UpdatePasswordForm`:**

- Поле "New Password"
- Поле "Confirm Password"
- Кнопка "Update password"

**Что происходит при отправке:**

1. Валидация пароля (минимум 6 символов, пароли совпадают)
2. Вызывается `updatePassword(newPassword)` из SDK
3. SDK отправляет запрос в Supabase: `supabase.auth.updateUser({ password: newPassword })`
4. Supabase обновляет пароль пользователя
5. Показывается сообщение об успехе
6. Через 2 секунды редирект на `/login`

## Важно

- **Токен передается через hash** (`#access_token=...`), а не через query параметры
- **Сессия должна быть установлена** перед показом формы для ввода нового пароля
- **После обновления пароля** пользователь должен войти заново с новым паролем

## Проблемы и решения

### Проблема: Форма мигает и редиректит на логин

**Причина:** Middleware или AuthProvider проверяет сессию до того, как токен обработан

**Решение:**

- Страница `/auth/reset-password` в списке `publicRoutes` в middleware
- AuthProvider не редиректит на логин, если пользователь на странице reset-password
- Используется `onAuthStateChange` для отслеживания установки сессии

### Проблема: Токен не обрабатывается

**Причина:** Supabase клиент не обрабатывает токен из hash автоматически

**Решение:**

- Создается новый Supabase клиент на странице
- Используется `onAuthStateChange` для отслеживания события `PASSWORD_RECOVERY`
- Проверяется сессия через `getSession()`
