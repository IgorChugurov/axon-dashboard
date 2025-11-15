/**
 * Server Actions для работы с проектами
 * 
 * Все мутации (create, update, delete) выполняются через Server Actions
 * для безопасности и валидации на сервере.
 */

"use server";

import {
  createProjectInSupabase,
  updateProjectInSupabase,
  deleteProjectFromSupabase,
} from "@/lib/projects/supabase";
import { revalidatePath } from "next/cache";
import type { CreateProjectData, Project } from "@/lib/projects/types";

/**
 * Создание проекта
 */
export async function createProjectAction(data: CreateProjectData) {
  try {
    console.log("[Server Action] Creating project:", data);

    const project = await createProjectInSupabase(data);

    // Обновляем кеш страницы проектов
    revalidatePath("/projects");

    console.log("[Server Action] Project created:", project.id);

    return {
      success: true,
      data: project,
    };
  } catch (error) {
    console.error("[Server Action] Create project error:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create project",
    };
  }
}

/**
 * Обновление проекта
 */
export async function updateProjectAction(
  id: string,
  data: Partial<Pick<Project, "name" | "description" | "status">>
) {
  try {
    console.log("[Server Action] Updating project:", id, data);

    const project = await updateProjectInSupabase(id, data);

    // Обновляем кеш
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);

    console.log("[Server Action] Project updated:", project.id);

    return {
      success: true,
      data: project,
    };
  } catch (error) {
    console.error("[Server Action] Update project error:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update project",
    };
  }
}

/**
 * Удаление проекта
 */
export async function deleteProjectAction(id: string) {
  try {
    console.log("[Server Action] Deleting project:", id);

    await deleteProjectFromSupabase(id);

    // Обновляем кеш
    revalidatePath("/projects");

    console.log("[Server Action] Project deleted:", id);

    return {
      success: true,
    };
  } catch (error) {
    console.error("[Server Action] Delete project error:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete project",
    };
  }
}


