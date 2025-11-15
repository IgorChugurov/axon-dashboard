/**
 * Страница списка авторов (SSR)
 */

import { authorsService } from "@/lib/entities/authors/service";
import { AuthorsList } from "@/components/AuthorsList";

interface AuthorsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function AuthorsPage({ searchParams }: AuthorsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";

  // SSR: Получаем авторов на сервере
  const { data: authors, pagination } = await authorsService.getAll({
    page,
    search,
    limit: 10,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Authors</h1>
        <p className="text-muted-foreground">Manage content authors</p>
      </div>

      <AuthorsList
        initialData={authors}
        initialPagination={pagination}
        initialSearch={search}
      />
    </div>
  );
}

