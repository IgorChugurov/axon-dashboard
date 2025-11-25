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
