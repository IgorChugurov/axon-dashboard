/**
 * Универсальная страница списка экземпляров сущности
 * URL: /projects/:projectId/:entityDefId
 */

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSDK } from "@/lib/sdk/public-api/server";
import { EntityInstancesListClient } from "@/components/universal-entity-list";
import { BreadcrumbsCacheUpdater } from "@/lib/breadcrumbs";

interface EntityListPageProps {
  params: Promise<{ projectId: string; entityDefId: string }>;
}

export default async function EntityListPage({ params }: EntityListPageProps) {
  const { projectId, entityDefId } = await params;

  // Получаем cookie handler для Next.js
  const cookieStore = await cookies();

  // Создаем SDK клиент с явной передачей ключей и cookie handler
  const sdk = await createServerSDK(
    projectId,
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Игнорируем ошибки в Server Components
          }
        },
      },
    },
    {
      enableCache: true, // Используем кэш для оптимизации
    }
  );

  // Получаем entity definition с полями через SDK одним запросом (JOIN)
  // SDK использует кэширование для оптимизации последующих запросов
  const config = await sdk.getEntityDefinitionWithUIConfig(entityDefId);

  if (!config) {
    notFound();
  }

  const { entityDefinition, fields } = config;

  // Проверяем, что entityDefinition принадлежит проекту
  if (entityDefinition.projectId !== projectId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <BreadcrumbsCacheUpdater
        entityDefinitionId={entityDefId}
        entityDefinitionName={entityDefinition.name}
      />

      {entityDefinition.description && (
        <p className="text-muted-foreground">{entityDefinition.description}</p>
      )}

      <EntityInstancesListClient
        projectId={projectId}
        entityDefinition={entityDefinition}
        fields={fields}
        routing={{
          createUrlTemplate: "/projects/{projectId}/{entityDefinitionId}/new",
          editUrlTemplate:
            "/projects/{projectId}/{entityDefinitionId}/{instanceId}",
          detailsUrlTemplate:
            "/projects/{projectId}/{entityDefinitionId}/{instanceId}",
        }}
      />
    </div>
  );
}
