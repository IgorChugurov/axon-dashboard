"use server";

/**
 * Server Actions для управления Fields
 * С проверкой прав доступа (только админы)
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import {
  createField,
  updateField,
  deleteField,
  type CreateFieldData,
  type UpdateFieldData,
} from "@/lib/universal-entity/entity-definition-service";
import type { Field } from "@/lib/universal-entity/types";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; details?: string };

/**
 * Создать новое Field
 */
export async function createFieldAction(
  projectId: string,
  entityDefinitionId: string,
  data: Omit<CreateFieldData, "entityDefinitionId">
): Promise<ActionResult<Field>> {
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
        details: "You must be logged in to create fields",
      };
    }

    const isAdminUser = await isAdmin(user.id);
    if (!isAdminUser) {
      return {
        success: false,
        error: "Permission denied",
        details: "Only administrators can create fields",
      };
    }

    // Создание
    const field = await createField({
      ...data,
      entityDefinitionId,
    });

    // Обновляем кэш (новые URL)
    revalidatePath(`/projects/${projectId}/${entityDefinitionId}/fields`);
    revalidatePath(`/projects/${projectId}/${entityDefinitionId}`);

    return {
      success: true,
      data: field,
    };
  } catch (error) {
    console.error("[Actions] Create field error:", error);
    return {
      success: false,
      error: "Failed to create field",
      details:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Обновить Field
 */
export async function updateFieldAction(
  projectId: string,
  entityDefinitionId: string,
  fieldId: string,
  data: UpdateFieldData
): Promise<ActionResult<Field>> {
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
        details: "You must be logged in to update fields",
      };
    }

    const isAdminUser = await isAdmin(user.id);
    if (!isAdminUser) {
      return {
        success: false,
        error: "Permission denied",
        details: "Only administrators can update fields",
      };
    }

    // Обновление
    const field = await updateField(fieldId, data);

    // Обновляем кэш (новые URL)
    revalidatePath(`/projects/${projectId}/${entityDefinitionId}/fields`);
    revalidatePath(`/projects/${projectId}/${entityDefinitionId}/fields/${fieldId}`);
    revalidatePath(`/projects/${projectId}/${entityDefinitionId}`);

    return {
      success: true,
      data: field,
    };
  } catch (error) {
    console.error("[Actions] Update field error:", error);
    return {
      success: false,
      error: "Failed to update field",
      details:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Удалить Field
 */
export async function deleteFieldAction(
  projectId: string,
  entityDefinitionId: string,
  fieldId: string
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
        details: "You must be logged in to delete fields",
      };
    }

    const isAdminUser = await isAdmin(user.id);
    if (!isAdminUser) {
      return {
        success: false,
        error: "Permission denied",
        details: "Only administrators can delete fields",
      };
    }

    // Удаление
    await deleteField(fieldId);

    // Обновляем кэш (новые URL)
    revalidatePath(`/projects/${projectId}/${entityDefinitionId}/fields`);
    revalidatePath(`/projects/${projectId}/${entityDefinitionId}`);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("[Actions] Delete field error:", error);
    return {
      success: false,
      error: "Failed to delete field",
      details:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

