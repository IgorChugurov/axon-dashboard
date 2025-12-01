import { ResetPasswordWrapper } from "./ResetPasswordWrapper";

/**
 * Server Component для страницы сброса пароля
 * Hash не доступен на сервере, но можем логировать другую информацию
 */
export default async function ResetPasswordPage() {
  return <ResetPasswordWrapper />;
}
