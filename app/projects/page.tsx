import { projectsService } from "@/lib/entities/projects/service";
import { ProjectsList } from "@/components/ProjectsList";
import { Suspense } from "react";

/**
 * Projects Page - SSR для первой загрузки
 *
 * Эта страница:
 * 1. Рендерится на сервере (SSR) при первом заходе
 * 2. Поддерживает URL параметры: ?page=2&search=test
 * 3. После hydration работает как SPA (без перезагрузки)
 * 4. Использует универсальную систему entity-service
 */

interface ProjectsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  // Парсим параметры из URL (await для Next.js 15)
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";

  // SSR: Получаем проекты на сервере через универсальный сервис
  const { data: projects, pagination } = await projectsService.getAll({
    page,
    search,
    limit: 10,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-muted-foreground">
          Manage your projects and track their progress
        </p>
      </div>

      <Suspense fallback={<ProjectsListSkeleton />}>
        <ProjectsList
          initialData={projects}
          initialPagination={pagination || undefined}
          initialSearch={search}
        />
      </Suspense>
    </div>
  );
}

// Skeleton loader для Suspense
function ProjectsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 bg-muted animate-pulse rounded" />
      <div className="h-64 bg-muted animate-pulse rounded" />
    </div>
  );
}
