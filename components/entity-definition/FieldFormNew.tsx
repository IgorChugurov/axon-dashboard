/**
 * Обёртка для FieldForm с React Query мутациями
 * Создаёт методы onCreate, onUpdate, onDelete и передаёт их в FieldForm
 */

"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FieldForm } from "./FieldForm";
import {
  createFieldFromClient,
  updateFieldFromClient,
  deleteFieldFromClient,
} from "@/lib/universal-entity/field-client-service";
import { useToast } from "@/hooks/use-toast";
import { showGlobalLoader, hideGlobalLoader } from "@/lib/global-loader/store";
import type { Field, EntityDefinition } from "@/lib/universal-entity/types";

// Импортируем конфиг для messages
import fieldsConfig from "@/config/fields.json";

interface FieldFormNewProps {
  projectId: string;
  entityDefinitionId: string;
  mode: "create" | "edit";
  fieldId?: string;
  initialData?: Field;
  availableEntities: EntityDefinition[];
  availableFields: Field[];
}

export function FieldFormNew({
  projectId,
  entityDefinitionId,
  mode,
  fieldId,
  initialData,
  availableEntities,
  availableFields,
}: FieldFormNewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const messages = fieldsConfig.messages;

  // Query key для инвалидации кэша
  const queryKey = useMemo(
    () => ["list", projectId, "field"],
    [projectId]
  );

  // URL для редиректа
  const redirectUrl = `/projects/${projectId}/${entityDefinitionId}/fields`;

  // Mutation для создания
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      showGlobalLoader();
      return createFieldFromClient({
        entityDefinitionId,
        name: data.name,
        dbType: data.dbType,
        type: data.type,
        label: data.label,
        placeholder: data.placeholder || null,
        description: data.description || null,
        forEditPage: data.forEditPage,
        forCreatePage: data.forCreatePage,
        required: data.required,
        requiredText: data.requiredText || null,
        forEditPageDisabled: data.forEditPageDisabled,
        displayIndex: data.displayIndex,
        displayInTable: data.displayInTable,
        sectionIndex: data.sectionIndex,
        isOptionTitleField: data.isOptionTitleField,
        searchable: data.searchable,
        filterableInList: data.filterableInList,
        relatedEntityDefinitionId: data.relatedEntityDefinitionId || null,
        relationFieldId: data.relationFieldId || null,
        isRelationSource: data.isRelationSource,
        selectorRelationId: data.selectorRelationId || null,
        defaultStringValue: data.defaultStringValue || null,
        defaultNumberValue: data.defaultNumberValue ?? null,
        defaultBooleanValue: data.defaultBooleanValue ?? null,
        defaultDateValue: data.defaultDateValue || null,
        autoPopulate: data.autoPopulate,
        includeInSinglePma: data.includeInSinglePma,
        includeInListPma: data.includeInListPma,
        includeInSingleSa: data.includeInSingleSa,
        includeInListSa: data.includeInListSa,
      });
    },
    onSuccess: (createdItem) => {
      // Добавляем в кэш
      if (createdItem) {
        queryClient.setQueriesData({ queryKey }, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            data: [createdItem, ...(old.data || [])],
            pagination: old.pagination
              ? { ...old.pagination, total: (old.pagination.total || 0) + 1 }
              : undefined,
          };
        });
        queryClient.invalidateQueries({ queryKey });
      }

      toast({
        variant: "success",
        title: "Success",
        description: messages.afterCreate,
      });

      router.push(redirectUrl);
      setTimeout(() => hideGlobalLoader(), 300);
    },
    onError: (error: Error) => {
      hideGlobalLoader();
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || messages.errorCreate,
      });
    },
  });

  // Mutation для обновления
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      showGlobalLoader();
      return updateFieldFromClient(id, {
        name: data.name,
        dbType: data.dbType,
        type: data.type,
        label: data.label,
        placeholder: data.placeholder || null,
        description: data.description || null,
        forEditPage: data.forEditPage,
        forCreatePage: data.forCreatePage,
        required: data.required,
        requiredText: data.requiredText || null,
        forEditPageDisabled: data.forEditPageDisabled,
        displayIndex: data.displayIndex,
        displayInTable: data.displayInTable,
        sectionIndex: data.sectionIndex,
        isOptionTitleField: data.isOptionTitleField,
        searchable: data.searchable,
        filterableInList: data.filterableInList,
        relatedEntityDefinitionId: data.relatedEntityDefinitionId || null,
        relationFieldId: data.relationFieldId || null,
        isRelationSource: data.isRelationSource,
        selectorRelationId: data.selectorRelationId || null,
        defaultStringValue: data.defaultStringValue || null,
        defaultNumberValue: data.defaultNumberValue ?? null,
        defaultBooleanValue: data.defaultBooleanValue ?? null,
        defaultDateValue: data.defaultDateValue || null,
        autoPopulate: data.autoPopulate,
        includeInSinglePma: data.includeInSinglePma,
        includeInListPma: data.includeInListPma,
        includeInSingleSa: data.includeInSingleSa,
        includeInListSa: data.includeInListSa,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });

      toast({
        variant: "success",
        title: "Success",
        description: messages.afterUpdate,
      });

      router.back();
      setTimeout(() => hideGlobalLoader(), 300);
    },
    onError: (error: Error) => {
      hideGlobalLoader();
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || messages.errorUpdate,
      });
    },
  });

  // Mutation для удаления с оптимистичным обновлением
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      showGlobalLoader();
      return deleteFieldFromClient(id);
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previousQueries = queryClient.getQueriesData({ queryKey });

      queryClient.setQueriesData({ queryKey }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data?.filter((item: { id: string }) => item.id !== id) || [],
          pagination: old.pagination
            ? { ...old.pagination, total: Math.max(0, (old.pagination.total || 0) - 1) }
            : undefined,
        };
      });

      return { previousQueries };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });

      toast({
        variant: "success",
        title: "Success",
        description: messages.afterDelete,
      });

      router.push(redirectUrl);
      setTimeout(() => hideGlobalLoader(), 300);
    },
    onError: (error: Error, _id, context) => {
      hideGlobalLoader();

      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete field",
      });
    },
  });

  // Обработчик submit формы
  const handleSubmit = useCallback(
    async (data: Record<string, any>) => {
      if (mode === "create") {
        createMutation.mutate(data);
      } else if (fieldId) {
        updateMutation.mutate({ id: fieldId, data });
      }
      // Возвращаем success чтобы форма знала что запрос начался
      return { success: true };
    },
    [mode, fieldId, createMutation, updateMutation]
  );

  // Обработчик удаления
  const handleDelete = useCallback(async () => {
    if (fieldId) {
      deleteMutation.mutate(fieldId);
    }
  }, [fieldId, deleteMutation]);

  // Обработчик отмены
  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <FieldForm
      projectId={projectId}
      entityDefinitionId={entityDefinitionId}
      mode={mode}
      initialData={initialData}
      availableEntities={availableEntities}
      availableFields={availableFields}
      onSubmit={handleSubmit}
      onDelete={mode === "edit" ? handleDelete : undefined}
      onCancel={handleCancel}
      isLoading={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
    />
  );
}

