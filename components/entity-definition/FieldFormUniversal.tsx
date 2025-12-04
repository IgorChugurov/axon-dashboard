/**
 * Обёртка для UniversalEntityFormForFields для работы с Field
 * Использует конфиг из JSON файла и клиентские сервисы Supabase
 * Это новая версия, использующая универсальную форму вместо захардкоженной FieldForm
 */

"use client";

import { useMemo } from "react";
import { UniversalEntityFormForFields } from "@/components/UniversalEntityFormForFields";
import { createEntityDefinitionAndFieldsFromConfig } from "@/lib/universal-entity/config-utils";
import {
  createFieldFromClient,
  updateFieldFromClient,
  deleteFieldFromClient,
} from "@/lib/universal-entity/field-client-service";
import type { EntityConfigFile } from "@/lib/universal-entity/config-file-types";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type { EntityDefinition, Field } from "@/lib/universal-entity/types";
import { useRole } from "@/hooks/use-role";

// Импортируем конфиг напрямую (статический импорт)
import fieldsConfig from "@/config/fields.json";

interface FieldFormUniversalProps {
  projectId: string;
  entityDefinitionId: string;
  mode: "create" | "edit";
  fieldId?: string;
  initialData?: Field;
  availableEntities: EntityDefinition[];
  availableFields: Field[];
}

export function FieldFormUniversal({
  projectId,
  entityDefinitionId,
  mode,
  fieldId,
  initialData,
  availableEntities,
  availableFields,
}: FieldFormUniversalProps) {
  const { isReadOnly } = useRole(projectId);

  // Создаём entityDefinition и fields из JSON конфига
  const { entityDefinition, fields } = useMemo(
    () =>
      createEntityDefinitionAndFieldsFromConfig(
        projectId,
        fieldsConfig as unknown as EntityConfigFile
      ),
    [projectId]
  );

  // Извлекаем uiConfig из конфига (всё кроме fields)
  const uiConfig = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fields: _fields, ...rest } = fieldsConfig;
    return rest as unknown as EntityUIConfig;
  }, []);

  // Подготавливаем initialData для формы
  const formInitialData: Record<string, any> = useMemo(() => {
    if (!initialData) return {};

    return {
      name: initialData.name,
      dbType: initialData.dbType,
      type: initialData.type,
      label: initialData.label,
      placeholder: initialData.placeholder || null,
      description: initialData.description || null,
      forEditPage: initialData.forEditPage,
      forCreatePage: initialData.forCreatePage,
      required: initialData.required,
      requiredText: initialData.requiredText || null,
      forEditPageDisabled: initialData.forEditPageDisabled,
      displayIndex: initialData.displayIndex,
      displayInTable: initialData.displayInTable,
      sectionIndex: initialData.sectionIndex,
      isOptionTitleField: initialData.isOptionTitleField,
      searchable: initialData.searchable,
      filterableInList: initialData.filterableInList,
      relatedEntityDefinitionId: initialData.relatedEntityDefinitionId || null,
      relationFieldId: initialData.relationFieldId || null,
      isRelationSource: initialData.isRelationSource,
      selectorRelationId: initialData.selectorRelationId || null,
      defaultStringValue: initialData.defaultStringValue || null,
      defaultNumberValue: initialData.defaultNumberValue ?? null,
      defaultBooleanValue: initialData.defaultBooleanValue ?? null,
      defaultDateValue: initialData.defaultDateValue || null,
      autoPopulate: initialData.autoPopulate,
      includeInSinglePma: initialData.includeInSinglePma,
      includeInListPma: initialData.includeInListPma,
      includeInSingleSa: initialData.includeInSingleSa,
      includeInListSa: initialData.includeInListSa,
    };
  }, [initialData]);

  // Transform data - обрабатываем поля для создания связанного поля (только при создании)
  const transformData = useMemo(() => {
    return (formData: Record<string, any>): Record<string, any> => {
      const result = { ...formData };

      // Поля relationFieldName, relationFieldLabel, relationFieldRequired, relationFieldRequiredText
      // используются только при создании и только если выбран relatedEntityDefinitionId
      // Они не в конфигурации, но обрабатываются в transformData
      if (mode === "create") {
        // Эти поля уже должны быть в formData, если они были введены в форме
        // Но если их нет в конфигурации, они не будут в formData
        // Поэтому мы их просто передаем как есть, если они есть
      }

      return result;
    };
  }, [mode]);

  // Функция создания - адаптер для client-service
  const handleCreate = async (data: Record<string, any>): Promise<Field> => {
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
      // Поля для создания связанного поля (только при создании)
      relationFieldName: data.relationFieldName || null,
      relationFieldLabel: data.relationFieldLabel || null,
      relationFieldRequired: data.relationFieldRequired ?? false,
      relationFieldRequiredText: data.relationFieldRequiredText || null,
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
  };

  // Функция обновления - адаптер для client-service
  const handleUpdate = async (
    id: string,
    data: Record<string, any>
  ): Promise<Field> => {
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
  };

  // Функция удаления - адаптер для client-service
  const handleDelete = async (id: string): Promise<void> => {
    return deleteFieldFromClient(id);
  };

  // URL для редиректа после успешной операции
  const redirectUrl = `/projects/${projectId}/${entityDefinitionId}/fields`;

  // Query key для инвалидации кэша React Query
  const queryKey = ["list", projectId, "field"];

  // Преобразуем availableEntities и availableFields в нужный формат
  const entitiesForForm = useMemo(
    () =>
      availableEntities.map((e) => ({
        id: e.id,
        name: e.name,
      })),
    [availableEntities]
  );

  const fieldsForForm = useMemo(
    () =>
      availableFields.map((f) => ({
        id: f.id,
        name: f.name,
        label: f.label,
        entityDefinitionId: f.entityDefinitionId,
      })),
    [availableFields]
  );

  return (
    <UniversalEntityFormForFields
      entityDefinition={entityDefinition}
      fields={fields}
      uiConfig={uiConfig}
      mode={mode}
      initialData={formInitialData}
      instanceId={fieldId}
      projectId={projectId}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      redirectUrl={redirectUrl}
      queryKey={queryKey}
      transformData={transformData}
      availableEntities={entitiesForForm}
      availableFields={fieldsForForm}
      parentEntityId={entityDefinitionId}
      readOnly={isReadOnly}
    />
  );
}
