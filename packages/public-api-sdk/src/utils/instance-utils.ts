/**
 * Утилиты для работы с entity instances внутри SDK
 * Копии функций из instance-client-service для изоляции SDK
 */

import type { EntityInstanceWithFields } from "../types/entity-types";

/**
 * Преобразование данных из БД в типы TypeScript
 */
export function transformEntityInstance(row: any): {
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
 * Уплощает экземпляр: убирает data и relations, размещает все поля на верхнем уровне
 */
export function flattenInstance(
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
