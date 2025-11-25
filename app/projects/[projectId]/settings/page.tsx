import { ProjectSettingsTab } from "./ProjectSettingsTab";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { BreadcrumbsSetter } from "@/components/BreadcrumbsSetter";

interface ProjectSettingsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsPage({
  params,
}: ProjectSettingsPageProps) {
  const { projectId } = await params;

  return (
    <div className="space-y-6">
      <BreadcrumbsSetter projectId={projectId} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Project Settings</h1>
          <p className="text-muted-foreground">
            Manage your project configuration
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/projects/${projectId}/settings/environments`}>
            <Settings className="mr-2 h-4 w-4" />
            Manage Environments
          </Link>
        </Button>
      </div>

      <ProjectSettingsTab projectId={projectId} />
    </div>
  );
}
