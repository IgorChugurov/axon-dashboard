/**
 * Универсальная страница редактирования экземпляра сущности
 * URL: /projects/:projectId/:entityDefId/:instanceId
 * Использует UniversalEntityFormNew с React Query мутациями
 */

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSDK } from "@axon-dashboard/public-api-sdk/server";
import {
  NotFoundError,
  PermissionDeniedError,
  SDKError,
} from "@axon-dashboard/public-api-sdk";
import { EntityInstanceFormNew } from "@/components/entity-instances/EntityInstanceFormNew";
import { BreadcrumbsCacheUpdater } from "@/lib/breadcrumbs";

interface EntityEditPageProps {
  params: Promise<{
    projectId: string;
    entityDefId: string;
    instanceId: string;
  }>;
}

export default async function EntityEditPage({ params }: EntityEditPageProps) {
  const { projectId, entityDefId, instanceId } = await params;

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
      enableCache: true, // Включаем кэш с коротким TTL для оптимизации
      cacheTTL: 2 * 60 * 1000, // 2 минуты - баланс между свежестью данных и производительностью
    }
  );

  // Получаем entity definition с полями и UI конфигом через SDK
  // Дефиниция будет в кэше SDK (если кэш включен) для последующего использования в getInstance()
  const config = await sdk.getEntityDefinitionWithUIConfig(entityDefId);

  if (!config) {
    notFound();
  }

  // Загружаем экземпляр с связями как ID (для редактирования)
  // SDK автоматически определит все relations из fields
  // Дефиниция уже в кэше SDK (если кэш включен), поэтому повторный запрос не будет сделан
  let instance;
  try {
    instance = await sdk.getInstance(entityDefId, instanceId, {
      relationsAsIds: true,
    });
  } catch (error) {
    // Обрабатываем ошибки SDK
    if (error instanceof NotFoundError) {
      // Instance не найден - показываем 404
      notFound();
    } else if (error instanceof PermissionDeniedError) {
      // Нет прав доступа - показываем 404 (не раскрываем информацию о существовании)
      notFound();
    } else if (error instanceof SDKError) {
      // Другие ошибки SDK (загрузка relations, files и т.д.)
      // Логируем для отладки и показываем 404
      console.error("[SDK Error]", error.code, error.message, error.details);
      notFound();
    } else {
      // Неизвестная ошибка - пробрасываем дальше
      throw error;
    }
  }

  // Подготавливаем данные для формы (все поля уже на верхнем уровне, включая relations как ID)
  const formData: Record<string, any> = {};

  // Копируем все поля кроме системных
  const systemFields = [
    "id",
    "entityDefinitionId",
    "projectId",
    "createdAt",
    "updatedAt",
  ];
  for (const [key, value] of Object.entries(instance)) {
    if (!systemFields.includes(key)) {
      formData[key] = value;
    }
  }

  return (
    <div className="space-y-6">
      <BreadcrumbsCacheUpdater
        entityDefinitionId={entityDefId}
        entityDefinitionName={config.entityDefinition.name}
      />

      <EntityInstanceFormNew
        projectId={projectId}
        entityDefinition={config.entityDefinition}
        fields={config.fields}
        uiConfig={config.uiConfig}
        mode="edit"
        instanceId={instanceId}
        initialData={formData}
      />
    </div>
  );
}
