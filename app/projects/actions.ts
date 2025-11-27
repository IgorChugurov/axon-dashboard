/**
 * Server Actions для работы с проектами
 */

"use server";

import { projectsService } from "@/lib/entities/projects/service";
import { revalidatePath } from "next/cache";
import type { Project } from "@/lib/entities/projects/types";

export async function createProjectAction(data: Partial<Project>) {
  try {
    const result = await projectsService.create(data);
    revalidatePath("/projects");
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateProjectAction(id: string, data: Partial<Project>) {
  try {
    const result = await projectsService.update(id, data);
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deleteProjectAction(id: string) {
  try {
    await projectsService.delete(id);
    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
