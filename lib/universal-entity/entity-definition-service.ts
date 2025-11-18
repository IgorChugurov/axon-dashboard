/**
 * Сервис для управления EntityDefinition и Field
 * CRUD операции с валидацией и проверками безопасности
 */

import { createClient } from "@/lib/supabase/server";
import type { EntityDefinition, Field } from "./types";
import { clearCache } from "./config-service";

// =====================================================
// EntityDefinition CRUD
// =====================================================

export interface CreateEntityDefinitionData {
  name: string;
  url: string;
  description?: string | null;
  tableName: string;
  type: "primary" | "secondary" | "tertiary";
  projectId: string;
  createPermission?: string;
  readPermission?: string;
  updatePermission?: string;
  deletePermission?: string;
  titleSection0?: string | null;
  titleSection1?: string | null;
  titleSection2?: string | null;
  titleSection3?: string | null;
}

export interface UpdateEntityDefinitionData {
  name?: string;
  url?: string;
  description?: string | null;
  type?: "primary" | "secondary" | "tertiary";
  createPermission?: string;
  readPermission?: string;
  updatePermission?: string;
  deletePermission?: string;
  titleSection0?: string | null;
  titleSection1?: string | null;
  titleSection2?: string | null;
  titleSection3?: string | null;
  // tableName нельзя изменить после создания
}

/**
 * Создать новый EntityDefinition
 */
export async function createEntityDefinition(
  data: CreateEntityDefinitionData
): Promise<EntityDefinition> {
  const supabase = await createClient();

  // Валидация
  if (!data.name || data.name.length < 2) {
    throw new Error("Name must be at least 2 characters long");
  }

  if (!data.url || !data.url.startsWith("/api/")) {
    throw new Error("URL must start with /api/");
  }

  if (!data.tableName || !/^[a-z_]+$/.test(data.tableName)) {
    throw new Error(
      "Table name must be lowercase with underscores only (e.g., my_table)"
    );
  }

  // Проверка уникальности name в проекте
  const { data: existingByName } = await supabase
    .from("entity_definition")
    .select("id")
    .eq("project_id", data.projectId)
    .eq("name", data.name)
    .single();

  if (existingByName) {
    throw new Error(
      `Entity with name "${data.name}" already exists in this project`
    );
  }

  // Проверка уникальности url в проекте
  const { data: existingByUrl } = await supabase
    .from("entity_definition")
    .select("id")
    .eq("project_id", data.projectId)
    .eq("url", data.url)
    .single();

  if (existingByUrl) {
    throw new Error(
      `Entity with URL "${data.url}" already exists in this project`
    );
  }

  // Проверка уникальности table_name в проекте
  const { data: existingByTableName } = await supabase
    .from("entity_definition")
    .select("id")
    .eq("project_id", data.projectId)
    .eq("table_name", data.tableName)
    .single();

  if (existingByTableName) {
    throw new Error(
      `Entity with table name "${data.tableName}" already exists in this project`
    );
  }

  // Создание
  const { data: created, error } = await supabase
    .from("entity_definition")
    .insert({
      name: data.name,
      url: data.url,
      description: data.description || null,
      table_name: data.tableName,
      type: data.type,
      project_id: data.projectId,
      create_permission: data.createPermission || "Admin",
      read_permission: data.readPermission || "ALL",
      update_permission: data.updatePermission || "Admin",
      delete_permission: data.deletePermission || "Admin",
      title_section_0: data.titleSection0 || null,
      title_section_1: data.titleSection1 || null,
      title_section_2: data.titleSection2 || null,
      title_section_3: data.titleSection3 || null,
    } as any)
    .select()
    .single();

  if (error) {
    console.error("[EntityDefinitionService] Create error:", error);
    throw new Error(`Failed to create entity definition: ${error.message}`);
  }

  // Очищаем кэш
  clearCache();

  return transformEntityDefinition(created);
}

/**
 * Обновить EntityDefinition
 */
export async function updateEntityDefinition(
  id: string,
  data: UpdateEntityDefinitionData
): Promise<EntityDefinition> {
  const supabase = await createClient();

  // Валидация
  if (data.name && data.name.length < 2) {
    throw new Error("Name must be at least 2 characters long");
  }

  if (data.url && !data.url.startsWith("/api/")) {
    throw new Error("URL must start with /api/");
  }

  // Получаем текущую entity для проверок
  const { data: current, error: fetchError } = await supabase
    .from("entity_definition")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    throw new Error("Entity definition not found");
  }

  const currentRow = current as any;

  // Проверка уникальности name (если изменяется)
  if (data.name && data.name !== currentRow.name) {
    const { data: existingByName } = await supabase
      .from("entity_definition")
      .select("id")
      .eq("project_id", currentRow.project_id)
      .eq("name", data.name)
      .neq("id", id)
      .single();

    if (existingByName) {
      throw new Error(
        `Entity with name "${data.name}" already exists in this project`
      );
    }
  }

  // Проверка уникальности url (если изменяется)
  if (data.url && data.url !== currentRow.url) {
    const { data: existingByUrl } = await supabase
      .from("entity_definition")
      .select("id")
      .eq("project_id", currentRow.project_id)
      .eq("url", data.url)
      .neq("id", id)
      .single();

    if (existingByUrl) {
      throw new Error(
        `Entity with URL "${data.url}" already exists in this project`
      );
    }
  }

  // Обновление
  const updatePayload: any = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.url !== undefined) updatePayload.url = data.url;
  if (data.description !== undefined)
    updatePayload.description = data.description;
  if (data.type !== undefined) updatePayload.type = data.type;
  if (data.createPermission !== undefined)
    updatePayload.create_permission = data.createPermission;
  if (data.readPermission !== undefined)
    updatePayload.read_permission = data.readPermission;
  if (data.updatePermission !== undefined)
    updatePayload.update_permission = data.updatePermission;
  if (data.deletePermission !== undefined)
    updatePayload.delete_permission = data.deletePermission;
  if (data.titleSection0 !== undefined)
    updatePayload.title_section_0 = data.titleSection0;
  if (data.titleSection1 !== undefined)
    updatePayload.title_section_1 = data.titleSection1;
  if (data.titleSection2 !== undefined)
    updatePayload.title_section_2 = data.titleSection2;
  if (data.titleSection3 !== undefined)
    updatePayload.title_section_3 = data.titleSection3;

  const { data: updated, error } = await supabase
    .from("entity_definition")
    // @ts-expect-error - Dynamic update payload
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[EntityDefinitionService] Update error:", error);
    throw new Error(`Failed to update entity definition: ${error.message}`);
  }

  // Очищаем кэш
  clearCache();

  return transformEntityDefinition(updated);
}

/**
 * Удалить EntityDefinition
 * Проверяет наличие instances перед удалением
 */
export async function deleteEntityDefinition(id: string): Promise<void> {
  const supabase = await createClient();

  // Проверяем наличие instances
  const { data: instances, error: instancesError } = await supabase
    .from("entity_instance")
    .select("id")
    .eq("entity_definition_id", id)
    .limit(1);

  if (instancesError) {
    console.error(
      "[EntityDefinitionService] Check instances error:",
      instancesError
    );
    throw new Error("Failed to check for existing instances");
  }

  if (instances && instances.length > 0) {
    throw new Error(
      "Cannot delete entity definition: instances exist. Please delete all instances first."
    );
  }

  // Удаляем (поля удалятся автоматически через CASCADE)
  const { error } = await supabase
    .from("entity_definition")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[EntityDefinitionService] Delete error:", error);
    throw new Error(`Failed to delete entity definition: ${error.message}`);
  }

  // Очищаем кэш
  clearCache();
}

// =====================================================
// Field CRUD
// =====================================================

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
  foreignKey?: string | null;
  foreignKeyValue?: string | null;
}

export type UpdateFieldData = Partial<CreateFieldData>;

/**
 * Создать новое Field
 */
export async function createField(data: CreateFieldData): Promise<Field> {
  const supabase = await createClient();

  // Валидация
  if (!data.name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(data.name)) {
    throw new Error(
      "Field name must start with a letter and contain only letters, numbers, and underscores"
    );
  }

  // Проверка уникальности name в рамках entity
  const { data: existing } = await supabase
    .from("field")
    .select("id")
    .eq("entity_definition_id", data.entityDefinitionId)
    .eq("name", data.name)
    .single();

  if (existing) {
    throw new Error(
      `Field with name "${data.name}" already exists in this entity`
    );
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
      related_entity_definition_id: data.relatedEntityDefinitionId || null,
      relation_field_id: data.relationFieldId || null,
      is_relation_source: data.isRelationSource ?? false,
      selector_relation_id: data.selectorRelationId || null,
      default_string_value: data.defaultStringValue || null,
      default_number_value: data.defaultNumberValue || null,
      default_boolean_value: data.defaultBooleanValue || null,
      default_date_value: data.defaultDateValue || null,
      auto_populate: data.autoPopulate ?? false,
      include_in_single_pma: data.includeInSinglePma ?? true,
      include_in_list_pma: data.includeInListPma ?? true,
      include_in_single_sa: data.includeInSingleSa ?? true,
      include_in_list_sa: data.includeInListSa ?? true,
      foreign_key: data.foreignKey || null,
      foreign_key_value: data.foreignKeyValue || null,
    } as any)
    .select()
    .single();

  if (error) {
    console.error("[EntityDefinitionService] Create field error:", error);
    throw new Error(`Failed to create field: ${error.message}`);
  }

  // Очищаем кэш
  clearCache();

  return transformField(created);
}

/**
 * Обновить Field
 */
export async function updateField(
  id: string,
  data: UpdateFieldData
): Promise<Field> {
  const supabase = await createClient();

  // Валидация имени (если меняется)
  if (data.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(data.name)) {
    throw new Error(
      "Field name must start with a letter and contain only letters, numbers, and underscores"
    );
  }

  // Получаем текущее поле
  const { data: current, error: fetchError } = await supabase
    .from("field")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    throw new Error("Field not found");
  }

  const currentRow = current as any;

  // Проверка уникальности name (если изменяется)
  if (data.name && data.name !== currentRow.name) {
    const { data: existing } = await supabase
      .from("field")
      .select("id")
      .eq("entity_definition_id", currentRow.entity_definition_id)
      .eq("name", data.name)
      .neq("id", id)
      .single();

    if (existing) {
      throw new Error(
        `Field with name "${data.name}" already exists in this entity`
      );
    }
  }

  // Обновление
  const updatePayload: any = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.dbType !== undefined) updatePayload.db_type = data.dbType;
  if (data.type !== undefined) updatePayload.type = data.type;
  if (data.label !== undefined) updatePayload.label = data.label;
  if (data.placeholder !== undefined)
    updatePayload.placeholder = data.placeholder;
  if (data.description !== undefined)
    updatePayload.description = data.description;
  if (data.forEditPage !== undefined)
    updatePayload.for_edit_page = data.forEditPage;
  if (data.forCreatePage !== undefined)
    updatePayload.for_create_page = data.forCreatePage;
  if (data.required !== undefined) updatePayload.required = data.required;
  if (data.requiredText !== undefined)
    updatePayload.required_text = data.requiredText;
  if (data.forEditPageDisabled !== undefined)
    updatePayload.for_edit_page_disabled = data.forEditPageDisabled;
  if (data.displayIndex !== undefined)
    updatePayload.display_index = data.displayIndex;
  if (data.displayInTable !== undefined)
    updatePayload.display_in_table = data.displayInTable;
  if (data.sectionIndex !== undefined)
    updatePayload.section_index = data.sectionIndex;
  if (data.isOptionTitleField !== undefined)
    updatePayload.is_option_title_field = data.isOptionTitleField;
  if (data.searchable !== undefined) updatePayload.searchable = data.searchable;
  if (data.relatedEntityDefinitionId !== undefined)
    updatePayload.related_entity_definition_id = data.relatedEntityDefinitionId;
  if (data.relationFieldId !== undefined)
    updatePayload.relation_field_id = data.relationFieldId;
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
  if (data.autoPopulate !== undefined)
    updatePayload.auto_populate = data.autoPopulate;
  if (data.includeInSinglePma !== undefined)
    updatePayload.include_in_single_pma = data.includeInSinglePma;
  if (data.includeInListPma !== undefined)
    updatePayload.include_in_list_pma = data.includeInListPma;
  if (data.includeInSingleSa !== undefined)
    updatePayload.include_in_single_sa = data.includeInSingleSa;
  if (data.includeInListSa !== undefined)
    updatePayload.include_in_list_sa = data.includeInListSa;
  if (data.foreignKey !== undefined)
    updatePayload.foreign_key = data.foreignKey;
  if (data.foreignKeyValue !== undefined)
    updatePayload.foreign_key_value = data.foreignKeyValue;

  const { data: updated, error } = await supabase
    .from("field")
    // @ts-expect-error - Dynamic update payload
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[EntityDefinitionService] Update field error:", error);
    throw new Error(`Failed to update field: ${error.message}`);
  }

  // Очищаем кэш
  clearCache();

  return transformField(updated);
}

/**
 * Удалить Field
 * Проверяет наличие связей перед удалением
 */
export async function deleteField(id: string): Promise<void> {
  const supabase = await createClient();

  // Проверяем, не используется ли это поле как relation_field_id в других полях
  const { data: referencingFields, error: checkError } = await supabase
    .from("field")
    .select("id, name, entity_definition_id")
    .eq("relation_field_id", id)
    .limit(1);

  if (checkError) {
    console.error(
      "[EntityDefinitionService] Check relations error:",
      checkError
    );
    throw new Error("Failed to check for field relations");
  }

  if (referencingFields && referencingFields.length > 0) {
    throw new Error(
      "Cannot delete field: it is referenced by other fields. Please remove those references first."
    );
  }

  // Проверяем, не используется ли это поле в entity_relation
  const { data: relations, error: relationsError } = await supabase
    .from("entity_relation")
    .select("id")
    .or(`relation_field_id.eq.${id},reverse_field_id.eq.${id}`)
    .limit(1);

  if (relationsError) {
    console.error(
      "[EntityDefinitionService] Check entity relations error:",
      relationsError
    );
    throw new Error("Failed to check for entity relations");
  }

  if (relations && relations.length > 0) {
    throw new Error(
      "Cannot delete field: it is used in entity relations. Please remove those relations first."
    );
  }

  // Удаляем
  const { error } = await supabase.from("field").delete().eq("id", id);

  if (error) {
    console.error("[EntityDefinitionService] Delete field error:", error);
    throw new Error(`Failed to delete field: ${error.message}`);
  }

  // Очищаем кэш
  clearCache();
}

// =====================================================
// Вспомогательные функции трансформации
// =====================================================

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
