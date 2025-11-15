/**
 * Клиентский компонент для редактирования поста
 */

"use client";

import { PostForm } from "@/components/forms/PostForm";
import { updatePostAction } from "../../actions";
import type { Post } from "@/lib/entities/posts/types";

interface EditPostClientProps {
  post: Post;
}

export function EditPostClient({ post }: EditPostClientProps) {
  const handleSubmit = async (data: Partial<Post>) => {
    return await updatePostAction(post.id, data);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Post</h1>
        <p className="text-muted-foreground">Update post content</p>
      </div>

      <PostForm initialData={post} onSubmit={handleSubmit} isEdit />
    </div>
  );
}

