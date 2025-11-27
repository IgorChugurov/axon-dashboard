/**
 * Клиентский сервис для работы с entity instances через Supabase
 * Используется в Client Components для прямого доступа к Supabase из браузера
 * Поддерживает загрузку relations
 */

import { createClient } from "@/lib/supabase/client";
import type { EntityInstanceWithFields, Field } from "./types";

/**
 * Преобразование данных из БД в типы TypeScript
 */
function transformEntityInstance(row: any): {
  id: string;
  entityDefinitionId: string;
  projectId: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
} {
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
 * Получение полей сущности (клиентская версия)
 */
async function getFieldsFromClient(
  entityDefinitionId: string
): Promise<Array<{ id: string; name: string; dbType: string }>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("field")
    .select("id, name, db_type")
    .eq("entity_definition_id", entityDefinitionId)
    .order("display_index");

  if (error) {
    console.error("[Entity Instances Client Service] Get fields error:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    dbType: row.db_type,
  }));
}

/**
 * Уплощает экземпляр: убирает data и relations, размещает все поля на верхнем уровне
 */
function flattenInstance(
  instance: {
    id: string;
    entityDefinitionId: string;
    projectId: string;
    data: Record<string, unknown>;
    relations?: Record<string, EntityInstanceWithFields[]>;
    createdAt: string;
    updatedAt: string;
  },
  fields: Array<{ name: string; dbType: string }>,
  relationsAsIds: boolean = false
): EntityInstanceWithFields {
  const result: Record<string, unknown> = {
    id: instance.id,
    entityDefinitionId: instance.entityDefinitionId,
    projectId: instance.projectId,
    createdAt: instance.createdAt,
    updatedAt: instance.updatedAt,
  };

  // Добавляем поля из data
  Object.entries(instance.data || {}).forEach(([key, value]) => {
    result[key] = value;
  });

  // Добавляем relations
  if (instance.relations) {
    Object.entries(instance.relations).forEach(
      ([fieldName, relatedInstances]) => {
        if (relationsAsIds) {
          // Если relationsAsIds = true, сохраняем только ID
          result[fieldName] = relatedInstances.map((inst) => inst.id);
        } else {
          // Иначе сохраняем полные объекты (для manyToMany) или один объект (для manyToOne, oneToOne)
          const field = fields.find((f) => f.name === fieldName);
          if (field?.dbType === "manyToOne" || field?.dbType === "oneToOne") {
            result[fieldName] = relatedInstances[0] || null;
          } else {
            result[fieldName] = relatedInstances;
          }
        }
      }
    );
  }

  return result as EntityInstanceWithFields;
}

/**
 * Интерфейс для ответа со списком экземпляров
 */
export interface EntityInstancesResponse {
  data: EntityInstanceWithFields[];
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
 * Получение списка entity instances для проекта с пагинацией, поиском и фильтрами
 * Используется в Client Components для SPA навигации
 */
export async function getEntityInstancesFromClient(
  entityDefinitionId: string,
  projectId: string,
  params: {
    page?: number;
    limit?: number;
    search?: string;
    filters?: Record<string, string[]>;
    includeRelations?: string[]; // имена полей для загрузки связей
    relationsAsIds?: boolean; // если true, связи как ID, иначе как объекты
  } = {}
): Promise<EntityInstancesResponse> {
  const supabase = createClient(); // Браузерный клиент

  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // Начинаем запрос
  let query = supabase
    .from("entity_instance")
    .select("*", { count: "exact" })
    .eq("entity_definition_id", entityDefinitionId)
    .eq("project_id", projectId);

  // Поиск по полям в JSONB (если указан)
  if (params.search) {
    // Поиск по всем текстовым полям в data JSONB
    // Используем ilike для поиска в JSONB
    query = query.or(`data.ilike.%${params.search}%`);
  }

  // Применяем фильтры
  if (params.filters) {
    Object.entries(params.filters).forEach(([fieldName, values]) => {
      if (values && values.length > 0) {
        // Для множественного выбора используем .in() на JSONB поле
        // Формат: data->>'fieldName' IN (values)
        query = query.or(
          values.map((v) => `data->>${fieldName}.eq.${v}`).join(",")
        );
      }
    });
  }

  // Сортировка по created_at
  query = query.order("created_at", { ascending: false });

  // Применяем пагинацию
  query = query.range(offset, offset + limit - 1);

  // Выполняем запрос
  const { data, error, count } = await query;

  if (error) {
    console.error("[Entity Instances Client Service] Error:", error);
    throw new Error(`Failed to fetch entity instances: ${error.message}`);
  }

  // Трансформируем экземпляры
  const transformedInstances = (data || []).map(transformEntityInstance);

  // Загружаем связи если нужно
  let instancesWithRelations = transformedInstances;
  if (
    params.includeRelations &&
    params.includeRelations.length > 0 &&
    transformedInstances.length > 0
  ) {
    // Получаем поля для определения типов связей
    const fields = await getFieldsFromClient(entityDefinitionId);
    const relationFields = params.includeRelations
      .map((fieldName) => {
        const field = fields.find(
          (f) =>
            f.name === fieldName &&
            (f.dbType === "manyToMany" ||
              f.dbType === "manyToOne" ||
              f.dbType === "oneToMany" ||
              f.dbType === "oneToOne")
        );
        return field ? { name: fieldName, field } : null;
      })
      .filter(
        (f): f is { name: string; field: (typeof fields)[0] } => f !== null
      );

    if (relationFields.length > 0) {
      const instanceIds = transformedInstances.map((inst) => inst.id);
      const relationFieldIds = relationFields.map((rf) => rf.field.id);

      // Загружаем все связи для всех экземпляров одним запросом
      const { data: allRelations, error: relationsError } = await supabase
        .from("entity_relation")
        .select("source_instance_id, target_instance_id, relation_field_id")
        .in("source_instance_id", instanceIds)
        .in("relation_field_id", relationFieldIds);

      if (relationsError) {
        console.error(
          "[Entity Instances Client Service] Get relations error:",
          relationsError
        );
        // Не бросаем ошибку, просто не загружаем связи
      } else {
        // Группируем связи по instanceId и relationFieldId
        const relationsMap = new Map<
          string,
          Record<string, EntityInstanceWithFields[]>
        >();

        if (allRelations && allRelations.length > 0) {
          const relationsData = allRelations as Array<{
            source_instance_id: string;
            target_instance_id: string;
            relation_field_id: string;
          }>;

          const targetInstanceIds = [
            ...new Set(relationsData.map((r) => r.target_instance_id)),
          ];

          // Загружаем целевые экземпляры
          const { data: targetInstances, error: targetError } = await supabase
            .from("entity_instance")
            .select("*")
            .in("id", targetInstanceIds);

          if (!targetError && targetInstances) {
            const targetInstancesMap = new Map(
              (targetInstances as any[]).map((inst) => [
                inst.id,
                transformEntityInstance(inst),
              ])
            );

            // Загружаем поля для всех целевых экземпляров заранее
            const targetEntityDefinitionIds = [
              ...new Set(
                Array.from(targetInstancesMap.values()).map(
                  (inst) => inst.entityDefinitionId
                )
              ),
            ];
            const fieldsMap = new Map<
              string,
              Array<{ name: string; dbType: string }>
            >();
            await Promise.all(
              targetEntityDefinitionIds.map(async (entityDefId) => {
                const fields = await getFieldsFromClient(entityDefId);
                fieldsMap.set(entityDefId, fields);
              })
            );

            // Группируем связи
            relationsData.forEach((relation) => {
              const instanceId = relation.source_instance_id;
              const relationFieldId = relation.relation_field_id;
              const targetInstance = targetInstancesMap.get(
                relation.target_instance_id
              );

              if (targetInstance) {
                const relationField = relationFields.find(
                  (rf) => rf.field.id === relationFieldId
                );
                if (relationField) {
                  if (!relationsMap.has(instanceId)) {
                    relationsMap.set(instanceId, {});
                  }
                  const instanceRelations = relationsMap.get(instanceId)!;
                  if (!instanceRelations[relationField.name]) {
                    instanceRelations[relationField.name] = [];
                  }
                  const targetFields =
                    fieldsMap.get(targetInstance.entityDefinitionId) || [];
                  instanceRelations[relationField.name].push(
                    flattenInstance(
                      targetInstance,
                      targetFields,
                      params.relationsAsIds ?? false
                    )
                  );
                }
              }
            });
          }
        }

        // Добавляем relations к экземплярам
        instancesWithRelations = transformedInstances.map((instance) => {
          const instanceRelations = relationsMap.get(instance.id) || {};
          return {
            ...instance,
            relations:
              Object.keys(instanceRelations).length > 0
                ? instanceRelations
                : undefined,
          };
        });
      }
    }
  }

  // Уплощаем экземпляры
  const fields = await getFieldsFromClient(entityDefinitionId);
  const flattenedInstances = instancesWithRelations.map((inst) =>
    flattenInstance(inst, fields, params.relationsAsIds ?? false)
  );

  // Вычисляем пагинацию
  const total = count || 0;
  const totalPages = Math.ceil(total / limit);
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return {
    data: flattenedInstances,
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
 * Типы данных для создания/обновления
 */
export interface InstanceData {
  [key: string]: unknown;
}

export interface RelationsData {
  [fieldName: string]: string[]; // массив ID связанных экземпляров
}

/**
 * Создание связей для экземпляра (клиентская версия)
 */
async function createRelationsFromClient(
  supabase: ReturnType<typeof createClient>,
  sourceInstanceId: string,
  entityDefinitionId: string,
  relations: RelationsData
): Promise<void> {
  if (Object.keys(relations).length === 0) return;

  // Получаем поля для определения field_id и типов связей
  const fields = await getFieldsFromClient(entityDefinitionId);

  const relationInserts: Array<{
    source_instance_id: string;
    target_instance_id: string;
    relation_field_id: string;
    relation_type: string;
  }> = [];

  for (const [fieldName, targetInstanceIds] of Object.entries(relations)) {
    const field = fields.find(
      (f) =>
        f.name === fieldName &&
        (f.dbType === "manyToMany" ||
          f.dbType === "manyToOne" ||
          f.dbType === "oneToMany" ||
          f.dbType === "oneToOne")
    );

    if (!field) {
      console.warn(
        `[Entity Instances Client Service] Field ${fieldName} not found or not a relation field`
      );
      continue;
    }

    for (const targetInstanceId of targetInstanceIds) {
      if (targetInstanceId) {
        relationInserts.push({
          source_instance_id: sourceInstanceId,
          target_instance_id: targetInstanceId,
          relation_field_id: field.id,
          relation_type: field.dbType,
        });
      }
    }
  }

  if (relationInserts.length > 0) {
    const { error } = await supabase
      .from("entity_relation")
      .insert(relationInserts as any);

    if (error) {
      console.error(
        "[Entity Instances Client Service] Create relations error:",
        error
      );
      throw new Error(`Failed to create relations: ${error.message}`);
    }
  }
}

/**
 * Обновление связей для экземпляра (удаление старых + создание новых)
 */
async function updateRelationsFromClient(
  supabase: ReturnType<typeof createClient>,
  sourceInstanceId: string,
  entityDefinitionId: string,
  relations: RelationsData
): Promise<void> {
  // Получаем поля для определения field_id
  const fields = await getFieldsFromClient(entityDefinitionId);
  const fieldIds = Object.keys(relations)
    .map((fieldName) => {
      const field = fields.find(
        (f) =>
          f.name === fieldName &&
          (f.dbType === "manyToMany" ||
            f.dbType === "manyToOne" ||
            f.dbType === "oneToMany" ||
            f.dbType === "oneToOne")
      );
      return field?.id;
    })
    .filter(Boolean) as string[];

  // Удаляем старые связи для указанных полей
  if (fieldIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("entity_relation")
      .delete()
      .eq("source_instance_id", sourceInstanceId)
      .in("relation_field_id", fieldIds);

    if (deleteError) {
      console.error(
        "[Entity Instances Client Service] Delete old relations error:",
        deleteError
      );
      throw new Error(`Failed to delete old relations: ${deleteError.message}`);
    }
  }

  // Создаем новые связи
  await createRelationsFromClient(
    supabase,
    sourceInstanceId,
    entityDefinitionId,
    relations
  );
}

/**
 * Создание entity instance
 * Используется в Client Components для мутаций
 */
export async function createEntityInstanceFromClient(
  entityDefinitionId: string,
  projectId: string,
  data: InstanceData,
  relations?: RelationsData
): Promise<EntityInstanceWithFields> {
  const supabase = createClient();

  // 1. Создаем экземпляр
  const { data: instance, error: instanceError } = await supabase
    .from("entity_instance")
    .insert({
      entity_definition_id: entityDefinitionId,
      project_id: projectId,
      data: data,
    } as any)
    .select()
    .single();

  if (instanceError) {
    console.error(
      "[Entity Instances Client Service] Create error:",
      instanceError
    );
    throw new Error(
      `Failed to create entity instance: ${instanceError.message}`
    );
  }

  const transformedInstance = transformEntityInstance(instance);

  // 2. Создаем связи если есть
  if (relations && Object.keys(relations).length > 0) {
    await createRelationsFromClient(
      supabase,
      transformedInstance.id,
      entityDefinitionId,
      relations
    );
  }

  // 3. Возвращаем созданный экземпляр
  const fields = await getFieldsFromClient(entityDefinitionId);
  return flattenInstance(transformedInstance, fields, false);
}

/**
 * Обновление entity instance
 * Используется в Client Components для мутаций
 */
export async function updateEntityInstanceFromClient(
  instanceId: string,
  data: InstanceData,
  relations?: RelationsData
): Promise<EntityInstanceWithFields> {
  const supabase = createClient();

  // 1. Получаем текущий экземпляр для merge данных
  const { data: currentInstance, error: getError } = await supabase
    .from("entity_instance")
    .select("data, entity_definition_id, project_id")
    .eq("id", instanceId)
    .single();

  if (getError) {
    console.error(
      "[Entity Instances Client Service] Get current instance error:",
      getError
    );
    throw new Error(`Failed to get current instance: ${getError.message}`);
  }

  const typedInstance = currentInstance as {
    data: Record<string, unknown>;
    entity_definition_id: string;
    project_id: string;
  };

  // 2. Объединяем данные (новые перезаписывают старые)
  const updatedData = {
    ...(typedInstance.data || {}),
    ...data,
  };

  // 3. Обновляем экземпляр
  const { data: updated, error: updateError } = await supabase
    .from("entity_instance")
    // @ts-expect-error - Dynamic JSONB update payload
    .update({
      data: updatedData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", instanceId)
    .select()
    .single();

  if (updateError) {
    console.error(
      "[Entity Instances Client Service] Update error:",
      updateError
    );
    throw new Error(`Failed to update entity instance: ${updateError.message}`);
  }

  // 4. Обновляем связи если есть
  if (relations && Object.keys(relations).length > 0) {
    await updateRelationsFromClient(
      supabase,
      instanceId,
      typedInstance.entity_definition_id,
      relations
    );
  }

  // 5. Возвращаем обновленный экземпляр
  const transformedInstance = transformEntityInstance(updated);
  const fields = await getFieldsFromClient(typedInstance.entity_definition_id);
  return flattenInstance(transformedInstance, fields, false);
}

/**
 * Удаление entity instance
 * Используется в Client Components для мутаций
 */
export async function deleteEntityInstanceFromClient(
  projectId: string,
  instanceId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("entity_instance")
    .delete()
    .eq("id", instanceId)
    .eq("project_id", projectId); // Дополнительная проверка безопасности

  if (error) {
    console.error("[Entity Instances Client Service] Delete error:", error);
    throw new Error(`Failed to delete entity instance: ${error.message}`);
  }
}
