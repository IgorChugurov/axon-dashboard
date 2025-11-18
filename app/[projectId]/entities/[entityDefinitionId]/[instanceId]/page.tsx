/**
 * Универсальная страница просмотра экземпляра сущности
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { getInstanceById } from "@/lib/universal-entity/instance-service";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { EntityDefinitionServerWrapper } from "../EntityDefinitionServerWrapper";

interface EntityDetailPageProps {
  params: Promise<{
    projectId: string;
    entityDefinitionId: string;
    instanceId: string;
  }>;
}

export default async function EntityDetailPage({
  params,
}: EntityDetailPageProps) {
  const { projectId, entityDefinitionId, instanceId } = await params;

  // Загружаем экземпляр
  const instance = await getInstanceById(instanceId);

  if (!instance || instance.entityDefinitionId !== entityDefinitionId) {
    notFound();
  }

  return (
    <EntityDefinitionServerWrapper
      projectId={projectId}
      entityDefinitionId={entityDefinitionId}
    >
      {async ({ entityDefinition, fields }) => {
        // Получаем поля для отображения (все поля, кроме скрытых)
        const displayFields = fields.filter(
          (f) => f.includeInSinglePma || f.includeInSingleSa
        );

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {entityDefinition.name}
                </h1>
                {entityDefinition.description && (
                  <p className="text-muted-foreground">
                    {entityDefinition.description}
                  </p>
                )}
              </div>
              <Button asChild>
                <Link
                  href={`/${projectId}/entities/${entityDefinitionId}/${instanceId}/edit`}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            </div>

            <div className="rounded-md border p-6 space-y-4">
              {displayFields.map((field) => {
                const value = instance.data ? (instance.data as Record<string, any>)[field.name] : undefined;
                return (
                  <div key={field.id} className="space-y-2">
                    <Label className="text-sm font-medium">{field.label}</Label>
                    <div className="text-sm">
                      {value !== undefined && value !== null
                        ? String(value)
                        : "-"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }}
    </EntityDefinitionServerWrapper>
  );
}
