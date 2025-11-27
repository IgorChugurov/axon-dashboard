/**
 * Home Page - Редирект на последний проект или welcome
 *
 * При заходе на главную страницу:
 * 1. Проверяем роль пользователя (только для админов)
 * 2. Читаем куку с последним проектом
 * 3. Проверяем существование проекта в БД
 * 4. Если проект существует - редирект на /projects/:projectId
 * 5. Иначе показываем страницу выбора проекта
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProjectFromCookies } from "@/lib/projects/cookies";
import { getUserRole } from "@/lib/auth/roles";

export default async function HomePage() {
  const supabase = await createClient();
  
  // Получаем текущего пользователя
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // Не авторизован - middleware должен был редиректнуть
    redirect("/login");
  }
  
  // Проверяем роль пользователя
  const userRole = await getUserRole(user.id);
  
  // Обычные пользователи не имеют доступа к админке
  // Middleware уже редиректит их на /welcome, но проверим для надёжности
  if (userRole === "user") {
    redirect("/welcome");
  }
  
  // Далее логика только для админов
  // Читаем куку с последним проектом
  const cookieStore = await cookies();
  const lastProjectId = getCurrentProjectFromCookies(cookieStore);

  if (lastProjectId) {
    // Проверяем существование проекта в БД
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
        <p className="text-muted-foreground">
          Welcome to your admin dashboard
        </p>
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
