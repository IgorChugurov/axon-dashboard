/**
 * Компонент списка авторов
 */

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EntityList } from "./EntityList";
import { Button } from "./ui/button";
import { deleteAuthorAction } from "@/app/authors/actions";
import type { Author } from "@/lib/entities/authors/types";
import type { EntityResponse } from "@/lib/entity-service";

interface AuthorsListProps {
  initialData: Author[];
  initialPagination?: EntityResponse<Author>["pagination"];
  initialSearch?: string;
}

export function AuthorsList({
  initialData,
  initialPagination,
  initialSearch = "",
}: AuthorsListProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  /**
   * Загрузка авторов через Browser Client
   */
  const loadAuthors = async (
    page: number,
    search: string
  ): Promise<EntityResponse<Author>> => {
    const limit = 10;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("authors")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order("name", { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: (data as Author[]) || [],
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
   * Удаление автора
   */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this author?")) return;

    startTransition(async () => {
      const result = await deleteAuthorAction(id);
      if (!result.success) {
        alert(`Error: ${result.error}`);
      }
    });
  };

  /**
   * Рендер элемента списка
   */
  const renderAuthor = (author: Author, onDelete: (id: string) => void) => (
    <div
      key={author.id}
      className="rounded-lg border bg-card p-6 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <h3 className="font-semibold">{author.name}</h3>
          {author.email && (
            <p className="text-sm text-muted-foreground">{author.email}</p>
          )}
          {author.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {author.bio}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/authors/${author.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleDelete(author.id);
              onDelete(author.id);
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
    <EntityList<Author>
      initialData={initialData}
      initialPagination={initialPagination}
      initialSearch={initialSearch}
      entityName="authors"
      entityPath="/authors"
      renderItem={renderAuthor}
      onLoadData={loadAuthors}
      onCreate={() => router.push("/authors/new")}
      createButtonLabel="Create Author"
      searchPlaceholder="Search authors..."
      emptyMessage="No authors found"
    />
  );
}

