/**
 * Сервис для загрузки конфигурации сущностей и полей
 * Кэширует данные на 5 минут для производительности
 */

import { createClient } from "@/lib/supabase/server";
import type { EntityDefinition, Field } from "./types";

// Кэш конфигурации
let cachedConfig: {
  entities: EntityDefinition[];
  fields: Field[];
  loadedAt: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 минут

/**
 * Преобразование данных из БД в типы TypeScript
 */
function transformEntityDefinition(row: any): EntityDefinition {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description,
    tableName: row.table_name,
    type: row.type,
    projectId: row.project_id,
    createPermission: row.create_permission,
    readPermission: row.read_permission,
    updatePermission: row.update_permission,
    deletePermission: row.delete_permission,
    titleSection0: row.title_section_0,
    titleSection1: row.title_section_1,
    titleSection2: row.title_section_2,
    titleSection3: row.title_section_3,
    // UI Configuration
    uiConfig: row.ui_config,
    enablePagination: row.enable_pagination,
    pageSize: row.page_size,
    enableFilters: row.enable_filters,
    filterEntityDefinitionIds: row.filter_entity_definition_ids,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformField(row: any): Field {
  return {
    id: row.id,
    entityDefinitionId: row.entity_definition_id,
    name: row.name,
    dbType: row.db_type,
    type: row.type,
    label: row.label,
    placeholder: row.placeholder,
    description: row.description,
    forEditPage: row.for_edit_page,
    forCreatePage: row.for_create_page,
    required: row.required,
    requiredText: row.required_text,
    forEditPageDisabled: row.for_edit_page_disabled,
    displayIndex: row.display_index,
    displayInTable: row.display_in_table,
    sectionIndex: row.section_index ?? 0,
    isOptionTitleField: row.is_option_title_field,
    searchable: row.searchable,
    relatedEntityDefinitionId: row.related_entity_definition_id,
    relationFieldId: row.relation_field_id,
    isRelationSource: row.is_relation_source,
    selectorRelationId: row.selector_relation_id,
    relationFieldName: row.relation_field_name,
    relationFieldLabel: row.relation_field_label,
    defaultStringValue: row.default_string_value,
    defaultNumberValue: row.default_number_value,
    defaultBooleanValue: row.default_boolean_value,
    defaultDateValue: row.default_date_value,
    autoPopulate: row.auto_populate,
    includeInSinglePma: row.include_in_single_pma,
    includeInListPma: row.include_in_list_pma,
    includeInSingleSa: row.include_in_single_sa,
    includeInListSa: row.include_in_list_sa,
    foreignKey: row.foreign_key,
    foreignKeyValue: row.foreign_key_value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
  forceRefresh = false
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
    if (error.code === "PGRST116") {
      // Not found
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entity_definition")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("field")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
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

  // Импортируем функцию генерации UI конфига
  const { generateUIConfig } = await import(
    "@/lib/form-generation/utils/generateUIConfig"
  );

  // Генерируем UI конфиг с defaults + merge с custom конфигом
  const uiConfig = generateUIConfig(result.entityDefinition, result.fields);

  return {
    ...result,
    uiConfig,
  };
}
