/**
 * Страница настроек проекта
 * Использует UniversalEntityFormNew для редактирования данных проекта
 */

import { notFound } from "next/navigation";
import { ProjectFormNew } from "@/components/projects/ProjectFormNew";
import { ProjectIdDisplay } from "@/components/projects/ProjectIdDisplay";
import { projectsService } from "@/lib/entities/projects/service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

interface ProjectSettingsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsPage({
  params,
}: ProjectSettingsPageProps) {
  const { projectId } = await params;

  // Получаем данные проекта
  const project = await projectsService.getById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Project Settings</h1>
          <p className="text-muted-foreground">
            Manage your project configuration
          </p>
          <ProjectIdDisplay projectId={projectId} />
        </div>
        <Button asChild variant="outline">
          <Link href={`/projects/${projectId}/settings/environments`}>
            <Settings className="mr-2 h-4 w-4" />
            Manage Environments
          </Link>
        </Button>
      </div>

      <ProjectFormNew
        mode="edit"
        projectId={projectId}
        initialData={{
          name: project.name,
          description: project.description,
          status: project.status,
        }}
      />
    </div>
  );
}
