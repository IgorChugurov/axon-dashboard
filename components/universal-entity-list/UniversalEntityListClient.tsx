/**
 * Client Component обертка для UniversalEntityList
 * Использует прямой доступ к Supabase для загрузки данных (SPA)
 */

"use client";

import { useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UniversalEntityListDataTable } from "./UniversalEntityListDataTable";
import {
  getEnvironmentsFromClient,
  deleteEnvironmentFromClient,
} from "@/lib/environments/client-service";
import { generateColumnsFromConfig } from "@/lib/universal-entity/table-column-generator";
import { createEntityDefinitionAndFieldsFromConfig } from "@/lib/universal-entity/config-utils";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type {
  Environment,
  EnvironmentsResponse,
} from "@/lib/environments/types";
import { useRouter } from "next/navigation";
import type {
  ServiceType,
  RoutingConfig,
  LoadDataFn,
} from "./types/list-types";
import { getListQueryKey } from "./utils/list-query-key";

interface UniversalEntityListClientProps {
  projectId: string;
  serviceType: ServiceType;
  config: EntityConfigFile;
  routing: RoutingConfig;
}

export function UniversalEntityListClient({
  projectId,
  serviceType,
  config,
  routing,
}: UniversalEntityListClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Создаем entityDefinition и fields из config
  const { entityDefinition } = useMemo(
    () => createEntityDefinitionAndFieldsFromConfig(projectId, config),
    [projectId, config]
  );

  // Извлекаем uiConfig из config
  const uiConfig = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fields: _fields, ...uiConfig } = config;
    return uiConfig as EntityUIConfig;
  }, [config]);

  // Создаем функцию загрузки данных через прямой доступ к Supabase (SPA)
  // Используем useCallback для стабильности ссылки
  const onLoadData: LoadDataFn<Environment> = useCallback(
    async (params, _signal) => {
      switch (serviceType) {
        case "environment": {
          // Прямой доступ к Supabase из браузера
          const result = await getEnvironmentsFromClient(projectId, {
            page: params.page,
            limit: params.limit,
            search: params.search,
          });

          return {
            data: result.data || [],
            pagination: result.pagination || {
              page: params.page,
              limit: params.limit,
              total: 0,
              totalPages: 0,
              hasPreviousPage: false,
              hasNextPage: false,
            },
          };
        }
        case "entity-definition": {
          // TODO: Реализовать загрузку entity definitions
          throw new Error("Entity definition list not implemented yet");
        }
        case "entity-instance": {
          // TODO: Реализовать загрузку entity instances
          throw new Error("Entity instance list not implemented yet");
        }
        case "field": {
          // TODO: Реализовать загрузку fields
          throw new Error("Field list not implemented yet");
        }
        default:
          throw new Error(`Unknown service type: ${serviceType}`);
      }
    },
    [projectId, serviceType]
  );

  // Mutation для удаления с оптимистичными обновлениями
  // Используем прямой доступ к Supabase
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      switch (serviceType) {
        case "environment": {
          // Прямой доступ к Supabase из браузера
          await deleteEnvironmentFromClient(projectId, id);
          return { id, serviceType };
        }
        case "entity-definition": {
          // TODO: Реализовать удаление entity definition
          throw new Error("Entity definition delete not implemented yet");
        }
        case "entity-instance": {
          // TODO: Реализовать удаление entity instance
          throw new Error("Entity instance delete not implemented yet");
        }
        case "field": {
          // TODO: Реализовать удаление field
          throw new Error("Field delete not implemented yet");
        }
        default:
          throw new Error(`Unknown service type: ${serviceType}`);
      }
    },
    // Оптимистичное обновление: сразу удаляем из кеша
    onMutate: async (id) => {
      // Отменяем исходящие запросы, чтобы они не перезаписали оптимистичное обновление
      await queryClient.cancelQueries({
        queryKey: ["list", projectId, serviceType],
      });

      // Сохраняем предыдущее значение для отката
      const previousQueries = queryClient.getQueriesData({
        queryKey: ["list", projectId, serviceType],
      });

      // Оптимистично обновляем все связанные запросы
      queryClient.setQueriesData(
        { queryKey: ["list", projectId, serviceType] },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((item: { id: string }) => item.id !== id),
            pagination: {
              ...old.pagination,
              total: Math.max(0, old.pagination.total - 1),
            },
          };
        }
      );

      // Возвращаем контекст для отката
      return { previousQueries };
    },
    // При ошибке откатываем изменения
    onError: (error, id, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      alert(`Failed to delete item: ${error.message}`);
    },
    // При успехе инвалидируем кеш для обновления данных
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["list", projectId, serviceType],
      });
    },
  });

  // Обработчик удаления с подтверждением
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      // Ошибка уже обработана в onError
      console.error("Delete error:", error);
    }
  };

  // Генерируем колонки на основе конфигурации
  const columns = generateColumnsFromConfig<Environment>(
    uiConfig.list.columns,
    routing,
    projectId,
    (id) => {
      const url = routing.editUrlTemplate
        .replace("{projectId}", projectId)
        .replace("{instanceId}", id);
      router.push(url);
    },
    handleDelete,
    (id, additionalUrl) => {
      const url = routing.detailsUrlTemplate
        .replace("{projectId}", projectId)
        .replace("{instanceId}", id);
      router.push(additionalUrl ? `${url}${additionalUrl}` : url);
    }
  );

  return (
    <UniversalEntityListDataTable
      columns={columns}
      entityDefinition={entityDefinition}
      uiConfig={uiConfig}
      projectId={projectId}
      serviceType={serviceType}
      onLoadData={onLoadData}
      routing={routing}
      onEdit={(id) => {
        const url = routing.editUrlTemplate
          .replace("{projectId}", projectId)
          .replace("{instanceId}", id);
        router.push(url);
      }}
      onDelete={handleDelete}
      onLink={(id, additionalUrl) => {
        const url = routing.detailsUrlTemplate
          .replace("{projectId}", projectId)
          .replace("{instanceId}", id);
        router.push(additionalUrl ? `${url}${additionalUrl}` : url);
      }}
    />
  );
}
