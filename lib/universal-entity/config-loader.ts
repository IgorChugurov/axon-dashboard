/**
 * Загрузка UI конфигурации из JSON файлов в папке config/
 * Используется для предопределенных конфигов (entity-definitions, fields, projects)
 */

import type { EntityUIConfig } from "./ui-config-types";
import type { Field, EntityDefinition } from "@igorchugurov/public-api-sdk";

function loadConfigFile(configName: string): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(`@/config/${configName}.json`);
  } catch (error) {
    console.error(
      `[Config Loader] Failed to load config from ${configName}.json:`,
      error
    );
    return null;
  }
}

/**
 * Загружает UI конфигурацию из файла в папке config/
 * @param configName - Имя конфига без расширения (например, "entity-definitions", "fields")
 * @returns EntityUIConfig или null если файл не найден
 */
export function loadUIConfigFromFile(
  configName: string
): EntityUIConfig | null {
  const config = loadConfigFile(configName);
  if (!config) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fields: _fields, ...uiConfig } = config;
  return uiConfig as EntityUIConfig;
}

/**
 * Загружает описание полей из конфигурационного файла
 */
export function loadFieldsFromConfig(configName: string): Field[] | null {
  const config = loadConfigFile(configName);
  if (!config || !Array.isArray(config.fields)) {
    return null;
  }

  return config.fields as Field[];
}

/**
 * Загружает entityDefinition из конфигурационного файла
 * @param configName - Имя конфига без расширения
 * @returns Partial<EntityDefinition> или null если не найден
 */
export function loadEntityDefinitionFromConfig(
  configName: string
): Partial<EntityDefinition> | null {
  const config = loadConfigFile(configName);
  if (!config) {
    return null;
  }

  // Извлекаем поля entityDefinition из конфига
  const {
    entityName,
    tableName,
    description,
    type,
    createPermission,
    readPermission,
    updatePermission,
    deletePermission,
  } = config;

  const entityDefinition: Partial<EntityDefinition> = {};

  if (entityName) entityDefinition.name = entityName;
  if (tableName) entityDefinition.tableName = tableName;
  if (description) entityDefinition.description = description;
  if (type) entityDefinition.type = type;
  if (createPermission) entityDefinition.createPermission = createPermission;
  if (readPermission) entityDefinition.readPermission = readPermission;
  if (updatePermission) entityDefinition.updatePermission = updatePermission;
  if (deletePermission) entityDefinition.deletePermission = deletePermission;

  return Object.keys(entityDefinition).length > 0 ? entityDefinition : null;
}
