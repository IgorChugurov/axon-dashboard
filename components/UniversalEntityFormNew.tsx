/**
 * Универсальный компонент для отображения формы создания/редактирования любой сущности
 * НОВАЯ ВЕРСИЯ: мутации передаются через пропсы (React Query + прямой Supabase)
 *
 * Использует EntityUIConfig для автоматической настройки UI:
 * - Заголовки страниц из uiConfig.form
 * - Тексты кнопок из uiConfig.form
 * - Сообщения об успехе/ошибке из uiConfig.messages
 * - Toast уведомления
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  EntityDefinition,
  Field,
  EntityInstanceWithFields,
} from "@/lib/universal-entity/types";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import { FormWithSectionsShadcn } from "@/lib/form-generation";
import { useToast } from "@/hooks/use-toast";
import { showGlobalLoader, hideGlobalLoader } from "@/lib/global-loader/store";

/**
 * Тип для функции создания
 */
export type CreateFn<TData = any> = (
  data: Record<string, any>
) => Promise<TData>;

/**
 * Тип для функции обновления
 */
export type UpdateFn<TData = any> = (
  id: string,
  data: Record<string, any>
) => Promise<TData>;

/**
 * Тип для функции удаления
 */
export type DeleteFn = (id: string) => Promise<void>;

interface UniversalEntityFormNewProps {
  // Конфигурация сущности
  entityDefinition: EntityDefinition;
  fields: Field[];
  uiConfig: EntityUIConfig;

  // Режим формы
  mode: "create" | "edit";
  initialData?: Record<string, any>;
  instanceId?: string;
  projectId: string;

  // Функции мутации (передаются из обёртки)
  onCreate?: CreateFn;
  onUpdate?: UpdateFn;
  onDelete?: DeleteFn;

  // URL для редиректа после успешной операции
  redirectUrl: string;

  // Query key для инвалидации React Query cache
  queryKey?: string[];

  // Опционально: кастомная обработка данных перед отправкой
  transformData?: (formData: Record<string, any>) => Record<string, any>;
}

export function UniversalEntityFormNew({
  entityDefinition,
  fields,
  uiConfig,
  mode,
  initialData = {},
  instanceId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  projectId,
  onCreate,
  onUpdate,
  onDelete,
  redirectUrl,
  queryKey,
  transformData,
}: UniversalEntityFormNewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { messages } = uiConfig;

  // Читаем returnLimit из URL для сохранения размера страницы после CREATE/DELETE
  const finalRedirectUrl = useMemo(() => {
    const returnLimit = searchParams.get("returnLimit");
    if (returnLimit) {
      return `${redirectUrl}?limit=${returnLimit}`;
    }
    return redirectUrl;
  }, [searchParams, redirectUrl]);

  // Mutation для создания с добавлением в кэш
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      if (!onCreate) {
        throw new Error("onCreate function is not provided");
      }
      showGlobalLoader();
      return onCreate(data);
    },
    onSuccess: (createdItem) => {
      // Добавляем созданный элемент в кэш списка (для мгновенного отображения)
      if (queryKey && createdItem) {
        queryClient.setQueriesData({ queryKey }, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            // Добавляем новый элемент в начало списка
            data: [createdItem, ...(old.data || [])],
            pagination: old.pagination
              ? {
                  ...old.pagination,
                  total: (old.pagination.total || 0) + 1,
                }
              : undefined,
          };
        });

        // Инвалидируем кэш для фоновой загрузки полных данных (с relations)
        queryClient.invalidateQueries({ queryKey });
      }

      toast({
        variant: "success",
        title: "Success",
        description: messages.afterCreate || "Created successfully",
      });

      // SPA навигация - переход на список с сохранением limit
      router.push(finalRedirectUrl);
      // Скрываем лоадер с увеличенной задержкой для CREATE (переход может быть дольше)
      setTimeout(() => {
        hideGlobalLoader();
      }, 300);
    },
    onError: (error: Error) => {
      hideGlobalLoader();

      const errorMessage =
        messages.errorCreate || error.message || "Failed to create";

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    },
  });

  // Mutation для обновления
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, any>;
    }) => {
      if (!onUpdate) {
        throw new Error("onUpdate function is not provided");
      }
      showGlobalLoader();
      return onUpdate(id, data);
    },
    onSuccess: (updatedInstance) => {
      // Оптимистичное обновление кэша React Query вместо инвалидации
      // Это избегает повторной загрузки всего списка
      if (queryKey && updatedInstance) {
        // Получаем все query keys с префиксом queryKey (все страницы списка)
        const allQueries = queryClient.getQueriesData<{
          data: EntityInstanceWithFields[];
          pagination: any;
        }>({
          queryKey: queryKey.slice(0, 3), // ["list", projectId, serviceType]
        });

        // Обновляем все закэшированные страницы, где может быть обновленный элемент
        allQueries.forEach(([key, queryData]) => {
          if (queryData?.data) {
            const updatedData = queryData.data.map((item) =>
              item.id === updatedInstance.id ? updatedInstance : item
            );

            // Обновляем кэш только если элемент найден и изменен
            if (updatedData !== queryData.data) {
              queryClient.setQueryData(key, {
                ...queryData,
                data: updatedData,
              });
            }
          }
        });
      }

      toast({
        variant: "success",
        title: "Success",
        description: messages.afterUpdate || "Updated successfully",
      });

      // При UPDATE возвращаемся назад - сохраняем все параметры списка (page, limit, search, filters)
      router.back();
      // Скрываем лоадер с задержкой, чтобы дать время на визуальный переход
      // 300ms покрывает случай когда страница списка не в кэше и требует загрузки
      setTimeout(() => {
        hideGlobalLoader();
      }, 300);
    },
    onError: (error: Error) => {
      hideGlobalLoader();

      const errorMessage =
        messages.errorUpdate || error.message || "Failed to update";

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    },
  });

  // Mutation для удаления с оптимистичным обновлением
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!onDelete) {
        throw new Error("onDelete function is not provided");
      }
      showGlobalLoader();
      return onDelete(id);
    },
    // Оптимистичное обновление: сразу удаляем из кеша
    onMutate: async (id: string) => {
      if (!queryKey) return { previousQueries: [] };

      // Отменяем исходящие запросы
      await queryClient.cancelQueries({ queryKey });

      // Сохраняем предыдущие данные для отката
      const previousQueries = queryClient.getQueriesData({ queryKey });

      // Оптимистично удаляем элемент из всех связанных запросов
      queryClient.setQueriesData({ queryKey }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data:
            old.data?.filter((item: { id: string }) => item.id !== id) || [],
          pagination: old.pagination
            ? {
                ...old.pagination,
                total: Math.max(0, (old.pagination.total || 0) - 1),
              }
            : undefined,
        };
      });

      return { previousQueries };
    },
    onSuccess: () => {
      // Инвалидируем кэш для получения актуальных данных
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey });
      }

      toast({
        variant: "success",
        title: "Success",
        description: messages.afterDelete || "Deleted successfully",
      });

      // SPA навигация - переход на список с сохранением limit
      router.push(finalRedirectUrl);
      // Скрываем лоадер с увеличенной задержкой для DELETE (переход может быть дольше)
      setTimeout(() => {
        hideGlobalLoader();
      }, 300);
    },
    onError: (error: Error, _id, context) => {
      hideGlobalLoader();

      // Откатываем оптимистичное обновление
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete",
      });
    },
  });

  // Обработчик отправки формы
  const handleSubmit = async (formData: Record<string, any>) => {
    // Применяем кастомную трансформацию данных (если есть)
    // Разделение на data/relations происходит в обёртке (EntityInstanceFormNew и т.д.)
    const finalData = transformData ? transformData(formData) : formData;

    if (mode === "create") {
      createMutation.mutate(finalData);
    } else if (instanceId) {
      updateMutation.mutate({ id: instanceId, data: finalData });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Instance ID is required for update",
      });
    }
  };

  // Обработчик отмены
  const handleCancel = () => {
    router.back();
  };

  // Обработчик удаления
  const handleDelete = async () => {
    if (!instanceId) {
      return;
    }
    deleteMutation.mutate(instanceId);
  };

  // Имя элемента для диалога подтверждения удаления
  const itemName =
    initialData?.name ||
    initialData?.key ||
    initialData?.title ||
    entityDefinition.name;

  // Ошибка (для отображения inline)
  const error =
    createMutation.error?.message ||
    updateMutation.error?.message ||
    deleteMutation.error?.message;

  return (
    <div className="space-y-6">
      {/* Inline ошибка (дополнительно к toast) */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Форма */}
      <FormWithSectionsShadcn
        fields={fields}
        mode={mode}
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onDelete={mode === "edit" && onDelete ? handleDelete : undefined}
        uiConfig={uiConfig}
        itemName={itemName}
        entityInstanceId={instanceId}
      />
    </div>
  );
}
