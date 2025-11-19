import { redirect } from "next/navigation";

/**
 * Редирект со старых путей /[projectId]/[...rest] на новые /projects/[projectId]/[...rest]
 */
interface ProjectRedirectProps {
  params: Promise<{ projectId: string; rest?: string[] }>;
}

export default async function ProjectRedirect({ params }: ProjectRedirectProps) {
  const { projectId, rest } = await params;
  
  // Исключаем специальные пути, которые не должны редиректиться
  const restPath = rest && rest.length > 0 ? `/${rest.join("/")}` : "";
  
  // Если это специальный путь (well-known, favicon и т.д.), не редиректим
  if (restPath.startsWith("/.well-known") || 
      restPath.startsWith("/favicon") ||
      restPath.startsWith("/_next") ||
      restPath.startsWith("/api")) {
    return null; // Возвращаем null, чтобы Next.js обработал это как 404
  }
  
  // Проверяем, что projectId не является "projects" (чтобы избежать циклов)
  if (projectId === "projects") {
    return null;
  }
  
  // Заменяем старые пути entities на entity-instances
  const updatedRestPath = restPath.replace(/^\/entities\//, "/entity-instances/");
  
  redirect(`/projects/${projectId}${updatedRestPath}`);
}

