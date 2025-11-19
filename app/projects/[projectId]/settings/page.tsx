import { Breadcrumbs } from "@/components/Breadcrumbs";

interface ProjectSettingsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsPage({
  params,
}: ProjectSettingsPageProps) {
  const { projectId } = await params;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        projectId={projectId}
      />

      <div className="rounded-lg border bg-card p-6">
        <p className="text-muted-foreground">
          Settings form will be implemented here.
        </p>
      </div>
    </div>
  );
}

