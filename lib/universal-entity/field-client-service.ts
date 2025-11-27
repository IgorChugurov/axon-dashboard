/**
 * Клиентский сервис для работы с fields через Supabase
 * Используется в Client Components для прямого доступа к Supabase из браузера
 */

import { createClient } from "@/lib/supabase/client";
import type { Field } from "./types";

/**
 * Преобразование данных из БД в типы TypeScript
 */
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
    filterableInList: row.filterable_in_list,
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
 * Интерфейс для ответа со списком fields
 */
export interface FieldsResponse {
  data: Field[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

/**
 * Получение списка fields для entity definition с пагинацией и поиском
 * Используется в Client Components для SPA навигации
 */
export async function getFieldsFromClient(
  entityDefinitionId: string,
  params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}
): Promise<FieldsResponse> {
  const supabase = createClient(); // Браузерный клиент

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // Начинаем запрос
  let query = supabase
    .from("field")
    .select("*", { count: "exact" })
    .eq("entity_definition_id", entityDefinitionId);

  // Поиск только по name
  if (params.search) {
    query = query.ilike("name", `%${params.search}%`);
  }

  // Сортировка по display_index
  query = query.order("display_index", { ascending: true });

  // Применяем пагинацию
  query = query.range(offset, offset + limit - 1);

  // Выполняем запрос
  const { data, error, count } = await query;

  if (error) {
    console.error("[Field Client Service] Error:", error);
    throw new Error(`Failed to fetch fields: ${error.message}`);
  }

  // Вычисляем пагинацию
  const total = count || 0;
  const totalPages = Math.ceil(total / limit);
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return {
    data: (data || []).map(transformField),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasPreviousPage,
      hasNextPage,
    },
  };
}

/**
 * Данные для создания field
 */
export interface CreateFieldData {
  entityDefinitionId: string;
  name: string;
  dbType: string;
  type: string;
  label: string;
  placeholder?: string | null;
  description?: string | null;
  forEditPage?: boolean;
  forCreatePage?: boolean;
  required?: boolean;
  requiredText?: string | null;
  forEditPageDisabled?: boolean;
  displayIndex?: number;
  displayInTable?: boolean;
  sectionIndex?: number;
  isOptionTitleField?: boolean;
  searchable?: boolean;
  filterableInList?: boolean;
  relatedEntityDefinitionId?: string | null;
  relationFieldId?: string | null;
  isRelationSource?: boolean;
  selectorRelationId?: string | null;
  defaultStringValue?: string | null;
  defaultNumberValue?: number | null;
  defaultBooleanValue?: boolean | null;
  defaultDateValue?: string | null;
  autoPopulate?: boolean;
  includeInSinglePma?: boolean;
  includeInListPma?: boolean;
  includeInSingleSa?: boolean;
  includeInListSa?: boolean;
}

/**
 * Данные для обновления field
 */
export type UpdateFieldData = Partial<Omit<CreateFieldData, "entityDefinitionId">>;

/**
 * Создание field
 * Используется в Client Components для мутаций
 */
export async function createFieldFromClient(
  data: CreateFieldData
): Promise<Field> {
  const supabase = createClient();

  // Валидация
  if (!data.name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(data.name)) {
    throw new Error(
      "Field name must start with a letter or underscore and contain only letters, numbers, and underscores"
    );
  }

  if (!data.label || data.label.length < 1) {
    throw new Error("Label is required");
  }

  // Создание
  const { data: created, error } = await supabase
    .from("field")
    .insert({
      entity_definition_id: data.entityDefinitionId,
      name: data.name,
      db_type: data.dbType,
      type: data.type,
      label: data.label,
      placeholder: data.placeholder || null,
      description: data.description || null,
      for_edit_page: data.forEditPage ?? true,
      for_create_page: data.forCreatePage ?? true,
      required: data.required ?? false,
      required_text: data.requiredText || null,
      for_edit_page_disabled: data.forEditPageDisabled ?? false,
      display_index: data.displayIndex ?? 0,
      display_in_table: data.displayInTable ?? true,
      section_index: data.sectionIndex ?? 0,
      is_option_title_field: data.isOptionTitleField ?? false,
      searchable: data.searchable ?? false,
      filterable_in_list: data.filterableInList ?? false,
      related_entity_definition_id: data.relatedEntityDefinitionId || null,
      relation_field_id: data.relationFieldId || null,
      is_relation_source: data.isRelationSource ?? false,
      selector_relation_id: data.selectorRelationId || null,
      default_string_value: data.defaultStringValue || null,
      default_number_value: data.defaultNumberValue ?? null,
      default_boolean_value: data.defaultBooleanValue ?? null,
      default_date_value: data.defaultDateValue || null,
      auto_populate: data.autoPopulate ?? false,
      include_in_single_pma: data.includeInSinglePma ?? true,
      include_in_list_pma: data.includeInListPma ?? true,
      include_in_single_sa: data.includeInSingleSa ?? true,
      include_in_list_sa: data.includeInListSa ?? true,
    } as any)
    .select()
    .single();

  if (error) {
    console.error("[Field Client Service] Create error:", error);
    throw new Error(`Failed to create field: ${error.message}`);
  }

  return transformField(created);
}

/**
 * Обновление field
 * Используется в Client Components для мутаций
 */
export async function updateFieldFromClient(
  fieldId: string,
  data: UpdateFieldData
): Promise<Field> {
  const supabase = createClient();

  // Валидация имени (если меняется)
  if (data.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(data.name)) {
    throw new Error(
      "Field name must start with a letter or underscore and contain only letters, numbers, and underscores"
    );
  }

  // Подготовка данных для обновления
  const updatePayload: Record<string, any> = {};

  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.dbType !== undefined) updatePayload.db_type = data.dbType;
  if (data.type !== undefined) updatePayload.type = data.type;
  if (data.label !== undefined) updatePayload.label = data.label;
  if (data.placeholder !== undefined) updatePayload.placeholder = data.placeholder;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.forEditPage !== undefined) updatePayload.for_edit_page = data.forEditPage;
  if (data.forCreatePage !== undefined) updatePayload.for_create_page = data.forCreatePage;
  if (data.required !== undefined) updatePayload.required = data.required;
  if (data.requiredText !== undefined) updatePayload.required_text = data.requiredText;
  if (data.forEditPageDisabled !== undefined)
    updatePayload.for_edit_page_disabled = data.forEditPageDisabled;
  if (data.displayIndex !== undefined) updatePayload.display_index = data.displayIndex;
  if (data.displayInTable !== undefined) updatePayload.display_in_table = data.displayInTable;
  if (data.sectionIndex !== undefined) updatePayload.section_index = data.sectionIndex;
  if (data.isOptionTitleField !== undefined)
    updatePayload.is_option_title_field = data.isOptionTitleField;
  if (data.searchable !== undefined) updatePayload.searchable = data.searchable;
  if (data.filterableInList !== undefined)
    updatePayload.filterable_in_list = data.filterableInList;
  if (data.relatedEntityDefinitionId !== undefined)
    updatePayload.related_entity_definition_id = data.relatedEntityDefinitionId;
  if (data.relationFieldId !== undefined) updatePayload.relation_field_id = data.relationFieldId;
  if (data.isRelationSource !== undefined)
    updatePayload.is_relation_source = data.isRelationSource;
  if (data.selectorRelationId !== undefined)
    updatePayload.selector_relation_id = data.selectorRelationId;
  if (data.defaultStringValue !== undefined)
    updatePayload.default_string_value = data.defaultStringValue;
  if (data.defaultNumberValue !== undefined)
    updatePayload.default_number_value = data.defaultNumberValue;
  if (data.defaultBooleanValue !== undefined)
    updatePayload.default_boolean_value = data.defaultBooleanValue;
  if (data.defaultDateValue !== undefined)
    updatePayload.default_date_value = data.defaultDateValue;
  if (data.autoPopulate !== undefined) updatePayload.auto_populate = data.autoPopulate;
  if (data.includeInSinglePma !== undefined)
    updatePayload.include_in_single_pma = data.includeInSinglePma;
  if (data.includeInListPma !== undefined)
    updatePayload.include_in_list_pma = data.includeInListPma;
  if (data.includeInSingleSa !== undefined)
    updatePayload.include_in_single_sa = data.includeInSingleSa;
  if (data.includeInListSa !== undefined) updatePayload.include_in_list_sa = data.includeInListSa;

  // Обновление
  const { data: updated, error } = await supabase
    .from("field")
    // @ts-expect-error - Dynamic update payload
    .update(updatePayload)
    .eq("id", fieldId)
    .select()
    .single();

  if (error) {
    console.error("[Field Client Service] Update error:", error);
    throw new Error(`Failed to update field: ${error.message}`);
  }

  return transformField(updated);
}

/**
 * Удаление field
 * Используется в Client Components для мутаций
 */
export async function deleteFieldFromClient(fieldId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("field").delete().eq("id", fieldId);

  if (error) {
    console.error("[Field Client Service] Delete error:", error);
    throw new Error(`Failed to delete field: ${error.message}`);
  }
}
