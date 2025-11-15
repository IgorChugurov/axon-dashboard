/**
 * Компонент списка тегов
 */

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EntityList } from "./EntityList";
import { Button } from "./ui/button";
import { deleteTagAction } from "@/app/tags/actions";
import type { Tag } from "@/lib/entities/tags/types";
import type { EntityResponse } from "@/lib/entity-service";

interface TagsListProps {
  initialData: Tag[];
  initialPagination?: EntityResponse<Tag>["pagination"];
  initialSearch?: string;
}

export function TagsList({
  initialData,
  initialPagination,
  initialSearch = "",
}: TagsListProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  /**
   * Загрузка тегов через Browser Client
   */
  const loadTags = async (
    page: number,
    search: string
  ): Promise<EntityResponse<Tag>> => {
    const limit = 10;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("tags")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order("name", { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: (data as Tag[]) || [],
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
   * Удаление тега
   */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tag?")) return;

    startTransition(async () => {
      const result = await deleteTagAction(id);
      if (!result.success) {
        alert(`Error: ${result.error}`);
      }
    });
  };

  /**
   * Рендер элемента списка
   */
  const renderTag = (tag: Tag, onDelete: (id: string) => void) => (
    <div
      key={tag.id}
      className="rounded-lg border bg-card p-6 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: tag.color }}
          />
          <div>
            <h3 className="font-semibold">{tag.name}</h3>
            <p className="text-sm text-muted-foreground">{tag.slug}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/tags/${tag.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleDelete(tag.id);
              onDelete(tag.id);
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
    <EntityList<Tag>
      initialData={initialData}
      initialPagination={initialPagination}
      initialSearch={initialSearch}
      entityName="tags"
      entityPath="/tags"
      renderItem={renderTag}
      onLoadData={loadTags}
      onCreate={() => router.push("/tags/new")}
      createButtonLabel="Create Tag"
      searchPlaceholder="Search tags..."
      emptyMessage="No tags found"
    />
  );
}

