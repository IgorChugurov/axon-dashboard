/* eslint-disable */
// @ts-nocheck
/**
 * Сервис для работы со связями между экземплярами сущностей
 */

import { createClient } from "@/lib/supabase/server";
import type {
  EntityInstanceWithFields,
  RelationsData,
  EntityInstance,
} from "./types";
import { getFields, getFieldById } from "./config-service";

/**
 * Создать связи для экземпляра
 */
export async function createRelations(
  sourceInstanceId: string,
  entityDefinitionId: string,
  relations: RelationsData
): Promise<void> {
  const supabase = await createClient();

  console.log("[Relation Service] createRelations - START:");
  console.log("  - sourceInstanceId:", sourceInstanceId);
  console.log("  - entityDefinitionId:", entityDefinitionId);
  console.log("  - relations:", relations);

  // Получаем все поля сущности
  const fields = await getFields(entityDefinitionId);

  const relationInserts: any[] = [];

  for (const [fieldName, targetInstanceIds] of Object.entries(relations)) {
    const field = fields.find(
      (f) => f.name === fieldName && f.entityDefinitionId === entityDefinitionId
    );

    if (
      !field ||
      !["manyToMany", "manyToOne", "oneToMany", "oneToOne"].includes(
        field.dbType
      )
    ) {
      console.warn(
        `[Relation Service] Field ${fieldName} not found or not a relation field`
      );
      continue;
    }

    console.log(`  - processing relation field "${fieldName}":`, {
      fieldId: field.id,
      dbType: field.dbType,
      targetInstanceIds: targetInstanceIds,
    });

    // Получаем обратное поле если есть
    const reverseField = field.relationFieldId
      ? await getFieldById(field.relationFieldId)
      : null;

    // Определяем тип связи
    const relationType = field.dbType as
      | "manyToMany"
      | "manyToOne"
      | "oneToMany"
      | "oneToOne";

    for (const targetInstanceId of targetInstanceIds) {
      relationInserts.push({
        source_instance_id: sourceInstanceId,
        target_instance_id: targetInstanceId,
        relation_field_id: field.id,
        reverse_field_id: reverseField?.id || null,
        relation_type: relationType,
      });
    }
  }

  console.log("  - total relations to insert:", relationInserts.length);
  console.log("  - relation inserts:", relationInserts);

  if (relationInserts.length > 0) {
    const { data, error } = await supabase
      .from("entity_relation")
      .insert(relationInserts as never)
      .select();

    if (error) {
      console.error("[Relation Service] Create relations error:", error);
      throw new Error(`Failed to create relations: ${error.message}`);
    }

    console.log("  - created relations:", data?.length || 0);
    console.log("[Relation Service] createRelations - COMPLETE");
  } else {
    console.log("  - no relations to create");
  }
}

/**
 * Обновить связи (удаление старых + создание новых)
 */
export async function updateRelations(
  sourceInstanceId: string,
  entityDefinitionId: string,
  relations: RelationsData
): Promise<void> {
  const supabase = await createClient();

  console.log("[Relation Service] updateRelations - START:");
  console.log("  - sourceInstanceId:", sourceInstanceId);
  console.log("  - entityDefinitionId:", entityDefinitionId);
  console.log("  - relations data:", relations);

  // Получаем поля для определения field_id
  const fields = await getFields(entityDefinitionId);
  const fieldIds = Object.keys(relations)
    .map((fieldName) => {
      const field = fields.find(
        (f) =>
          f.name === fieldName && f.entityDefinitionId === entityDefinitionId
      );
      return field?.id;
    })
    .filter(Boolean) as string[];

  console.log("  - field IDs to update:", fieldIds);

  // Удаляем старые связи для указанных полей
  if (fieldIds.length > 0) {
    console.log("  - deleting old relations...");
    
    // Сначала получаем количество для логирования
    const { count } = await supabase
      .from("entity_relation")
      .select("*", { count: "exact", head: true })
      .eq("source_instance_id", sourceInstanceId)
      .in("relation_field_id", fieldIds);

    // Затем удаляем
    const { error: deleteError } = await supabase
      .from("entity_relation")
      .delete()
      .eq("source_instance_id", sourceInstanceId)
      .in("relation_field_id", fieldIds);

    if (deleteError) {
      console.error(
        "[Relation Service] Delete old relations error:",
        deleteError
      );
      throw new Error(`Failed to delete old relations: ${deleteError.message}`);
    }

    console.log("  - deleted old relations count:", count || 0);
  }

  // Создаем новые связи
  console.log("  - creating new relations...");
  await createRelations(sourceInstanceId, entityDefinitionId, relations);
  console.log("[Relation Service] updateRelations - COMPLETE");
}

/**
 * Преобразование данных из БД в типы TypeScript
 */
function transformEntityInstance(row: any): EntityInstance {
  return {
    id: row.id,
    entityDefinitionId: row.entity_definition_id,
    projectId: row.project_id,
    data: row.data || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Получить связанные экземпляры
 */
export async function getRelatedInstances(
  sourceInstanceId: string,
  relationFieldId: string
): Promise<EntityInstanceWithFields[]> {
  const supabase = await createClient();

  // Получаем ID связанных экземпляров
  console.log("[Relation Service] getRelatedInstances - querying entity_relation:");
  console.log("  - sourceInstanceId:", sourceInstanceId);
  console.log("  - relationFieldId:", relationFieldId);
  
  const { data: relations, error } = (await supabase
    .from("entity_relation")
    .select("target_instance_id")
    .eq("source_instance_id", sourceInstanceId)
    .eq("relation_field_id", relationFieldId)) as {
    data: { target_instance_id: string }[] | null;
    error: any;
  };

  if (error) {
    console.error("[Relation Service] Get relations error:", error);
    throw new Error(`Failed to get related instances: ${error.message}`);
  }

  console.log("  - relations found in DB:", relations?.length || 0);
  if (relations && relations.length > 0) {
    console.log("  - relation records:", relations);
  } else {
    // Проверяем, есть ли вообще связи для этого экземпляра (для отладки)
    const { data: allRelationsForInstance } = await supabase
      .from("entity_relation")
      .select("source_instance_id, relation_field_id, target_instance_id")
      .eq("source_instance_id", sourceInstanceId);
    console.log("  - all relations for this instance:", allRelationsForInstance?.length || 0);
    if (allRelationsForInstance && allRelationsForInstance.length > 0) {
      console.log("  - all relation records:", allRelationsForInstance);
    }
    
    // Проверяем, есть ли связи с этим полем для других экземпляров (для отладки)
    const { data: allRelationsForField } = await supabase
      .from("entity_relation")
      .select("source_instance_id, relation_field_id, target_instance_id")
      .eq("relation_field_id", relationFieldId)
      .limit(5);
    console.log("  - sample relations with this field:", allRelationsForField?.length || 0);
    if (allRelationsForField && allRelationsForField.length > 0) {
      console.log("  - sample relation records:", allRelationsForField);
    }
  }

  if (!relations || relations.length === 0) {
    return [];
  }

  const targetInstanceIds = relations.map((r) => r.target_instance_id);

  // Загружаем экземпляры напрямую из БД (избегаем циклической зависимости)
  const { data: instances, error: instancesError } = await supabase
    .from("entity_instance")
    .select("*")
    .in("id", targetInstanceIds);

  if (instancesError) {
    console.error("[Relation Service] Get instances error:", instancesError);
    throw new Error(`Failed to get instances: ${instancesError.message}`);
  }

  // Логирование связанных экземпляров
  console.log("[Relation Service] getRelatedInstances:");
  console.log("  - sourceInstanceId:", sourceInstanceId);
  console.log("  - relationFieldId:", relationFieldId);
  console.log("  - targetInstanceIds:", targetInstanceIds);
  console.log("  - related instances count:", instances?.length || 0);
  if (instances && instances.length > 0) {
    console.log("  - related instances:", instances.map((inst: any) => ({
      id: inst.id,
      data: inst.data,
    })));
  }

  return (instances || []).map(
    (instance) => transformEntityInstance(instance) as EntityInstanceWithFields
  );
}

/**
 * Удалить связи
 */
export async function deleteRelations(
  sourceInstanceId: string,
  relationFieldId?: string
): Promise<void> {
  const supabase = await createClient();

  let query = supabase
    .from("entity_relation")
    .delete()
    .eq("source_instance_id", sourceInstanceId);

  if (relationFieldId) {
    query = query.eq("relation_field_id", relationFieldId);
  }

  const { error } = await query;

  if (error) {
    console.error("[Relation Service] Delete relations error:", error);
    throw new Error(`Failed to delete relations: ${error.message}`);
  }
}

/**
 * Экспорт сервиса
 */
export const relationService = {
  createRelations,
  updateRelations,
  getRelatedInstances,
  deleteRelations,
};
