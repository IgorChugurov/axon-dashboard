"use server";

/**
 * Server Actions для работы с экземплярами сущностей
 * Используются в формах для лучшей обработки ошибок
 */

import { revalidatePath } from "next/cache";
import { getEntityDefinitionById } from "@/lib/universal-entity/config-service";
import {
  createInstance,
  updateInstance,
  deleteInstance,
} from "@/lib/universal-entity/instance-service";
import type { EntityInstanceWithFields } from "@/lib/universal-entity/types";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; details?: string };

/**
 * Создать новый экземпляр
 */
export async function createEntityInstance(
  projectId: string,
  entityDefinitionId: string,
  data: Record<string, any>,
  relations?: Record<string, string[]>
): Promise<ActionResult<EntityInstanceWithFields>> {
  try {
    // Проверяем существование сущности
    const entityDefinition = await getEntityDefinitionById(entityDefinitionId);
    if (!entityDefinition) {
      return {
        success: false,
        error: "Entity definition not found",
        details: `Entity with ID ${entityDefinitionId} does not exist`,
      };
    }

    // Создаем экземпляр
    const instance = await createInstance(
      entityDefinitionId,
      projectId,
      data,
      relations
    );

    // Обновляем кэш
    revalidatePath(`/${projectId}/entities/${entityDefinitionId}`);

    return {
      success: true,
      data: instance,
    };
  } catch (error) {
    console.error("[Actions] Create instance error:", error);
    return {
      success: false,
      error: "Failed to create instance",
      details:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Обновить экземпляр
 */
export async function updateEntityInstance(
  projectId: string,
  entityDefinitionId: string,
  instanceId: string,
  data: Record<string, any>,
  relations?: Record<string, string[]>
): Promise<ActionResult<EntityInstanceWithFields>> {
  try {
    // Проверяем существование сущности
    const entityDefinition = await getEntityDefinitionById(entityDefinitionId);
    if (!entityDefinition) {
      return {
        success: false,
        error: "Entity definition not found",
        details: `Entity with ID ${entityDefinitionId} does not exist`,
      };
    }

    // Обновляем экземпляр
    console.log("[Actions] updateEntityInstance - calling updateInstance:");
    console.log("  - instanceId:", instanceId);
    console.log("  - data:", data);
    console.log("  - relations:", relations);

    const instance = await updateInstance(instanceId, data, relations);

    console.log("[Actions] updateEntityInstance - instance updated:");
    console.log("  - updated instance:", {
      id: instance.id,
      keys: Object.keys(instance),
    });

    // Обновляем кэш
    revalidatePath(`/${projectId}/entities/${entityDefinitionId}`);
    revalidatePath(
      `/${projectId}/entities/${entityDefinitionId}/${instanceId}`
    );

    return {
      success: true,
      data: instance,
    };
  } catch (error) {
    console.error("[Actions] Update instance error:", error);
    return {
      success: false,
      error: "Failed to update instance",
      details:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Удалить экземпляр
 */
export async function deleteEntityInstance(
  projectId: string,
  entityDefinitionId: string,
  instanceId: string
): Promise<ActionResult<void>> {
  try {
    // Проверяем существование сущности
    const entityDefinition = await getEntityDefinitionById(entityDefinitionId);
    if (!entityDefinition) {
      return {
        success: false,
        error: "Entity definition not found",
        details: `Entity with ID ${entityDefinitionId} does not exist`,
      };
    }

    // Удаляем экземпляр
    await deleteInstance(instanceId);

    // Обновляем кэш
    revalidatePath(`/${projectId}/entities/${entityDefinitionId}`);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("[Actions] Delete instance error:", error);
    return {
      success: false,
      error: "Failed to delete instance",
      details:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
