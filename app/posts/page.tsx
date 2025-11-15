/**
 * Страница списка постов (SSR)
 * Поддерживает фильтрацию по автору и тегам
 */

import { postsService, parsePostFilters } from "@/lib/entities/posts/service";
import { PostsList } from "@/components/PostsList";

interface PostsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    author_id?: string;
    tags?: string;
    tags_mode?: "or" | "and";
    status?: "draft" | "published" | "archived";
  }>;
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";

  // Парсим фильтры (автор, теги, статус)
  const filters = parsePostFilters(params);

  // SSR: Получаем посты на сервере
  const { data: posts, pagination } = await postsService.getAll({
    page,
    search,
    limit: 10,
    filters,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Posts</h1>
        <p className="text-muted-foreground">
          Manage blog posts and articles
        </p>
      </div>

      <PostsList
        initialData={posts}
        initialPagination={pagination}
        initialSearch={search}
      />
    </div>
  );
}

