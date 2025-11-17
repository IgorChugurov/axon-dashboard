"use server";

/**
 * Server Actions для управления EntityDefinition
 * С проверкой прав доступа (только админы)
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import {
  createEntityDefinition,
  updateEntityDefinition,
  deleteEntityDefinition,
  type CreateEntityDefinitionData,
  type UpdateEntityDefinitionData,
} from "@/lib/universal-entity/entity-definition-service";
import type { EntityDefinition } from "@/lib/universal-entity/types";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; details?: string };

/**
 * Создать новый EntityDefinition
 */
export async function createEntityDefinitionAction(
  projectId: string,
  data: Omit<CreateEntityDefinitionData, "projectId">
): Promise<ActionResult<EntityDefinition>> {
  try {
    // Проверка прав доступа
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Authentication required",
        details: "You must be logged in to create entity definitions",
      };
    }

    const isAdminUser = await isAdmin(user.id);
    if (!isAdminUser) {
      return {
        success: false,
        error: "Permission denied",
        details: "Only administrators can create entity definitions",
      };
    }

    // Создание
    const entityDefinition = await createEntityDefinition({
      ...data,
      projectId,
    });

    // Обновляем кэш
    revalidatePath(`/${projectId}`);

    return {
      success: true,
      data: entityDefinition,
    };
  } catch (error) {
    console.error("[Actions] Create entity definition error:", error);
    return {
      success: false,
      error: "Failed to create entity definition",
      details:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Обновить EntityDefinition
 */
export async function updateEntityDefinitionAction(
  projectId: string,
  entityDefinitionId: string,
  data: UpdateEntityDefinitionData
): Promise<ActionResult<EntityDefinition>> {
  try {
    // Проверка прав доступа
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Authentication required",
        details: "You must be logged in to update entity definitions",
      };
    }

    const isAdminUser = await isAdmin(user.id);
    if (!isAdminUser) {
      return {
        success: false,
        error: "Permission denied",
        details: "Only administrators can update entity definitions",
      };
    }

    // Обновление
    const entityDefinition = await updateEntityDefinition(
      entityDefinitionId,
      data
    );

    // Обновляем кэш
    revalidatePath(`/${projectId}`);
    revalidatePath(`/${projectId}/entity-definition/${entityDefinitionId}/edit`);
    revalidatePath(`/${projectId}/entity-definition/${entityDefinitionId}/fields`);

    return {
      success: true,
      data: entityDefinition,
    };
  } catch (error) {
    console.error("[Actions] Update entity definition error:", error);
    return {
      success: false,
      error: "Failed to update entity definition",
      details:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Удалить EntityDefinition
 */
export async function deleteEntityDefinitionAction(
  projectId: string,
  entityDefinitionId: string
): Promise<ActionResult<void>> {
  try {
    // Проверка прав доступа
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Authentication required",
        details: "You must be logged in to delete entity definitions",
      };
    }

    const isAdminUser = await isAdmin(user.id);
    if (!isAdminUser) {
      return {
        success: false,
        error: "Permission denied",
        details: "Only administrators can delete entity definitions",
      };
    }

    // Удаление
    await deleteEntityDefinition(entityDefinitionId);

    // Обновляем кэш
    revalidatePath(`/${projectId}`);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("[Actions] Delete entity definition error:", error);
    return {
      success: false,
      error: "Failed to delete entity definition",
      details:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

