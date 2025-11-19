import { redirect } from "next/navigation";

/**
 * Редирект со старого пути /[projectId] на новый /projects/[projectId]
 */
interface ProjectRedirectProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectRedirect({ params }: ProjectRedirectProps) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}`);
}

