/**
 * Client Component обертка для UniversalEntityList
 * Использует прямой доступ к Supabase для загрузки данных (SPA)
 *
 * Теперь принимает onLoadData и onDelete через пропсы для полной универсальности
 */

"use client";

import { useMemo, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UniversalEntityListDataTable } from "./UniversalEntityListDataTable";
import { generateColumnsFromConfig } from "@/lib/universal-entity/table-column-generator";
import { createEntityDefinitionAndFieldsFromConfig } from "@/lib/universal-entity/config-utils";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import { useRouter } from "next/navigation";
import type {
  ServiceType,
  RoutingConfig,
  LoadDataFn,
} from "./types/list-types";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface UniversalEntityListClientProps<
  TData extends { id: string } = { id: string }
> {
  projectId: string;
  serviceType: ServiceType; // Используется для query key в React Query
  config: EntityConfigFile;
  routing: RoutingConfig;
  onLoadData: LoadDataFn<TData>;
  onDelete: (id: string) => Promise<void>;
  readOnly?: boolean; // Опционально: если true, скрывает кнопки создания/удаления и заменяет edit на view
}

export function UniversalEntityListClient<
  TData extends { id: string } = { id: string }
>({
  projectId,
  serviceType,
  config,
  routing,
  onLoadData,
  onDelete,
  readOnly = false,
}: UniversalEntityListClientProps<TData>) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Создаем entityDefinition и fields из config
  const { entityDefinition, fields } = useMemo(
    () => createEntityDefinitionAndFieldsFromConfig(projectId, config),
    [projectId, config]
  );

  // Извлекаем uiConfig из config
  const uiConfig = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fields: _fields, ...uiConfig } = config;
    return uiConfig as EntityUIConfig;
  }, [config]);

  // Состояние для диалога подтверждения удаления
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string | null;
    itemName: string | null;
  }>({
    open: false,
    id: null,
    itemName: null,
  });

  // Получение имени элемента из кэша React Query
  const getItemName = useCallback(
    (id: string): string => {
      // Получаем все данные из кэша для текущего списка
      const queries = queryClient.getQueriesData<{
        data: Array<{
          id: string;
          name?: string;
          key?: string;
          title?: string;
        }>;
      }>({
        queryKey: ["list", projectId, serviceType],
      });

      // Ищем элемент по id во всех закэшированных страницах
      for (const [, queryData] of queries) {
        if (queryData?.data) {
          const item = queryData.data.find((item) => item.id === id);
          if (item) {
            // Возвращаем первое найденное "имя" поле
            return item.name || item.key || item.title || "this item";
          }
        }
      }

      return "this item";
    },
    [queryClient, projectId, serviceType]
  );

  // Mutation для удаления с оптимистичными обновлениями
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await onDelete(id);
      return { id, serviceType };
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

  // Открытие диалога подтверждения удаления
  const handleDeleteRequest = useCallback(
    (id: string) => {
      const itemName = getItemName(id);
      setDeleteDialog({
        open: true,
        id,
        itemName,
      });
    },
    [getItemName]
  );

  // Подтверждение удаления
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.id) return;

    try {
      await deleteMutation.mutateAsync(deleteDialog.id);
      setDeleteDialog({ open: false, id: null, itemName: null });
    } catch (error) {
      // Ошибка уже обработана в onError mutation
      console.error("Delete error:", error);
    }
  }, [deleteDialog.id, deleteMutation]);

  // Закрытие диалога
  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({ open: false, id: null, itemName: null });
  }, []);

  // Генерируем колонки на основе конфигурации
  const columns = generateColumnsFromConfig<TData>(
    uiConfig.list.columns,
    routing,
    projectId,
    (id) => {
      const url = routing.editUrlTemplate
        .replace("{projectId}", projectId)
        .replace("{instanceId}", id);
      router.push(url);
    },
    handleDeleteRequest,
    (id, additionalUrl) => {
      const url = routing.detailsUrlTemplate
        .replace("{projectId}", projectId)
        .replace("{instanceId}", id);
      router.push(additionalUrl ? `${url}${additionalUrl}` : url);
    },
    readOnly
  );

  return (
    <>
      <UniversalEntityListDataTable
        columns={columns}
        entityDefinition={entityDefinition}
        uiConfig={uiConfig}
        fields={fields}
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
        onDelete={handleDeleteRequest}
        onLink={(id, additionalUrl) => {
          const url = routing.detailsUrlTemplate
            .replace("{projectId}", projectId)
            .replace("{instanceId}", id);
          router.push(additionalUrl ? `${url}${additionalUrl}` : url);
        }}
        readOnly={readOnly}
      />

      {/* Диалог подтверждения удаления */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open: boolean) => {
          if (!open) handleDeleteCancel();
        }}
        title="Delete Item"
        description={`Are you sure you want to delete "${deleteDialog.itemName}"? This action cannot be undone.`}
        itemName={deleteDialog.itemName}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
