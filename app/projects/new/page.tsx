/**
 * Страница создания нового проекта
 * Использует UniversalEntityFormNew для создания проекта
 */

import { ProjectFormNew } from "@/components/projects/ProjectFormNew";

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create New Project</h1>
        <p className="text-muted-foreground">
          Create a new project to organize your entities
        </p>
      </div>

      <ProjectFormNew mode="create" />
    </div>
  );
}
