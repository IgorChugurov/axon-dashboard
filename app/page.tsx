/**
 * Home Page - Редирект на последний проект или welcome
 *
 * При заходе на главную страницу:
 * 1. Читаем куку с последним проектом
 * 2. Проверяем существование проекта в БД
 * 3. Если проект существует - редирект на /projects/:projectId
 * 4. Иначе показываем страницу выбора проекта
 *
 * Примечание: Проверка авторизации и роли выполняется в middleware,
 * поэтому здесь мы можем доверять, что пользователь авторизован и имеет права админа
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProjectFromCookies } from "@/lib/projects/cookies";
import { getServerUserFromHeaders } from "@/lib/supabase/auth-headers";

export default async function HomePage() {
  // Получаем пользователя из headers (установленных middleware)
  // Это избегает повторных запросов к Supabase и БД
  const user = await getServerUserFromHeaders();

  if (!user) {
    // Не авторизован - middleware должен был редиректнуть
    // Но на всякий случай делаем редирект
    redirect("/login");
  }

  // Middleware уже проверил роль и сделал редирект для обычных пользователей
  // Здесь мы можем быть уверены, что пользователь - админ
  // Далее логика только для админов
  // Читаем куку с последним проектом
  const cookieStore = await cookies();
  const lastProjectId = getCurrentProjectFromCookies(cookieStore);

  if (lastProjectId) {
    // Проверяем существование проекта в БД
    const supabase = await createClient();
    const { data: project, error } = await supabase
      .from("projects")
      .select("id")
      .eq("id", lastProjectId)
      .single();

    if (!error && project) {
      // Проект существует - редиректим
      redirect(`/projects/${lastProjectId}`);
    }

    // Проект не найден - показываем страницу выбора
    // Кука будет обновлена при следующем заходе в валидный проект
  }

  // Нет сохранённого проекта или проект не существует
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome</h1>
        <p className="text-muted-foreground">Welcome to your admin dashboard</p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
        <p className="text-muted-foreground mb-4">
          Navigate to Projects from the sidebar to manage your projects.
        </p>

        <div className="mt-6">
          <Link
            href="/projects"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Go to Projects
          </Link>
        </div>
      </div>
    </div>
  );
}
