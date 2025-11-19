/**
 * Загрузка UI конфигурации из JSON файлов в папке config/
 * Используется для предопределенных конфигов (entity-definitions, fields, projects)
 */

import type { EntityUIConfig } from "./ui-config-types";

/**
 * Загружает UI конфигурацию из файла в папке config/
 * @param configName - Имя конфига без расширения (например, "entity-definitions", "fields")
 * @returns EntityUIConfig или null если файл не найден
 */
export function loadUIConfigFromFile(
  configName: string
): EntityUIConfig | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require(`@/config/${configName}.json`);
    return config as EntityUIConfig;
  } catch (error) {
    console.error(
      `[Config Loader] Failed to load config from ${configName}.json:`,
      error
    );
    return null;
  }
}

