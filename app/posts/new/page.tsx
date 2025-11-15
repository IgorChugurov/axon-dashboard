/**
 * Страница создания поста
 */

import { PostForm } from "@/components/forms/PostForm";
import { createPostAction } from "../actions";

export default function NewPostPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Post</h1>
        <p className="text-muted-foreground">Write a new blog post or article</p>
      </div>

      <PostForm onSubmit={createPostAction} />
    </div>
  );
}

