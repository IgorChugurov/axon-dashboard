/**
 * Серверные функции для получения данных
 * Используются в Server Components напрямую, без HTTP слоя
 */

import { getEntityDataFromBackend } from "./handlers";
import { ServerDataParams } from "@/lib/server-data/types";

/**
 * Получение данных сущности для серверных компонентов
 * Прямой вызов без HTTP слоя внутри Next.js
 * Возвращает сырые данные от бэкенда (без форматирования)
 */
export async function getEntityData(
  entity: string,
  params?: ServerDataParams
): Promise<unknown> {
  try {
    console.log(`[Server API] Getting ${entity} data with params:`, params);

    // Получаем сырые данные с бэкенда (без форматирования)
    const backendData = await getEntityDataFromBackend(entity, params);

    console.log(`[Server API] Successfully got ${entity} data`);
    return backendData;
  } catch (error) {
    console.error(`[Server API] Error getting ${entity} data:`, error);
    throw error;
  }
}
