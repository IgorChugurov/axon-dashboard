/**
 * Server Actions для работы с авторами
 */

"use server";

import { authorsService } from "@/lib/entities/authors/service";
import { revalidatePath } from "next/cache";
import type { Author } from "@/lib/entities/authors/types";

export async function createAuthorAction(data: Partial<Author>) {
  try {
    const result = await authorsService.create(data);
    revalidatePath("/authors");
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateAuthorAction(id: string, data: Partial<Author>) {
  try {
    const result = await authorsService.update(id, data);
    revalidatePath("/authors");
    revalidatePath(`/authors/${id}`);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deleteAuthorAction(id: string) {
  try {
    await authorsService.delete(id);
    revalidatePath("/authors");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
