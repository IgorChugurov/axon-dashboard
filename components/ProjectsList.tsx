"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Project, ProjectsResponse } from "@/lib/projects/types";

interface ProjectsListProps {
  initialData: ProjectsResponse;
}

export default function ProjectsList({ initialData }: ProjectsListProps) {
  const [projects, setProjects] = useState<Project[]>(initialData.data || []);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(
    initialData.pagination?.page || 1
  );

  // Функция для получения проектов через API
  const fetchProjects = async (search?: string, page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("currentPage", page.toString());
      params.append("perPage", "16");

      const url = `/api/projects?${params.toString()}`;
      console.log("[ProjectsList] Fetching projects from:", url);
      console.log("[ProjectsList] Client cookies (visible):", document.cookie);

      const response = await fetch(url, {
        credentials: "include", // Важно для отправки httpOnly cookies
      });

      console.log("[ProjectsList] Response status:", response.status);
      console.log("[ProjectsList] Response ok:", response.ok);

      // Обработка ошибки авторизации
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[ProjectsList] 401 Unauthorized error:");
        console.error("[ProjectsList] Response status:", response.status);
        console.error("[ProjectsList] Error data:", errorData);
        console.error(
          "[ProjectsList] Response headers:",
          Object.fromEntries(response.headers.entries())
        );
        // ВРЕМЕННО ОТКЛЮЧЕНО ДЛЯ ОТЛАДКИ
        // window.location.href = "/login";
        setError(
          `401 Unauthorized: ${errorData.error || "Authentication failed"}`
        );
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch projects");
      }

      const data: ProjectsResponse = await response.json();
      console.log("[Client] Received data:", {
        projectsCount: data.data?.length,
        hasPagination: !!data.pagination,
        currentPage: data.pagination?.page,
        totalPages: data.pagination?.totalPages,
      });

      setProjects(data.data || []);
      setPagination(data.pagination);
      setCurrentPage(data.pagination?.page || page);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setProjects([]);
      setPagination(undefined);
    } finally {
      setLoading(false);
    }
  };

  // Обработка поиска
  const handleSearch = () => {
    setCurrentPage(1);
    fetchProjects(searchTerm, 1);
  };

  // Обработка пагинации
  const handlePageChange = (newPage: number) => {
    fetchProjects(searchTerm, newPage);
  };

  // Обработка создания нового проекта
  const handleCreateProject = async () => {
    if (!selectedProject.trim()) return;

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: selectedProject,
          description: `Описание для проекта ${selectedProject}`,
        }),
      });

      // Обработка ошибки авторизации
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[ProjectsList] 401 Unauthorized error (POST):");
        console.error("[ProjectsList] Response status:", response.status);
        console.error("[ProjectsList] Error data:", errorData);
        // ВРЕМЕННО ОТКЛЮЧЕНО ДЛЯ ОТЛАДКИ
        // window.location.href = "/login";
        setError(
          `401 Unauthorized: ${errorData.error || "Authentication failed"}`
        );
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create project");
      }

      // Обновляем список проектов
      fetchProjects(searchTerm, currentPage);
      setSelectedProject("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-primary-foreground rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Управление проектами</h2>

        {/* Поиск проектов */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-2">
            <Input
              placeholder="Поиск проектов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSearch} variant="outline">
              Поиск
            </Button>
            <Button onClick={() => fetchProjects()} variant="outline">
              Обновить список
            </Button>
          </div>
        </div>

        {/* Создание нового проекта */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-2">
            <Input
              placeholder="Название проекта..."
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleCreateProject}
              disabled={!selectedProject.trim()}
            >
              Создать проект
            </Button>
          </div>
        </div>

        {/* Select из проектов */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Выберите проект:
            </label>
            <Select>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Выберите проект" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Список проектов */}
      <div className="bg-primary-foreground rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Список проектов</h3>

        {loading && <p>Загрузка проектов...</p>}

        {error && <div className="text-red-500 mb-4">Ошибка: {error}</div>}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-background rounded-lg p-4 border"
              >
                <h4 className="font-semibold text-lg mb-2">{project.name}</h4>
                {project.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {project.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Создан:{" "}
                  {new Date(project.createdAt).toLocaleDateString("ru-RU")}
                </p>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <p className="text-muted-foreground">Проекты не найдены</p>
        )}

        {/* Пагинация */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Страница {pagination.page} из {pagination.totalPages} (всего:{" "}
              {pagination.total})
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPreviousPage || loading}
                variant="outline"
                size="sm"
              >
                Назад
              </Button>
              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNextPage || loading}
                variant="outline"
                size="sm"
              >
                Вперёд
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
