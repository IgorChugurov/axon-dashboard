/**
 * Сервис для загрузки конфигурации сущностей и полей
 * Кэширует данные на 5 минут для производительности
 */

import { createClient } from "@/lib/supabase/server";
import type { EntityDefinition, Field } from "@igorchugurov/public-api-sdk";
import { generateUIConfig } from "@/lib/form-generation/utils/generateUIConfig";

// Кэш конфигурации
let cachedConfig: {
  entities: EntityDefinition[];
  fields: Field[];
  loadedAt: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 минут

/**
 * Type guard для проверки структуры данных EntityDefinition из Supabase
 */
function isEntityDefinitionRow(row: unknown): row is Record<string, unknown> {
  return (
    typeof row === "object" &&
    row !== null &&
    "id" in row &&
    "name" in row &&
    "table_name" in row
  );
}

/**
 * Преобразование данных из БД в типы TypeScript
 */
function transformEntityDefinition(row: unknown): EntityDefinition {
  if (!isEntityDefinitionRow(row)) {
    throw new Error("Invalid entity definition row structure");
  }
  return {
    id: asString(row.id),
    name: asString(row.name),
    slug: asString(row.slug),
    description: asStringOrNull(row.description),
    tableName: asString(row.table_name),
    type: row.type as EntityDefinition["type"],
    projectId: asString(row.project_id),
    createPermission:
      row.create_permission as EntityDefinition["createPermission"],
    readPermission: row.read_permission as EntityDefinition["readPermission"],
    updatePermission:
      row.update_permission as EntityDefinition["updatePermission"],
    deletePermission:
      row.delete_permission as EntityDefinition["deletePermission"],
    titleSection0: asStringOrNull(row.title_section_0),
    titleSection1: asStringOrNull(row.title_section_1),
    titleSection2: asStringOrNull(row.title_section_2),
    titleSection3: asStringOrNull(row.title_section_3),
    // UI Configuration
    uiConfig: row.ui_config as EntityDefinition["uiConfig"],
    enablePagination:
      row.enable_pagination === null || row.enable_pagination === undefined
        ? null
        : asBoolean(row.enable_pagination),
    pageSize: asNumberOrNull(row.page_size),
    enableFilters:
      row.enable_filters === null || row.enable_filters === undefined
        ? null
        : asBoolean(row.enable_filters),
    // File upload limits
    maxFileSizeMb: asNumberOrNull(row.max_file_size_mb),
    maxFilesCount: asNumberOrNull(row.max_files_count),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

/**
 * Type guard для проверки структуры данных Field из Supabase
 */
function isFieldRow(row: unknown): row is Record<string, unknown> {
  return (
    typeof row === "object" &&
    row !== null &&
    "id" in row &&
    "name" in row &&
    "db_type" in row &&
    "type" in row
  );
}

/**
 * Вспомогательные функции для безопасного преобразования типов из unknown
 */
function asString(value: unknown): string {
  return String(value ?? "");
}

function asStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function asBoolean(value: unknown): boolean {
  return Boolean(value);
}

function asNumber(value: unknown): number {
  return Number(value ?? 0);
}

function asNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function transformField(row: unknown): Field {
  if (!isFieldRow(row)) {
    throw new Error("Invalid field row structure");
  }
  return {
    id: asString(row.id),
    entityDefinitionId: asString(row.entity_definition_id),
    name: asString(row.name),
    dbType: row.db_type as Field["dbType"],
    type: row.type as Field["type"],
    label: asString(row.label),
    placeholder: asStringOrNull(row.placeholder),
    description: asStringOrNull(row.description),
    forEditPage: asBoolean(row.for_edit_page),
    forCreatePage: asBoolean(row.for_create_page),
    required: asBoolean(row.required),
    requiredText: asStringOrNull(row.required_text),
    forEditPageDisabled: asBoolean(row.for_edit_page_disabled),
    displayIndex: asNumber(row.display_index),
    displayInTable: asBoolean(row.display_in_table),
    sectionIndex:
      row.section_index !== null && row.section_index !== undefined
        ? asNumber(row.section_index)
        : 0,
    isOptionTitleField: asBoolean(row.is_option_title_field),
    searchable: asBoolean(row.searchable),
    filterableInList:
      row.filterable_in_list !== null && row.filterable_in_list !== undefined
        ? asBoolean(row.filterable_in_list)
        : undefined,
    relatedEntityDefinitionId: asStringOrNull(row.related_entity_definition_id),
    relationFieldId: asStringOrNull(row.relation_field_id),
    isRelationSource: asBoolean(row.is_relation_source),
    selectorRelationId: asStringOrNull(row.selector_relation_id),
    relationFieldName: asStringOrNull(row.relation_field_name),
    relationFieldLabel: asStringOrNull(row.relation_field_label),
    defaultStringValue: asStringOrNull(row.default_string_value),
    defaultNumberValue: asNumberOrNull(row.default_number_value),
    defaultBooleanValue:
      row.default_boolean_value !== null &&
      row.default_boolean_value !== undefined
        ? asBoolean(row.default_boolean_value)
        : undefined,
    defaultDateValue: asStringOrNull(row.default_date_value),
    autoPopulate: asBoolean(row.auto_populate),
    includeInSinglePma: asBoolean(row.include_in_single_pma),
    includeInListPma: asBoolean(row.include_in_list_pma),
    includeInSingleSa: asBoolean(row.include_in_single_sa),
    includeInListSa: asBoolean(row.include_in_list_sa),
    foreignKey: asStringOrNull(row.foreign_key),
    foreignKeyValue: asStringOrNull(row.foreign_key_value),
    // File upload configuration
    acceptFileTypes: asStringOrNull(row.accept_file_types),
    maxFileSize: asNumberOrNull(row.max_file_size),
    maxFiles: asNumberOrNull(row.max_files),
    storageBucket: asStringOrNull(row.storage_bucket),
    // Dynamic value field configuration
    typeFieldName: asStringOrNull(row.type_field_name),
    optionsFieldName: asStringOrNull(row.options_field_name),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

/**
 * Получить все сущности проекта
 */
export async function getEntityDefinitions(
  projectId: string,
  forceRefresh = false
): Promise<EntityDefinition[]> {
  // Проверяем кэш
  if (!forceRefresh && cachedConfig) {
    const age = Date.now() - cachedConfig.loadedAt;
    if (age < CACHE_TTL) {
      return cachedConfig.entities.filter((e) => e.projectId === projectId);
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entity_definition")
    .select("*")
    .eq("project_id", projectId)
    .order("name");

  if (error) {
    console.error("[Config Service] Error loading entity definitions:", error);
    throw new Error(`Failed to load entity definitions: ${error.message}`);
  }

  const entities = (data || []).map(transformEntityDefinition);

  // Обновляем кэш
  if (!cachedConfig) {
    cachedConfig = {
      entities,
      fields: [],
      loadedAt: Date.now(),
    };
  } else {
    // Обновляем только entities для этого проекта
    cachedConfig.entities = [
      ...cachedConfig.entities.filter((e) => e.projectId !== projectId),
      ...entities,
    ];
    cachedConfig.loadedAt = Date.now();
  }

  return entities;
}

/**
 * Получить поля сущности (или все поля если entityDefinitionId не указан)
 */
export async function getFields(
  entityDefinitionId?: string,
  forceRefresh = true
): Promise<Field[]> {
  // Проверяем кэш
  if (!forceRefresh && cachedConfig?.fields.length) {
    const age = Date.now() - cachedConfig.loadedAt;
    if (age < CACHE_TTL) {
      if (entityDefinitionId) {
        return cachedConfig.fields.filter(
          (f) => f.entityDefinitionId === entityDefinitionId
        );
      }
      return cachedConfig.fields;
    }
  }

  const supabase = await createClient();
  let query = supabase.from("field").select("*").order("display_index");

  if (entityDefinitionId) {
    query = query.eq("entity_definition_id", entityDefinitionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Config Service] Error loading fields:", error);
    throw new Error(`Failed to load fields: ${error.message}`);
  }

  // Отладка
  // console.log(
  //   "[Config Service] getFields - entityDefinitionId:",
  //   entityDefinitionId
  // );
  // console.log(
  //   "[Config Service] getFields - raw data count:",
  //   data?.length || 0
  // );
  // if (entityDefinitionId && data) {
  //   console.log(
  //     "[Config Service] getFields - data:",
  //     data.map((d: any) => ({
  //       id: d.id,
  //       name: d.name,
  //       entity_definition_id: d.entity_definition_id,
  //     }))
  //   );
  // }

  const fields = (data || []).map(transformField);

  // Обновляем кэш
  if (!cachedConfig) {
    cachedConfig = {
      entities: [],
      fields,
      loadedAt: Date.now(),
    };
  } else {
    if (entityDefinitionId) {
      // Обновляем только поля для этой сущности
      cachedConfig.fields = [
        ...cachedConfig.fields.filter(
          (f) => f.entityDefinitionId !== entityDefinitionId
        ),
        ...fields,
      ];
    } else {
      // Обновляем все поля
      cachedConfig.fields = fields;
    }
    cachedConfig.loadedAt = Date.now();
  }

  return fields;
}

/**
 * Получить полную конфигурацию (entities + fields)
 */
export async function getFullConfig(
  projectId: string,
  forceRefresh = false
): Promise<{ entities: EntityDefinition[]; fields: Field[] }> {
  const [entities, fields] = await Promise.all([
    getEntityDefinitions(projectId, forceRefresh),
    getFields(undefined, forceRefresh),
  ]);

  return { entities, fields };
}

/**
 * Получить entity definition с полями одним запросом (JOIN)
 */
export async function getEntityDefinitionWithFields(
  entityDefinitionId: string
): Promise<{ entityDefinition: EntityDefinition; fields: Field[] } | null> {
  // Проверка на валидный UUID формат
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(entityDefinitionId)) {
    // Невалидный UUID - возвращаем null (будет 404)
    return null;
  }

  // Сначала проверяем кэш
  if (cachedConfig) {
    const age = Date.now() - cachedConfig.loadedAt;
    if (age < CACHE_TTL) {
      const entityDefinition = cachedConfig.entities.find(
        (e) => e.id === entityDefinitionId
      );
      if (entityDefinition) {
        const fields = cachedConfig.fields.filter(
          (f) => f.entityDefinitionId === entityDefinitionId
        );
        return { entityDefinition, fields };
      }
    }
  }

  // Если нет в кэше - загружаем через JOIN
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entity_definition")
    .select(
      `
      *,
      field!field_entity_definition_id_fkey (*)
    `
    )
    .eq("id", entityDefinitionId)
    .single();

  if (error) {
    // PGRST116 = Row not found, 22P02 = Invalid UUID format
    if (error.code === "PGRST116" || error.code === "22P02") {
      return null;
    }
    console.error(
      "[Config Service] Error loading entity definition with fields:",
      error
    );
    throw new Error(
      `Failed to load entity definition with fields: ${error.message}`
    );
  }

  if (!data) return null;

  // Преобразуем данные
  const entityDefinition = transformEntityDefinition(data);
  const fields = ((data as any).field || []).map(transformField);

  // Обновляем кэш
  if (!cachedConfig) {
    cachedConfig = {
      entities: [entityDefinition],
      fields: fields,
      loadedAt: Date.now(),
    };
  } else {
    // Обновляем или добавляем entity в кэш
    const existingIndex = cachedConfig.entities.findIndex(
      (e) => e.id === entityDefinitionId
    );
    if (existingIndex >= 0) {
      cachedConfig.entities[existingIndex] = entityDefinition;
    } else {
      cachedConfig.entities.push(entityDefinition);
    }

    // Обновляем поля для этой сущности
    cachedConfig.fields = [
      ...cachedConfig.fields.filter(
        (f) => f.entityDefinitionId !== entityDefinitionId
      ),
      ...fields,
    ];
    cachedConfig.loadedAt = Date.now();
  }

  return { entityDefinition, fields };
}

/**
 * Получить сущность по ID
 */
export async function getEntityDefinitionById(
  id: string
): Promise<EntityDefinition | null> {
  // Проверка на валидный UUID формат
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    // Невалидный UUID - возвращаем null (будет 404)
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entity_definition")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    // PGRST116 = Row not found, 22P02 = Invalid UUID format
    if (error.code === "PGRST116" || error.code === "22P02") {
      return null;
    }
    console.error("[Config Service] Error loading entity definition:", error);
    throw new Error(`Failed to load entity definition: ${error.message}`);
  }

  return data ? transformEntityDefinition(data) : null;
}

/**
 * Получить поле по ID
 */
export async function getFieldById(id: string): Promise<Field | null> {
  // Проверка на валидный UUID формат
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    // Невалидный UUID - возвращаем null (будет 404)
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("field")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    // PGRST116 = Row not found, 22P02 = Invalid UUID format
    if (error.code === "PGRST116" || error.code === "22P02") {
      return null;
    }
    console.error("[Config Service] Error loading field:", error);
    throw new Error(`Failed to load field: ${error.message}`);
  }

  return data ? transformField(data) : null;
}

/**
 * Очистить кэш (для тестирования или принудительного обновления)
 */
export function clearCache(): void {
  cachedConfig = null;
}

/**
 * Получить entity definition с полями и сгенерированным UI конфигом
 * Это основная функция для использования на страницах списков
 */
export async function getEntityDefinitionWithUIConfig(
  entityDefinitionId: string
): Promise<{
  entityDefinition: EntityDefinition;
  fields: Field[];
  uiConfig: import("./ui-config-types").EntityUIConfig;
} | null> {
  // Получаем entity definition и fields
  const result = await getEntityDefinitionWithFields(entityDefinitionId);

  if (!result) return null;

  // Генерируем UI конфиг с defaults + merge с custom конфигом
  const uiConfig = generateUIConfig(result.entityDefinition, result.fields);

  return {
    ...result,
    uiConfig,
  };
}
