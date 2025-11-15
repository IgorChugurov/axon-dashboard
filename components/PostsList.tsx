/**
 * Компонент списка постов с фильтрами по автору и тегам
 */

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EntityList } from "./EntityList";
import { Button } from "./ui/button";
import { deletePostAction } from "@/app/posts/actions";
import type { Post } from "@/lib/entities/posts/types";
import type { EntityResponse } from "@/lib/entity-service";

interface PostsListProps {
  initialData: Post[];
  initialPagination?: EntityResponse<Post>["pagination"];
  initialSearch?: string;
}

export function PostsList({
  initialData,
  initialPagination,
  initialSearch = "",
}: PostsListProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  /**
   * Загрузка постов через Browser Client
   */
  const loadPosts = async (
    page: number,
    search: string
  ): Promise<EntityResponse<Post>> => {
    const limit = 10;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("posts")
      .select("*, author:authors(id, name), tags:post_tags(tags(*))", {
        count: "exact",
      })
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,content.ilike.%${search}%,excerpt.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Преобразуем данные (теги из вложенной структуры)
    const posts: Post[] = (data || []).map((post: any) => ({
      ...post,
      author: post.author || null,
      tags: post.tags?.map((t: any) => t.tags).filter(Boolean) || [],
    }));

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  };

  /**
   * Удаление поста
   */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post?")) return;

    startTransition(async () => {
      const result = await deletePostAction(id);
      if (!result.success) {
        alert(`Error: ${result.error}`);
      }
    });
  };

  /**
   * Форматирование даты
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  /**
   * Бейдж статуса
   */
  const getStatusBadge = (status: Post["status"]) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      published: "bg-green-100 text-green-800",
      archived: "bg-yellow-100 text-yellow-800",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded ${colors[status]}`}
      >
        {status}
      </span>
    );
  };

  /**
   * Рендер элемента списка
   */
  const renderPost = (post: Post, onDelete: (id: string) => void) => (
    <div
      key={post.id}
      className="rounded-lg border bg-card p-6 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          {/* Заголовок и статус */}
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{post.title}</h3>
            {getStatusBadge(post.status)}
          </div>

          {/* Отрывок */}
          {post.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {post.excerpt}
            </p>
          )}

          {/* Автор и дата */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {post.author && <span>By {post.author.name}</span>}
            {post.published_at && (
              <span>Published {formatDate(post.published_at)}</span>
            )}
            {!post.published_at && (
              <span>Created {formatDate(post.created_at)}</span>
            )}
          </div>

          {/* Теги */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-1 text-xs rounded"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/posts/${post.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleDelete(post.id);
              onDelete(post.id);
            }}
            disabled={isPending}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <EntityList<Post>
      initialData={initialData}
      initialPagination={initialPagination}
      initialSearch={initialSearch}
      entityName="posts"
      entityPath="/posts"
      renderItem={renderPost}
      onLoadData={loadPosts}
      onCreate={() => router.push("/posts/new")}
      createButtonLabel="Create Post"
      searchPlaceholder="Search posts..."
      emptyMessage="No posts found"
    />
  );
}

