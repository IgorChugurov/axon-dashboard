/* eslint-disable */
// @ts-nocheck
/**
 * Сервис для работы с экземплярами сущностей
 * CRUD операции с entity_instance (JSONB подход)
 */
import { createClient } from "@/lib/supabase/server";
import type {
  EntityInstance,
  EntityInstanceWithFields,
  InstanceData,
  RelationsData,
  GetInstancesOptions,
  Field,
  FieldValue,
} from "./types";
import { getFields } from "./config-service";
import { relationService } from "./relation-service";

/**
 * Нормализует значение поля согласно его типу
 */
function normalizeFieldValue(value: unknown, field: Field): FieldValue {
  if (value === null || value === undefined) {
    // Возвращаем значение по умолчанию
    if (
      field.defaultStringValue !== null &&
      field.defaultStringValue !== undefined
    ) {
      return field.defaultStringValue;
    }
    if (
      field.defaultNumberValue !== null &&
      field.defaultNumberValue !== undefined
    ) {
      return field.defaultNumberValue;
    }
    if (
      field.defaultBooleanValue !== null &&
      field.defaultBooleanValue !== undefined
    ) {
      return field.defaultBooleanValue;
    }
    if (
      field.defaultDateValue !== null &&
      field.defaultDateValue !== undefined
    ) {
      return field.defaultDateValue;
    }
    return null;
  }

  // Нормализация по dbType
  switch (field.dbType) {
    case "float":
      const num =
        typeof value === "string" ? parseFloat(value) : (value as number);
      return isNaN(num) ? field.defaultNumberValue ?? 0 : num;

    case "boolean":
      if (typeof value === "string") {
        return value.toLowerCase() === "true" || value === "1";
      }
      return Boolean(value);

    case "varchar":
    case "timestamptz":
      return String(value);

    default:
      return value as FieldValue;
  }
}

/**
 * Тип для экземпляра с отношениями (может включать вложенные экземпляры)
 */
type InstanceWithRelations = EntityInstance & {
  relations?: Record<
    string,
    Array<EntityInstance & { relations?: Record<string, EntityInstance[]> }>
  >;
};

/**
 * Уплощает экземпляр: убирает data и relations, размещает все поля на верхнем уровне
 */
function flattenInstance(
  instance: InstanceWithRelations,
  fields: Field[],
  relationsAsIds: boolean = false
): EntityInstanceWithFields {
  const result: Record<string, any> = {
    id: instance.id,
    entityDefinitionId: instance.entityDefinitionId,
    projectId: instance.projectId,
    createdAt: instance.createdAt,
    updatedAt: instance.updatedAt,
  };

  // 1. Обрабатываем обычные поля из data
  for (const field of fields) {
    const isRelationField =
      field.dbType === "manyToMany" ||
      field.dbType === "manyToOne" ||
      field.dbType === "oneToMany" ||
      field.dbType === "oneToOne";

    if (!isRelationField) {
      // Обычное поле - нормализуем тип
      const value = instance.data[field.name];
      result[field.name] = normalizeFieldValue(value, field);
    }
  }

  // 2. Обрабатываем поля связей из relations
  if (instance.relations) {
    for (const [fieldName, relatedInstances] of Object.entries(
      instance.relations
    )) {
      if (relationsAsIds) {
        // Режим для редактирования - только ID
        result[fieldName] = relatedInstances.map((inst) => inst.id);
      } else {
        // Режим для просмотра - объекты (рекурсивно уплощенные)
        const relationField = fields.find((f) => f.name === fieldName);
        if (relationField && relationField.relatedEntityDefinitionId) {
          // Рекурсивно уплощаем связанные экземпляры
          result[fieldName] = relatedInstances.map((inst) => {
            // Создаем плоский объект для связанного экземпляра
            const flatRelated: Record<string, any> = {
              id: inst.id,
              entityDefinitionId: inst.entityDefinitionId,
              projectId: inst.projectId,
              createdAt: inst.createdAt,
              updatedAt: inst.updatedAt,
            };

            // Добавляем поля из data
            if (inst.data) {
              for (const [key, value] of Object.entries(inst.data)) {
                flatRelated[key] = value;
              }
            }

            // Рекурсивно обрабатываем вложенные relations
            if (inst.relations) {
              for (const [nestedFieldName, nestedInstances] of Object.entries(
                inst.relations
              )) {
                // Для вложенных relations всегда используем объекты (без дальнейшей рекурсии для упрощения)
                flatRelated[nestedFieldName] = nestedInstances.map((nested) => {
                  const flatNested: Record<string, FieldValue> = {
                    id: nested.id,
                    entityDefinitionId: nested.entityDefinitionId,
                    projectId: nested.projectId,
                    createdAt: nested.createdAt,
                    updatedAt: nested.updatedAt,
                  };
                  if (nested.data) {
                    Object.assign(flatNested, nested.data);
                  }
                  return flatNested;
                });
              }
            }

            return flatRelated;
          });
        }
      }
    }
  }

  return result as EntityInstanceWithFields;
}

/**
 * Преобразование данных из БД в типы TypeScript (внутреннее представление)
 */
function transformEntityInstance(row: Record<string, unknown>): EntityInstance {
  return {
    id: row.id as string,
    entityDefinitionId: row.entity_definition_id as string,
    projectId: row.project_id as string,
    data: (row.data as Record<string, FieldValue>) || {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Создать экземпляр сущности
 */
export async function createInstance(
  entityDefinitionId: string,
  projectId: string,
  data: InstanceData,
  relations?: RelationsData
): Promise<EntityInstanceWithFields> {
  const supabase = await createClient();

  // 1. Создаем экземпляр
  const { data: instance, error: instanceError } = await supabase
    .from("entity_instance")
    .insert({
      entity_definition_id: entityDefinitionId,
      project_id: projectId,
      data: data,
    } as never)
    .select()
    .single();

  if (instanceError) {
    console.error("[Instance Service] Create error:", instanceError);
    throw new Error(
      `Failed to create entity instance: ${instanceError.message}`
    );
  }

  const transformedInstance = transformEntityInstance(instance);

  // 2. Создаем связи если есть
  if (relations && Object.keys(relations).length > 0) {
    await relationService.createRelations(
      transformedInstance.id,
      entityDefinitionId,
      relations
    );
  }

  // 3. Возвращаем полный объект
  return getInstanceById(
    transformedInstance.id,
    relations ? Object.keys(relations) : undefined
  );
}

/**
 * Получить экземпляр по ID
 */
export async function getInstanceById(
  instanceId: string,
  includeRelations?: string[],
  options?: { relationsAsIds?: boolean }
): Promise<EntityInstanceWithFields> {
  const supabase = await createClient();

  // 1. Получаем экземпляр
  const { data: instance, error: instanceError } = await supabase
    .from("entity_instance")
    .select("*")
    .eq("id", instanceId)
    .single();

  if (instanceError) {
    if (instanceError.code === "PGRST116") {
      // Not found
      throw new Error(`Entity instance not found: ${instanceId}`);
    }
    console.error("[Instance Service] Get error:", instanceError);
    throw new Error(`Failed to get entity instance: ${instanceError.message}`);
  }

  // Логирование полученного экземпляра
  // console.log("[Instance Service] getInstanceById:");
  // console.log("  - instanceId:", instanceId);
  // console.log("  - includeRelations:", includeRelations);
  // console.log("  - raw instance from DB:", instance);

  const transformedInstance = transformEntityInstance(instance);

  console.log("  - transformed instance:", {
    id: transformedInstance.id,
    entityDefinitionId: transformedInstance.entityDefinitionId,
    projectId: transformedInstance.projectId,
    data: transformedInstance.data,
  });

  // 2. Загружаем связи если нужно
  const relations: Record<string, EntityInstanceWithFields[]> = {};
  if (includeRelations && includeRelations.length > 0) {
    const fields = await getFields(transformedInstance.entityDefinitionId);

    console.log(`[Instance Service] getInstanceById - loading relations:`);
    console.log(`  - includeRelations:`, includeRelations);
    console.log(
      `  - entityDefinitionId:`,
      transformedInstance.entityDefinitionId
    );
    console.log(`  - total fields:`, fields.length);
    console.log(
      `  - relation fields in entity:`,
      fields
        .filter(
          (f) =>
            f.dbType === "manyToMany" ||
            f.dbType === "manyToOne" ||
            f.dbType === "oneToMany" ||
            f.dbType === "oneToOne"
        )
        .map((f) => ({ name: f.name, dbType: f.dbType }))
    );

    for (const relationFieldName of includeRelations) {
      const relationField = fields.find(
        (f) =>
          f.name === relationFieldName &&
          (f.dbType === "manyToMany" ||
            f.dbType === "manyToOne" ||
            f.dbType === "oneToMany" ||
            f.dbType === "oneToOne")
      );

      if (relationField) {
        console.log(`  - found relation field "${relationFieldName}":`, {
          id: relationField.id,
          dbType: relationField.dbType,
        });
        const relatedInstances = await relationService.getRelatedInstances(
          instanceId,
          relationField.id
        );
        relations[relationFieldName] = relatedInstances;
        console.log(
          `  - loaded relation "${relationFieldName}":`,
          relatedInstances.length,
          "instances"
        );
      } else {
        console.warn(
          `  - relation field "${relationFieldName}" not found in entity fields`
        );
        console.warn(
          `  - available field names:`,
          fields.map((f) => f.name)
        );
      }
    }
  }

  // Создаем временный объект с relations для уплощения
  const instanceWithRelations = {
    ...transformedInstance,
    relations: Object.keys(relations).length > 0 ? relations : undefined,
  };

  // Получаем поля для нормализации
  const fields = await getFields(transformedInstance.entityDefinitionId);

  // Уплощаем экземпляр
  const result = flattenInstance(
    instanceWithRelations as InstanceWithRelations,
    fields,
    options?.relationsAsIds ?? false
  );

  console.log("  - flattened instance:", {
    id: result.id,
    keys: Object.keys(result),
  });

  return result;
}

/**
 * Получить список экземпляров
 */
export async function getInstances(
  entityDefinitionId: string,
  projectId: string,
  options?: GetInstancesOptions
): Promise<EntityInstanceWithFields[]> {
  const supabase = await createClient();

  // 1. Получаем экземпляры
  let query = supabase
    .from("entity_instance")
    .select("*")
    .eq("entity_definition_id", entityDefinitionId)
    .eq("project_id", projectId);

  // Применяем фильтры если есть
  if (options?.filters) {
    for (const [fieldName, value] of Object.entries(options.filters)) {
      // Фильтрация по JSONB полю
      if (value !== undefined && value !== null) {
        query = query.eq(`data->>${fieldName}`, value);
      }
    }
  }

  // Сортировка
  const sortBy = options?.sortBy || "created_at";
  const sortOrder = options?.sortOrder || "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  // Пагинация
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset !== undefined) {
    const end = options.offset + (options.limit || 10) - 1;
    query = query.range(options.offset, end);
  }

  const { data: instances, error } = await query;

  if (error) {
    console.error("[Instance Service] Get list error:", error);
    throw new Error(`Failed to get entity instances: ${error.message}`);
  }

  // Логирование полученных экземпляров
  console.log("[Instance Service] getInstances:");
  console.log("  - entityDefinitionId:", entityDefinitionId);
  console.log("  - projectId:", projectId);
  console.log("  - options:", options);
  console.log("  - instances count:", instances?.length || 0);

  // 2. Трансформируем экземпляры
  const transformedInstances = (instances || []).map(transformEntityInstance);

  // 3. Если нужны связи - загружаем batch-запросом
  if (
    options?.includeRelations &&
    options.includeRelations.length > 0 &&
    transformedInstances.length > 0
  ) {
    // Получаем поля связей
    const fields = await getFields(entityDefinitionId);
    const relationFields = options.includeRelations
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
      const { data: allRelations, error: relationsError } = (await supabase
        .from("entity_relation")
        .select("source_instance_id, target_instance_id, relation_field_id")
        .in("source_instance_id", instanceIds)
        .in("relation_field_id", relationFieldIds)) as {
        data:
          | {
              source_instance_id: string;
              target_instance_id: string;
              relation_field_id: string;
            }[]
          | null;
        error: Error | null;
      };

      if (relationsError) {
        console.error(
          "[Instance Service] Get relations error:",
          relationsError
        );
        // Не бросаем ошибку, просто продолжаем без связей
      } else if (allRelations && allRelations.length > 0) {
        // Получаем все уникальные target_instance_id
        const targetInstanceIds = [
          ...new Set(allRelations.map((r) => r.target_instance_id)),
        ];

        // Загружаем все связанные экземпляры одним запросом
        const { data: relatedInstances, error: instancesError } = await supabase
          .from("entity_instance")
          .select("*")
          .in("id", targetInstanceIds);

        if (!instancesError && relatedInstances) {
          // Создаем карту связанных экземпляров
          const relatedInstancesMap = new Map(
            relatedInstances.map((inst) => [
              inst.id,
              transformEntityInstance(inst),
            ])
          );

          // Группируем связи по экземплярам и полям
          const relationsMap = new Map<
            string,
            Record<string, EntityInstance[]>
          >();

          // Инициализируем карту для всех экземпляров
          for (const instance of transformedInstances) {
            relationsMap.set(instance.id, {});
          }

          // Группируем связи
          for (const relation of allRelations) {
            const sourceId = relation.source_instance_id;
            const targetId = relation.target_instance_id;
            const fieldId = relation.relation_field_id;

            const relationField = relationFields.find(
              (rf) => rf.field.id === fieldId
            );
            if (!relationField) continue;

            const instanceRelations = relationsMap.get(sourceId);
            if (instanceRelations) {
              const fieldName = relationField.name;
              if (!instanceRelations[fieldName]) {
                instanceRelations[fieldName] = [];
              }
              const relatedInstance = relatedInstancesMap.get(targetId);
              if (relatedInstance) {
                instanceRelations[fieldName].push(relatedInstance);
              }
            }
          }

          // Добавляем relations к экземплярам и уплощаем
          const result = transformedInstances.map((instance) => {
            const instanceRelations = relationsMap.get(instance.id) || {};
            const instanceWithRelations = {
              ...instance,
              relations:
                Object.keys(instanceRelations).length > 0
                  ? instanceRelations
                  : undefined,
            };
            return flattenInstance(
              instanceWithRelations,
              fields,
              options?.relationsAsIds ?? false
            );
          });

          console.log("[Instance Service] getInstances - final result:");
          console.log("  - result count:", result.length);

          return result;
        }
      }
    }
  }

  // Если связей нет - уплощаем без них
  const fields = await getFields(entityDefinitionId);
  const result = transformedInstances.map((inst) =>
    flattenInstance(inst, fields, options?.relationsAsIds ?? false)
  );

  console.log("[Instance Service] getInstances - final result:");
  console.log("  - result count:", result.length);

  return result;
}

/**
 * Обновить экземпляр
 */
export async function updateInstance(
  instanceId: string,
  data: Partial<InstanceData>,
  relations?: RelationsData
): Promise<EntityInstanceWithFields> {
  const supabase = await createClient();

  console.log("[Instance Service] updateInstance - START:");
  console.log("  - instanceId:", instanceId);
  console.log("  - data to update:", data);
  console.log("  - relations to update:", relations);

  // 1. Получаем текущий экземпляр
  const { data: currentInstance, error: getError } = await supabase
    .from("entity_instance")
    .select("data, entity_definition_id")
    .eq("id", instanceId)
    .single();

  if (getError) {
    console.error("[Instance Service] Get current instance error:", getError);
    throw new Error(`Failed to get current instance: ${getError.message}`);
  }

  // Типизированная структура из БД
  const typedInstance = currentInstance as unknown as {
    data: Record<string, FieldValue>;
    entity_definition_id: string;
  } | null;

  console.log("  - current instance data:", typedInstance?.data);
  console.log("  - entity_definition_id:", typedInstance?.entity_definition_id);

  // 2. Объединяем данные (новые данные перезаписывают старые)
  const updatedData = {
    ...(typedInstance?.data || {}),
    ...data,
  };

  console.log("  - merged data:", updatedData);

  // 3. Обновляем экземпляр
  const { error: updateError } = await supabase
    .from("entity_instance")
    .update({
      data: updatedData,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", instanceId);

  if (updateError) {
    console.error("[Instance Service] Update error:", updateError);
    throw new Error(`Failed to update entity instance: ${updateError.message}`);
  }

  console.log("  - instance data updated successfully");

  // 4. Обновляем связи если есть
  if (relations && Object.keys(relations).length > 0) {
    const entityDefinitionId = typedInstance?.entity_definition_id;
    if (entityDefinitionId) {
      console.log(
        "  - updating relations for entityDefinitionId:",
        entityDefinitionId
      );
      await relationService.updateRelations(
        instanceId,
        entityDefinitionId,
        relations
      );
      console.log("  - relations updated successfully");
    }
  } else {
    console.log("  - no relations to update");
  }

  // 5. Возвращаем обновленный экземпляр
  const relationKeys = relations ? Object.keys(relations) : undefined;
  console.log("  - loading updated instance with relations:", relationKeys);

  const updatedInstance = await getInstanceById(instanceId, relationKeys);

  console.log("[Instance Service] updateInstance - COMPLETE:");
  console.log("  - updated instance:", {
    id: updatedInstance.id,
    data: updatedInstance.data,
    relations: updatedInstance.relations
      ? Object.keys(updatedInstance.relations)
      : [],
  });

  return updatedInstance;
}

/**
 * Удалить экземпляр
 */
export async function deleteInstance(instanceId: string): Promise<void> {
  const supabase = await createClient();

  // Связи удалятся автоматически через ON DELETE CASCADE
  const { error } = await supabase
    .from("entity_instance")
    .delete()
    .eq("id", instanceId);

  if (error) {
    console.error("[Instance Service] Delete error:", error);
    throw new Error(`Failed to delete entity instance: ${error.message}`);
  }
}

/**
 * Экспорт сервиса
 */
export const instanceService = {
  create: createInstance,
  getById: getInstanceById,
  getAll: getInstances,
  update: updateInstance,
  delete: deleteInstance,
};
