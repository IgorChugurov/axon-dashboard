/**
 * Универсальный компонент для отображения списков сущностей
 * Поддерживает пагинацию, поиск и фильтры
 */

"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EntityResponse } from "@/lib/entity-service";

interface EntityListProps<T extends { id: string }> {
  initialData: T[];
  initialPagination?: EntityResponse<T>["pagination"];
  initialSearch?: string;
  entityName: string; // "projects", "posts", "authors"
  entityPath: string; // "/projects", "/posts", "/authors"
  renderItem: (item: T, onDelete: (id: string) => void) => React.ReactNode;
  onLoadData: (page: number, search: string) => Promise<EntityResponse<T>>;
  onCreate?: () => void;
  createButtonLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export function EntityList<T extends { id: string }>({
  initialData,
  initialPagination,
  initialSearch = "",
  entityName,
  entityPath,
  renderItem,
  onLoadData,
  onCreate,
  createButtonLabel = "Create",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found",
}: EntityListProps<T>) {
  const router = useRouter();

  const [items, setItems] = useState<T[]>(initialData);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();

  /**
   * Загрузка данных (пагинация, поиск)
   */
  const loadData = useCallback(
    async (page: number, search: string) => {
      setLoading(true);

      try {
        const result = await onLoadData(page, search);

        setItems(result.data);
        setPagination(result.pagination);

        // Обновляем URL
        const params = new URLSearchParams();
        if (page > 1) params.set("page", page.toString());
        if (search) params.set("search", search);

        const newUrl = params.toString()
          ? `${entityPath}?${params.toString()}`
          : entityPath;

        router.push(newUrl, { scroll: false });
      } catch (error) {
        console.error(`[${entityName}] Failed to load data:`, error);
      } finally {
        setLoading(false);
      }
    },
    [onLoadData, entityPath, entityName, router]
  );

  /**
   * Обработка пагинации
   */
  const handlePageChange = useCallback(
    (newPage: number) => {
      loadData(newPage, searchTerm);
    },
    [loadData, searchTerm]
  );

  /**
   * Обработка поиска
   */
  const handleSearch = useCallback(() => {
    loadData(1, searchTerm);
  }, [loadData, searchTerm]);

  /**
   * Удаление элемента (оптимистичное обновление)
   */
  const handleDelete = useCallback((id: string) => {
    startTransition(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Поиск и создание */}
      <div className="flex gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            disabled={loading}
          />
          <Button onClick={handleSearch} disabled={loading}>
            Search
          </Button>
        </div>
        {onCreate && (
          <Button onClick={onCreate} disabled={isPending}>
            {createButtonLabel}
          </Button>
        )}
      </div>

      {/* Список элементов */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            {searchTerm ? emptyMessage : `No ${entityName} yet`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => renderItem(item, handleDelete))}
        </div>
      )}

      {/* Пагинация */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total}{" "}
            total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPreviousPage || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

