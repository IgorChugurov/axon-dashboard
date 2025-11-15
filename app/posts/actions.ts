/**
 * Server Actions для работы с постами
 */

"use server";

import { postsService } from "@/lib/entities/posts/service";
import { revalidatePath } from "next/cache";
import type { Post } from "@/lib/entities/posts/types";

export async function createPostAction(data: Partial<Post>) {
  try {
    const result = await postsService.create(data);
    revalidatePath("/posts");
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updatePostAction(id: string, data: Partial<Post>) {
  try {
    const result = await postsService.update(id, data);
    revalidatePath("/posts");
    revalidatePath(`/posts/${id}`);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deletePostAction(id: string) {
  try {
    await postsService.delete(id);
    revalidatePath("/posts");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
