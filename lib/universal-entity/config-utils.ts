/**
 * Утилиты для работы с конфигурационными файлами
 * Создание EntityDefinition и Fields из JSON конфигов
 */

import type { EntityDefinition, Field } from "./types";
import type { EntityConfigFile } from "./config-file-types";

/**
 * Создает EntityDefinition и Fields из конфига
 * Все данные берутся из JSON конфига, без хардкода
 * 
 * @param projectId - ID проекта
 * @param config - Конфигурация из JSON файла
 * @returns EntityDefinition и массив Fields
 */
export function createEntityDefinitionAndFieldsFromConfig(
  projectId: string,
  config: EntityConfigFile
): {
  entityDefinition: EntityDefinition;
  fields: Field[];
} {
  // Создаем entityDefinition из конфига - все поля из JSON
  const entityDefinition: EntityDefinition = {
    id: `${config.tableName}-form`,
    name: config.entityName,
    description: config.description || null,
    tableName: config.tableName,
    type: config.type || "secondary",
    projectId: projectId,
    createPermission: config.createPermission || "Admin",
    readPermission: config.readPermission || "ALL",
    updatePermission: config.updatePermission || "Admin",
    deletePermission: config.deletePermission || "Admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Преобразуем поля из конфига - добавляем только createdAt/updatedAt
  const fields: Field[] = config.fields.map((field) => ({
    ...field,
    entityDefinitionId: entityDefinition.id,
    dbType: field.dbType as Field["dbType"],
    type: field.type as Field["type"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })) as Field[];

  return { entityDefinition, fields };
}

