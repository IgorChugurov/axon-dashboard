"use server";

/**
 * Server Actions для работы с environments
 * Используются в формах для лучшей обработки ошибок
 */

import { revalidatePath } from "next/cache";
import {
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  getEnvironments,
} from "@/lib/environments/service";
import type {
  Environment,
  CreateEnvironmentData,
  UpdateEnvironmentData,
} from "@/lib/environments/types";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; details?: string };

/**
 * Создать новый environment
 */
export async function createEnvironmentAction(
  projectId: string,
  data: CreateEnvironmentData
): Promise<ActionResult<Environment>> {
  try {
    const environment = await createEnvironment(projectId, data);

    // Обновляем кэш
    revalidatePath(`/projects/${projectId}/settings`);

    return {
      success: true,
      data: environment,
    };
  } catch (error) {
    console.error("[Environment Actions] Create error:", error);
    return {
      success: false,
      error: "Failed to create environment",
      details:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Обновить environment
 */
export async function updateEnvironmentAction(
  projectId: string,
  environmentId: string,
  data: UpdateEnvironmentData
): Promise<ActionResult<Environment>> {
  try {
    const environment = await updateEnvironment(environmentId, data);

    // Обновляем кэш
    revalidatePath(`/projects/${projectId}/settings`);
    revalidatePath(
      `/projects/${projectId}/settings/environment/${environmentId}`
    );

    return {
      success: true,
      data: environment,
    };
  } catch (error) {
    console.error("[Environment Actions] Update error:", error);
    return {
      success: false,
      error: "Failed to update environment",
      details:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Удалить environment
 */
export async function deleteEnvironmentAction(
  projectId: string,
  environmentId: string
): Promise<ActionResult<void>> {
  try {
    await deleteEnvironment(environmentId);

    // Обновляем кэш
    revalidatePath(`/projects/${projectId}/settings`);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("[Environment Actions] Delete error:", error);
    return {
      success: false,
      error: "Failed to delete environment",
      details:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function listEnvironmentsAction(
  projectId: string,
  params: { page?: number; limit?: number; search?: string }
): Promise<
  ActionResult<{
    data: Environment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }>
> {
  try {
    const result = await getEnvironments(projectId, {
      page: params.page,
      limit: params.limit,
      search: params.search,
    });

    return {
      success: true,
      data: {
        data: result.data,
        pagination: result.pagination || {
          page: params.page || 1,
          limit: params.limit || 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    };
  } catch (error) {
    console.error("[Environment Actions] List error:", error);
    return {
      success: false,
      error: "Failed to fetch environments",
      details:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
