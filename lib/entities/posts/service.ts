/**
 * Сервис для работы с постами
 */

import { createEntityService, parseFiltersFromUrl } from "@/lib/entity-service";
import { createClient } from "@/lib/supabase/server";
import type { Post } from "./types";

/**
 * Сервис постов с загрузкой связанных данных (автор + теги)
 */
export const postsService = createEntityService<Post>({
  tableName: "posts",
  searchFields: ["title", "content", "excerpt"],
  defaultSortBy: "created_at",
  defaultSortOrder: "desc",

  hooks: {
    // Автогенерация slug из title
    beforeCreate: async (data) => {
      if (!data.slug && data.title) {
        data.slug = data.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      // Статус по умолчанию
      if (!data.status) {
        data.status = "draft";
      }

      // Если статус published и нет даты публикации - ставим текущую
      if (data.status === "published" && !data.published_at) {
        data.published_at = new Date().toISOString();
      }

      return data;
    },

    // После создания поста - создаем связи с тегами
    afterCreate: async (post) => {
      // @ts-expect-error - tag_ids не в типе Post, но может быть в data
      const tagIds = post.tag_ids;

      if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        await createPostTags(post.id, tagIds);
      }

      return post;
    },

    beforeUpdate: async (id, data) => {
      // Обновляем slug, если изменился title
      if (data.title && !data.slug) {
        data.slug = data.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      // Если меняем статус на published и нет даты - ставим текущую
      if (
        data.status === "published" &&
        !data.published_at &&
        !(await hasPublishedAt(id))
      ) {
        data.published_at = new Date().toISOString();
      }

      return data;
    },

    // После обновления - обновляем связи с тегами
    afterUpdate: async (post) => {
      // @ts-expect-error - tag_ids не в типе Post, но может быть в data
      const tagIds = post.tag_ids;

      if (tagIds && Array.isArray(tagIds)) {
        await updatePostTags(post.id, tagIds);
      }

      return post;
    },

    // После удаления поста - связи удаляются автоматически (ON DELETE CASCADE)
    afterDelete: async (id) => {
      console.log(`[Posts] Post ${id} deleted, tags cascade deleted`);
    },

    // Загружаем связанные данные (автор + теги)
    afterFetch: async (posts) => {
      if (posts.length === 0) return posts;

      const supabase = await createClient();

      // Загружаем все уникальные author_id
      const authorIds = [
        ...new Set(posts.map((p) => p.author_id).filter(Boolean)),
      ] as string[];

      const authorsMap = new Map<string, any>();
      if (authorIds.length > 0) {
        const { data: authors } = await supabase
          .from("authors")
          .select("id, name, email, avatar_url")
          .in("id", authorIds);

        if (authors) {
          (authors as any[]).forEach((author: any) => {
            authorsMap.set(author.id, author);
          });
        }
      }

      // Загружаем теги для всех постов
      const postIds = posts.map((p) => p.id);
      const { data: postTags } = await supabase
        .from("post_tags")
        .select(
          `
          post_id,
          tags (id, name, slug, color)
        `
        )
        .in("post_id", postIds);

      // Группируем теги по post_id
      const tagsMap = new Map<string, any[]>();
      if (postTags) {
        postTags.forEach((pt: any) => {
          if (!tagsMap.has(pt.post_id)) {
            tagsMap.set(pt.post_id, []);
          }
          if (pt.tags) {
            tagsMap.get(pt.post_id)!.push(pt.tags);
          }
        });
      }

      // Присоединяем данные к постам
      return posts.map((post) => ({
        ...post,
        author: post.author_id ? authorsMap.get(post.author_id) || null : null,
        tags: tagsMap.get(post.id) || [],
      }));
    },
  },
});

/**
 * Парсинг фильтров постов из URL
 */
export function parsePostFilters(
  searchParams: Record<string, string | string[] | undefined>
) {
  return parseFiltersFromUrl(searchParams, {
    // Many-to-many: теги
    manyToManyFilters: [
      {
        paramName: "tags",
        joinTable: "post_tags",
        joinColumn: "post_id",
        targetColumn: "tag_id",
        defaultMode: "or",
      },
    ],
    // Relation: автор
    relationFilters: [
      {
        paramName: "author_id",
        field: "author_id",
      },
    ],
    // Simple: статус
    simpleFilters: [
      {
        paramName: "status",
        field: "status",
        operator: "eq",
      },
    ],
  });
}

/**
 * Вспомогательные функции для работы с тегами поста
 */

async function createPostTags(postId: string, tagIds: string[]): Promise<void> {
  const supabase = await createClient();

  const postTags = tagIds.map((tagId) => ({
    post_id: postId,
    tag_id: tagId,
  }));

  await supabase.from("post_tags").insert(postTags as never);
}

async function updatePostTags(
  postId: string,
  tagIds: string[]
): Promise<void> {
  const supabase = await createClient();

  // Удаляем все существующие связи
  await supabase.from("post_tags").delete().eq("post_id", postId);

  // Создаем новые связи
  if (tagIds.length > 0) {
    await createPostTags(postId, tagIds);
  }
}

async function hasPublishedAt(postId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("posts")
    .select("published_at")
    .eq("id", postId)
    .single();

  return !!(data && (data as any).published_at);
}

