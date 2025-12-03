/**
 * Client Component обертка для списка Projects
 * Использует фабрику сервисов для создания onLoadData и onDelete
 * 
 * Особенности:
 * - Projects являются корневыми сущностями (не привязаны к projectId)
 * - При удалении требуется ввод имени проекта для подтверждения
 */

"use client";

import { useMemo, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { UniversalEntityListDataTable } from "./UniversalEntityListDataTable";
import { generateColumnsFromConfig } from "@/lib/universal-entity/table-column-generator";
import { createEntityDefinitionAndFieldsFromConfig } from "@/lib/universal-entity/config-utils";
import { createProjectListService } from "@/lib/universal-entity/list-service-factory";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type { RoutingConfig } from "./types/list-types";
import type { Project } from "@/lib/projects/types";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { clearCurrentProjectCookie } from "@/lib/projects/cookies";
import { useUserRole } from "@/hooks/use-user-role";

interface ProjectsListClientProps {
  config: EntityConfigFile;
  routing: RoutingConfig;
}

export function ProjectsListClient({
  config,
  routing,
}: ProjectsListClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useUserRole();

  // Используем "global" как pseudo-projectId для React Query key
  const projectId = "global";
  const serviceType = "project";

  // Создаем сервис через фабрику
  const listService = useMemo(() => createProjectListService(), []);

  // Создаем entityDefinition и fields из config
  const { entityDefinition, fields } = useMemo(
    () => createEntityDefinitionAndFieldsFromConfig(projectId, config),
    [config]
  );

  // Извлекаем uiConfig из config и скрываем кнопку создания для не-superAdmin
  const uiConfig = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fields: _fields, ...rest } = config;
    const baseConfig = rest as EntityUIConfig;
    
    // Скрываем кнопку создания проекта для не-superAdmin
    return {
      ...baseConfig,
      list: {
        ...baseConfig.list,
        showCreateButton: baseConfig.list.showCreateButton && isSuperAdmin,
      },
    };
  }, [config, isSuperAdmin]);

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
      const queries = queryClient.getQueriesData<{
        data: Array<{
          id: string;
          name?: string;
        }>;
      }>({
        queryKey: ["list", projectId, serviceType],
      });

      for (const [, queryData] of queries) {
        if (queryData?.data) {
          const item = queryData.data.find((item) => item.id === id);
          if (item) {
            return item.name || "this project";
          }
        }
      }

      return "this project";
    },
    [queryClient]
  );

  // Mutation для удаления с оптимистичными обновлениями
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await listService.onDelete(id);
      // Очищаем куку текущего проекта если удаляем текущий
      clearCurrentProjectCookie();
      return { id, serviceType };
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ["list", projectId, serviceType],
      });

      const previousQueries = queryClient.getQueriesData({
        queryKey: ["list", projectId, serviceType],
      });

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

      return { previousQueries };
    },
    onError: (error, id, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      alert(`Failed to delete project: ${error.message}`);
    },
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
      console.error("Delete error:", error);
    }
  }, [deleteDialog.id, deleteMutation]);

  // Закрытие диалога
  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({ open: false, id: null, itemName: null });
  }, []);

  // Генерируем колонки на основе конфигурации
  const columns = generateColumnsFromConfig<Project>(
    uiConfig.list.columns,
    routing,
    projectId,
    (id) => {
      // Edit action - переход на страницу настроек проекта
      const url = routing.editUrlTemplate
        .replace("{projectId}", projectId)
        .replace("{instanceId}", id);
      router.push(url);
    },
    handleDeleteRequest,
    (id, additionalUrl) => {
      // Navigate to details - переход внутрь проекта
      const url = routing.detailsUrlTemplate
        .replace("{projectId}", projectId)
        .replace("{instanceId}", id);
      router.push(additionalUrl ? `${url}/${additionalUrl}` : url);
    }
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
        onLoadData={listService.onLoadData}
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
          router.push(additionalUrl ? `${url}/${additionalUrl}` : url);
        }}
      />

      {/* Диалог подтверждения удаления с вводом имени проекта */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open: boolean) => {
          if (!open) handleDeleteCancel();
        }}
        title={uiConfig.messages?.deleteModalTitle || "Delete Project"}
        description={
          uiConfig.messages?.deleteModalText ||
          `Are you sure you want to delete "${deleteDialog.itemName}"? This will also delete all related data. This action cannot be undone.`
        }
        itemName={deleteDialog.itemName}
        confirmButtonText={uiConfig.messages?.deleteModalButtonText || "Delete"}
        cancelButtonText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
        // Требуем ввод имени проекта для подтверждения
        confirmWord={deleteDialog.itemName || undefined}
        confirmWordLabel={`Type "${deleteDialog.itemName}" to confirm deletion`}
      />
    </>
  );
}

