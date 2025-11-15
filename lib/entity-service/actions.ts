/**
 * Универсальный генератор Server Actions
 */

import { revalidatePath } from "next/cache";
import type { EntityService } from "./base";
import type { ActionResult } from "./types";

/**
 * Создание набора Server Actions для сущности
 *
 * @param service - Сервис сущности
 * @param entityPath - Путь для revalidation (например, "/posts")
 * @returns Объект с createAction, updateAction, deleteAction
 */
export function createEntityActions<T extends { id: string }>(
  service: EntityService<T>,
  entityPath: string
) {
  /**
   * Server Action для создания записи
   */
  async function createAction(
    data: Partial<T>
  ): Promise<ActionResult<T>> {
    "use server";
    try {
      console.log(`[${entityPath}] Create action:`, data);

      const result = await service.create(data);

      // Обновляем кеш страницы списка
      revalidatePath(entityPath);

      console.log(`[${entityPath}] Create action success:`, result.id);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error(`[${entityPath}] Create action error:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Server Action для обновления записи
   */
  async function updateAction(
    id: string,
    data: Partial<T>
  ): Promise<ActionResult<T>> {
    "use server";
    try {
      console.log(`[${entityPath}] Update action:`, id, data);

      const result = await service.update(id, data);

      // Обновляем кеш страницы списка и детальной страницы
      revalidatePath(entityPath);
      revalidatePath(`${entityPath}/${id}`);

      console.log(`[${entityPath}] Update action success:`, result.id);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error(`[${entityPath}] Update action error:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Server Action для удаления записи
   */
  async function deleteAction(id: string): Promise<ActionResult<void>> {
    "use server";
    try {
      console.log(`[${entityPath}] Delete action:`, id);

      await service.delete(id);

      // Обновляем кеш страницы списка
      revalidatePath(entityPath);

      console.log(`[${entityPath}] Delete action success:`, id);

      return {
        success: true,
      };
    } catch (error) {
      console.error(`[${entityPath}] Delete action error:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  return {
    createAction,
    updateAction,
    deleteAction,
  };
}

