/**
 * Projects List Component
 *
 * Гибридный подход:
 * - Получает начальные данные через SSR (initialData)
 * - Использует Browser Client (Supabase) для динамических обновлений
 * - Обновляет URL при изменении параметров (page, search)
 * - Работает без перезагрузки страницы (SPA)
 */

"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Project } from "@/lib/projects/types";
import {
  createProjectAction,
  deleteProjectAction,
} from "@/app/projects/actions";

interface ProjectsListProps {
  initialData: Project[];
  initialPagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  initialSearch?: string;
}

export function ProjectsList({
  initialData,
  initialPagination,
  initialSearch = "",
}: ProjectsListProps) {
  const router = useRouter();
  const supabase = createClient(); // Browser Client для прямых запросов к Supabase

  const [projects, setProjects] = useState<Project[]>(initialData);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();

  /**
   * Загрузка проектов через Browser Client
   *
   * ВАЖНО: Это ПРЯМОЙ запрос к Supabase из браузера!
   * - Browser → Supabase API
   * - Без промежуточного слоя Next.js
   * - Race conditions защищены в Supabase JS SDK
   */
  const loadProjects = useCallback(
    async (page: number, search: string) => {
      setLoading(true);

      try {
        const limit = 10;
        const offset = (page - 1) * limit;

        console.log("[ProjectsList] Loading projects:", {
          page,
          search,
          limit,
        });

        // ПРЯМОЙ запрос к Supabase из браузера
        let query = supabase
          .from("projects")
          .select("*", { count: "exact" })
          .range(offset, offset + limit - 1)
          .order("created_at", { ascending: false });

        // Поиск по имени
        if (search) {
          query = query.ilike("name", `%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          console.error("[ProjectsList] Error loading projects:", error);
          throw error;
        }

        console.log("[ProjectsList] Projects loaded:", {
          count: data?.length,
          total: count,
        });

        // Обновляем состояние
        setProjects((data as Project[]) || []);

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        setPagination({
          page,
          limit,
          total,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        });

        // Обновляем URL (без перезагрузки страницы)
        const params = new URLSearchParams();
        if (page > 1) params.set("page", page.toString());
        if (search) params.set("search", search);

        const newUrl = params.toString()
          ? `/projects?${params.toString()}`
          : "/projects";

        router.push(newUrl, { scroll: false });
      } catch (error) {
        console.error("[ProjectsList] Failed to load projects:", error);
      } finally {
        setLoading(false);
      }
    },
    [supabase, router]
  );

  // Обработка пагинации
  const handlePageChange = useCallback(
    (newPage: number) => {
      loadProjects(newPage, searchTerm);
    },
    [loadProjects, searchTerm]
  );

  // Обработка поиска
  const handleSearch = useCallback(() => {
    loadProjects(1, searchTerm);
  }, [loadProjects, searchTerm]);

  // Создание проекта через Server Action
  const handleCreate = async () => {
    const name = prompt("Enter project name:");
    if (!name) return;

    startTransition(async () => {
      const result = await createProjectAction({ name });

      if (result.success && result.data) {
        // Оптимистичное обновление: добавляем проект локально
        setProjects((prev) => [result.data!, ...prev]);

        // ИЛИ перезагружаем список
        // loadProjects(1, searchTerm);
      } else {
        alert(`Error: ${result.error || "Unknown error"}`);
      }
    });
  };

  // Удаление проекта через Server Action
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;

    startTransition(async () => {
      const result = await deleteProjectAction(id);

      if (result.success) {
        // Оптимистичное обновление: убираем из списка
        setProjects((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Поиск и создание */}
      <div className="flex gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            disabled={loading}
          />
          <Button onClick={handleSearch} disabled={loading}>
            Search
          </Button>
        </div>
        <Button onClick={handleCreate} disabled={isPending}>
          {isPending ? "Creating..." : "Create Project"}
        </Button>
      </div>

      {/* Список проектов */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            {searchTerm ? "No projects found" : "No projects yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-lg border bg-card p-6 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Status: {project.status}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(project.id)}
                  disabled={isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Пагинация */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} (
            {pagination.total} total)
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
