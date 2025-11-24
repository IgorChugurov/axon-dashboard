/**
 * Компонент таба Project Settings
 * Заглушка для будущей реализации настроек проекта
 */

interface ProjectSettingsTabProps {
  projectId: string;
}

export async function ProjectSettingsTab({
  projectId,
}: ProjectSettingsTabProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-muted-foreground">
        Project settings will be implemented here.
      </p>
    </div>
  );
}

