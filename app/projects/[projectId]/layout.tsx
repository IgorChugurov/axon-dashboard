import React, { type ReactNode } from "react";
import { notFound } from "next/navigation";
import { getFullConfig } from "@/lib/universal-entity/config-service";
import { EntityDefinitionsProvider } from "@/components/providers/EntityDefinitionsProvider";
import { createClient } from "@/lib/supabase/server";

interface ProjectLayoutProps {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { projectId } = await params;

  // Проверяем существование проекта
  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    notFound();
  }

  // Загружаем все entityDefinitions и их поля для проекта
  const { entities: entityDefinitions, fields } = await getFullConfig(
    projectId
  );

  console.log(
    `[ProjectLayout] Loaded ${entityDefinitions.length} entity definitions with ${fields.length} fields for project ${projectId}`
  );

  return (
    <EntityDefinitionsProvider
      entityDefinitions={entityDefinitions}
      fields={fields}
      projectId={projectId}
    >
      {children}
    </EntityDefinitionsProvider>
  );
}
