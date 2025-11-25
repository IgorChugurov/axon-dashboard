/**
 * Утилиты для работы с конфигурационными файлами
 * Создание EntityDefinition и Fields из JSON конфигов
 * И обратное преобразование из БД данных в EntityConfigFile
 */

import type { EntityDefinition, Field } from "./types";
import type { EntityConfigFile, FieldFromConfig } from "./config-file-types";
import { generateUIConfig } from "@/lib/form-generation/utils/generateUIConfig";

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
  // Если fields не определен или пустой, возвращаем пустой массив
  const fields: Field[] = (config.fields || []).map((field) => ({
    ...field,
    entityDefinitionId: entityDefinition.id,
    dbType: field.dbType as Field["dbType"],
    type: field.type as Field["type"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })) as Field[];

  return { entityDefinition, fields };
}

/**
 * Создает EntityConfigFile из данных БД (EntityDefinition + Fields)
 * Используется для entity-instances, где конфиг формируется динамически
 *
 * @param entityDefinition - EntityDefinition из БД
 * @param fields - Fields из БД
 * @returns EntityConfigFile для использования в UniversalEntityListClient
 */
export function createEntityConfigFileFromDbData(
  entityDefinition: EntityDefinition,
  fields: Field[]
): EntityConfigFile {
  // Генерируем UI конфиг
  const uiConfig = generateUIConfig(entityDefinition, fields);

  // Преобразуем Fields в FieldFromConfig (убираем createdAt/updatedAt)
  const fieldsFromConfig: FieldFromConfig[] = fields.map((field) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, updatedAt, ...rest } = field;
    return rest as FieldFromConfig;
  });

  // Формируем EntityConfigFile
  const config: EntityConfigFile = {
    // EntityDefinition fields
    entityName: entityDefinition.name,
    tableName: entityDefinition.tableName,
    url: entityDefinition.tableName,
    apiUrl: `/api/entities/${entityDefinition.id}`,
    apiUrlAll: `/api/entity-instances/all`,
    description: entityDefinition.description || undefined,
    type: entityDefinition.type,
    createPermission: entityDefinition.createPermission,
    readPermission: entityDefinition.readPermission,
    updatePermission: entityDefinition.updatePermission,
    deletePermission: entityDefinition.deletePermission,

    // UI Config
    list: uiConfig.list,
    form: uiConfig.form,
    messages: uiConfig.messages,

    // Fields
    fields: fieldsFromConfig,
  };

  return config;
}
