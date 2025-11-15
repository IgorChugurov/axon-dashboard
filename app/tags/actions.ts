/**
 * Server Actions для работы с тегами
 */

"use server";

import { tagsService } from "@/lib/entities/tags/service";
import { revalidatePath } from "next/cache";
import type { Tag } from "@/lib/entities/tags/types";

export async function createTagAction(data: Partial<Tag>) {
  try {
    const result = await tagsService.create(data);
    revalidatePath("/tags");
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateTagAction(id: string, data: Partial<Tag>) {
  try {
    const result = await tagsService.update(id, data);
    revalidatePath("/tags");
    revalidatePath(`/tags/${id}`);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deleteTagAction(id: string) {
  try {
    await tagsService.delete(id);
    revalidatePath("/tags");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
