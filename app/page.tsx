import { Suspense } from "react";
import { redirect } from "next/navigation";
import ProjectsList from "@/components/ProjectsList";
import { projectsServerProvider } from "@/lib/projects/server";
import { parseSearchParams } from "@/lib/server-data/types";
import AuthErrorHandler from "@/components/AuthErrorHandler";

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function ProjectsPageContent({ searchParams }: HomePageProps) {
  try {
    console.log("[Page] Loading projects page");

    // 1. Парсим параметры из URL (await для Next.js 15)
    const params = parseSearchParams(await searchParams);
    console.log("[Page] Search params:", params);

    // 2. Получаем данные - вся логика токенов в API
    const initialData = await projectsServerProvider.getProjects(params);
    console.log("[Page] Data loaded successfully");

    return <ProjectsList initialData={initialData} />;
  } catch (error) {
    console.error("[Page] Error:", error);

    // Если ошибка авторизации - показываем обработчик ошибок
    if (
      error instanceof Error &&
      (error.message.includes("Unauthorized") ||
        error.message.includes("Token refresh failed") ||
        error.message.includes("No valid tokens"))
    ) {
      console.log("[Page] Auth error, showing error handler");
      return <AuthErrorHandler error={error} />;
    }

    // Другие ошибки перебрасываем
    throw error;
  }
}

export default function HomePage({ searchParams }: HomePageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="bg-primary-foreground rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Управление проектами</h2>
            <p>Загрузка проектов...</p>
          </div>
        </div>
      }
    >
      <ProjectsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
