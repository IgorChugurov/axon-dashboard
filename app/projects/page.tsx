import { ProjectsListClient } from "@/components/universal-entity-list/ProjectsListClient";
import projectsConfig from "@/config/projects.json";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";

/**
 * Projects Page - Список проектов
 *
 * Использует универсальный компонент списка ProjectsListClient
 * для отображения и управления проектами.
 */
export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <ProjectsListClient
        config={projectsConfig as unknown as EntityConfigFile}
        routing={{
          createUrlTemplate: "/projects/new",
          editUrlTemplate: "/projects/{instanceId}/settings",
          detailsUrlTemplate: "/projects/{instanceId}",
        }}
      />
    </div>
  );
}
