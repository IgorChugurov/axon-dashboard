/**
 * Страница редактирования поста
 */

import { postsService } from "@/lib/entities/posts/service";
import { EditPostClient } from "./EditPostClient";
import { notFound } from "next/navigation";

interface EditPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { id } = await params;

  // SSR: Загружаем пост на сервере
  const post = await postsService.getById(id);

  if (!post) {
    notFound();
  }

  return <EditPostClient post={post} />;
}

