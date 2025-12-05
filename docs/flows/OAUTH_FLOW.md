# OAuth авторизация через SDK

## Как работает OAuth через Google/GitHub

### 1. Пользователь нажимает "Continue with Google"

```typescript
// app/login/page.tsx
const handleOAuthLogin = async (provider: "google" | "github") => {
  await loginWithOAuth(provider);
};
```

### 2. SDK вызывает Supabase OAuth

```typescript
// packages/auth-sdk/src/client/auth-client.ts
async loginWithOAuth(provider: OAuthProviderType): Promise<void> {
  const redirectTo = `${window.location.origin}/auth/callback`;

  await this.supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  });
}
```

### 3. Пользователь редиректится на провайдера (Google/GitHub)

- Google/GitHub показывает страницу авторизации
- Пользователь подтверждает доступ
- Провайдер редиректит обратно на `/auth/callback?code=...`

### 4. Callback обрабатывает код

```typescript
// app/auth/callback/route.ts
const code = requestUrl.searchParams.get("code");
const supabase = await createClient();
await supabase.auth.exchangeCodeForSession(code);
```

### 5. Редирект на главную

После успешного обмена кода на сессию, пользователь редиректится на главную страницу.

## Настройка OAuth провайдеров

### Google OAuth

1. **Google Cloud Console:**

   - Создать OAuth 2.0 Client ID
   - Добавить authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`

2. **Supabase Dashboard:**
   - Authentication → Providers → Google
   - Включить "Enable Sign in with Google"
   - Вставить Client ID и Client Secret

### GitHub OAuth

1. **GitHub Settings:**

   - Developer settings → OAuth Apps → New OAuth App
   - Authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`

2. **Supabase Dashboard:**
   - Authentication → Providers → GitHub
   - Включить "Enable Sign in with GitHub"
   - Вставить Client ID и Client Secret

## Важно

- OAuth провайдеры должны быть включены в Supabase Dashboard
- Callback URL должен совпадать с настройками в провайдере
- SDK автоматически обрабатывает весь flow, включая редиректы
