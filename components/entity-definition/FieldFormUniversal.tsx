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
import type {
  EntityDefinition,
  Field,
  FieldValue,
} from "@igorchugurov/public-api-sdk";
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
  const formInitialData: Record<string, FieldValue> = useMemo(() => {
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
    return (
      formData: Record<string, FieldValue>
    ): Record<string, FieldValue> => {
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
  const handleCreate = async (
    data: Record<string, FieldValue>
  ): Promise<Field> => {
    return createFieldFromClient({
      entityDefinitionId,
      name: typeof data.name === "string" ? data.name : String(data.name ?? ""),
      dbType:
        typeof data.dbType === "string"
          ? data.dbType
          : String(data.dbType ?? "varchar"),
      type:
        typeof data.type === "string" ? data.type : String(data.type ?? "text"),
      label:
        typeof data.label === "string" ? data.label : String(data.label ?? ""),
      placeholder:
        typeof data.placeholder === "string" || data.placeholder === null
          ? data.placeholder
          : null,
      description:
        typeof data.description === "string" || data.description === null
          ? data.description
          : null,
      forEditPage:
        typeof data.forEditPage === "boolean"
          ? data.forEditPage
          : Boolean(data.forEditPage),
      forCreatePage:
        typeof data.forCreatePage === "boolean"
          ? data.forCreatePage
          : Boolean(data.forCreatePage),
      required:
        typeof data.required === "boolean"
          ? data.required
          : Boolean(data.required),
      requiredText:
        typeof data.requiredText === "string" || data.requiredText === null
          ? data.requiredText
          : null,
      forEditPageDisabled:
        typeof data.forEditPageDisabled === "boolean"
          ? data.forEditPageDisabled
          : Boolean(data.forEditPageDisabled),
      displayIndex:
        typeof data.displayIndex === "number"
          ? data.displayIndex
          : Number(data.displayIndex ?? 0),
      displayInTable:
        typeof data.displayInTable === "boolean"
          ? data.displayInTable
          : Boolean(data.displayInTable),
      sectionIndex:
        typeof data.sectionIndex === "number"
          ? data.sectionIndex
          : Number(data.sectionIndex ?? 0),
      isOptionTitleField:
        typeof data.isOptionTitleField === "boolean"
          ? data.isOptionTitleField
          : Boolean(data.isOptionTitleField),
      searchable:
        typeof data.searchable === "boolean"
          ? data.searchable
          : Boolean(data.searchable),
      filterableInList:
        typeof data.filterableInList === "boolean"
          ? data.filterableInList
          : Boolean(data.filterableInList),
      relatedEntityDefinitionId:
        typeof data.relatedEntityDefinitionId === "string" ||
        data.relatedEntityDefinitionId === null
          ? data.relatedEntityDefinitionId
          : null,
      relationFieldId:
        typeof data.relationFieldId === "string" ||
        data.relationFieldId === null
          ? data.relationFieldId
          : null,
      isRelationSource:
        typeof data.isRelationSource === "boolean"
          ? data.isRelationSource
          : Boolean(data.isRelationSource),
      selectorRelationId:
        typeof data.selectorRelationId === "string" ||
        data.selectorRelationId === null
          ? data.selectorRelationId
          : null,
      // Поля для создания связанного поля (только при создании)
      relationFieldName:
        typeof data.relationFieldName === "string" ||
        data.relationFieldName === null
          ? data.relationFieldName
          : null,
      relationFieldLabel:
        typeof data.relationFieldLabel === "string" ||
        data.relationFieldLabel === null
          ? data.relationFieldLabel
          : null,
      relationFieldRequired:
        typeof data.relationFieldRequired === "boolean"
          ? data.relationFieldRequired
          : Boolean(data.relationFieldRequired ?? false),
      relationFieldRequiredText:
        typeof data.relationFieldRequiredText === "string" ||
        data.relationFieldRequiredText === null
          ? data.relationFieldRequiredText
          : null,
      defaultStringValue:
        typeof data.defaultStringValue === "string" ||
        data.defaultStringValue === null
          ? data.defaultStringValue
          : null,
      defaultNumberValue:
        typeof data.defaultNumberValue === "number" ||
        data.defaultNumberValue === null
          ? data.defaultNumberValue
          : null,
      defaultBooleanValue:
        typeof data.defaultBooleanValue === "boolean" ||
        data.defaultBooleanValue === null
          ? data.defaultBooleanValue
          : null,
      defaultDateValue:
        typeof data.defaultDateValue === "string" ||
        data.defaultDateValue === null
          ? data.defaultDateValue
          : null,
      autoPopulate:
        typeof data.autoPopulate === "boolean"
          ? data.autoPopulate
          : Boolean(data.autoPopulate),
      includeInSinglePma:
        typeof data.includeInSinglePma === "boolean"
          ? data.includeInSinglePma
          : Boolean(data.includeInSinglePma),
      includeInListPma:
        typeof data.includeInListPma === "boolean"
          ? data.includeInListPma
          : Boolean(data.includeInListPma),
      includeInSingleSa:
        typeof data.includeInSingleSa === "boolean"
          ? data.includeInSingleSa
          : Boolean(data.includeInSingleSa),
      includeInListSa:
        typeof data.includeInListSa === "boolean"
          ? data.includeInListSa
          : Boolean(data.includeInListSa),
    });
  };

  // Функция обновления - адаптер для client-service
  const handleUpdate = async (
    id: string,
    data: Record<string, FieldValue>
  ): Promise<Field> => {
    return updateFieldFromClient(id, {
      name: typeof data.name === "string" ? data.name : undefined,
      dbType: typeof data.dbType === "string" ? data.dbType : undefined,
      type: typeof data.type === "string" ? data.type : undefined,
      label: typeof data.label === "string" ? data.label : undefined,
      placeholder:
        typeof data.placeholder === "string" || data.placeholder === null
          ? data.placeholder
          : undefined,
      description:
        typeof data.description === "string" || data.description === null
          ? data.description
          : undefined,
      forEditPage:
        typeof data.forEditPage === "boolean" ? data.forEditPage : undefined,
      forCreatePage:
        typeof data.forCreatePage === "boolean"
          ? data.forCreatePage
          : undefined,
      required: typeof data.required === "boolean" ? data.required : undefined,
      requiredText:
        typeof data.requiredText === "string" || data.requiredText === null
          ? data.requiredText
          : undefined,
      forEditPageDisabled:
        typeof data.forEditPageDisabled === "boolean"
          ? data.forEditPageDisabled
          : undefined,
      displayIndex:
        typeof data.displayIndex === "number" ? data.displayIndex : undefined,
      displayInTable:
        typeof data.displayInTable === "boolean"
          ? data.displayInTable
          : undefined,
      sectionIndex:
        typeof data.sectionIndex === "number" ? data.sectionIndex : undefined,
      isOptionTitleField:
        typeof data.isOptionTitleField === "boolean"
          ? data.isOptionTitleField
          : undefined,
      searchable:
        typeof data.searchable === "boolean" ? data.searchable : undefined,
      filterableInList:
        typeof data.filterableInList === "boolean"
          ? data.filterableInList
          : undefined,
      relatedEntityDefinitionId:
        typeof data.relatedEntityDefinitionId === "string" ||
        data.relatedEntityDefinitionId === null
          ? data.relatedEntityDefinitionId
          : undefined,
      relationFieldId:
        typeof data.relationFieldId === "string" ||
        data.relationFieldId === null
          ? data.relationFieldId
          : undefined,
      isRelationSource:
        typeof data.isRelationSource === "boolean"
          ? data.isRelationSource
          : undefined,
      selectorRelationId:
        typeof data.selectorRelationId === "string" ||
        data.selectorRelationId === null
          ? data.selectorRelationId
          : undefined,
      defaultStringValue:
        typeof data.defaultStringValue === "string" ||
        data.defaultStringValue === null
          ? data.defaultStringValue
          : undefined,
      defaultNumberValue:
        typeof data.defaultNumberValue === "number" ||
        data.defaultNumberValue === null
          ? data.defaultNumberValue
          : undefined,
      defaultBooleanValue:
        typeof data.defaultBooleanValue === "boolean" ||
        data.defaultBooleanValue === null
          ? data.defaultBooleanValue
          : undefined,
      defaultDateValue:
        typeof data.defaultDateValue === "string" ||
        data.defaultDateValue === null
          ? data.defaultDateValue
          : undefined,
      autoPopulate:
        typeof data.autoPopulate === "boolean" ? data.autoPopulate : undefined,
      includeInSinglePma:
        typeof data.includeInSinglePma === "boolean"
          ? data.includeInSinglePma
          : undefined,
      includeInListPma:
        typeof data.includeInListPma === "boolean"
          ? data.includeInListPma
          : undefined,
      includeInSingleSa:
        typeof data.includeInSingleSa === "boolean"
          ? data.includeInSingleSa
          : undefined,
      includeInListSa:
        typeof data.includeInListSa === "boolean"
          ? data.includeInListSa
          : undefined,
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
