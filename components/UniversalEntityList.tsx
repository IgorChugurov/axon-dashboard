/**
 * Универсальный компонент для отображения списка любой сущности
 *
 * Использует EntityUIConfig для автоматической настройки UI:
 * - Заголовки и текст из uiConfig.list
 * - Кнопки создания
 * - Поиск
 * - Пустое состояние
 * - Таблица с колонками из конфигурации
 * - Пагинация (опционально)
 * - Фильтры (структура готова, реализация позже)
 */

"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2, Edit, Settings, List } from "lucide-react";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type { EntityDefinition } from "@/lib/universal-entity/types";

interface RoutingConfig {
  createUrlTemplate: string; // Шаблон URL для создания, например "/projects/{projectId}/settings/environments/new"
  editUrlTemplate: string; // Шаблон URL для редактирования, например "/projects/{projectId}/settings/environments/{instanceId}"
  detailsUrlTemplate: string; // Шаблон URL для деталей, например "/projects/{projectId}/settings/environments/{instanceId}"
}

interface UniversalEntityListProps {
  entityDefinition: EntityDefinition;
  uiConfig: EntityUIConfig;
  onLoadData: (params: {
    page: number;
    limit: number;
    search?: string;
  }) => Promise<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasPreviousPage: boolean;
      hasNextPage: boolean;
    };
  }>;
  projectId: string;
  fields?: any[];
  routing: RoutingConfig;
}

export function UniversalEntityList({
  entityDefinition,
  uiConfig,
  onLoadData,
  projectId,
  routing,
}: UniversalEntityListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Читаем page и search из URL
  const page = parseInt(searchParams.get("page") || "1", 10);
  const search = searchParams.get("search") || "";

  // Состояние для данных
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  const { list } = uiConfig;
  const pageSize = list.pageSize || 20;

  // Debounce для поиска
  const [searchInput, setSearchInput] = useState(search);

  // Загрузка данных
  const loadData = useCallback(
    async (currentPage: number, currentSearch: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await onLoadData({
          page: currentPage,
          limit: pageSize,
          search: currentSearch || undefined,
        });
        setInstances(result.data);
        setPagination(result.pagination);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load data";
        setError(errorMessage);
        setInstances([]);
      } finally {
        setLoading(false);
      }
    },
    [onLoadData, pageSize]
  );

  // Загрузка данных при изменении page или search
  useEffect(() => {
    loadData(page, search);
  }, [page, search, loadData]);

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        startTransition(() => {
          const params = new URLSearchParams(searchParams.toString());
          if (searchInput) {
            params.set("search", searchInput);
          } else {
            params.delete("search");
          }
          params.set("page", "1");
          router.push(`?${params.toString()}`);
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, search, searchParams, router]);

  // Обработчик поиска
  const handleSearch = (value: string) => {
    setSearchInput(value);
  };

  // Генерация URL из шаблона
  const generateUrl = (template: string, instanceId?: string) => {
    return template
      .replace("{projectId}", projectId)
      .replace("{instanceId}", instanceId || "");
  };

  // Обработчик создания
  const handleCreate = () => {
    router.push(generateUrl(routing.createUrlTemplate));
  };

  // Обработчик редактирования
  const handleEdit = (instanceId: string) => {
    router.push(generateUrl(routing.editUrlTemplate, instanceId));
  };

  // Обработчик навигации к деталям (переход на редактирование)
  const handleNavigateToDetails = (
    instanceId: string,
    additionalUrl?: string
  ) => {
    const baseUrl = generateUrl(routing.detailsUrlTemplate, instanceId);
    // Если есть additionalUrl, добавляем его к URL
    if (additionalUrl) {
      router.push(`${baseUrl}${additionalUrl}`);
    } else {
      router.push(baseUrl);
    }
  };

  // Обработчик link action (для перехода на связанные страницы)
  const handleLink = (instanceId: string, additionalUrl?: string) => {
    const baseUrl = generateUrl(routing.detailsUrlTemplate, instanceId);
    if (additionalUrl) {
      router.push(`${baseUrl}${additionalUrl}`);
    } else {
      router.push(baseUrl);
    }
  };

  // Обработчик удаления
  const handleDelete = async (instanceId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return;
    }

    if (entityDefinition.tableName === "environments") {
      try {
        const { deleteEnvironmentAction } = await import(
          `@/app/projects/${projectId}/settings/environments/actions`
        );
        const result = await deleteEnvironmentAction(projectId, instanceId);

        if (result.success) {
          router.refresh();
        } else {
          alert(result.error || "Failed to delete environment");
        }
      } catch (error) {
        console.error("[UniversalEntityList] Delete error:", error);
        alert("Failed to delete environment");
      }
      return;
    }

    console.warn("Delete not implemented yet", instanceId);
  };

  // Получить иконку по имени
  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case "settings":
        return Settings;
      case "list":
        return List;
      case "edit":
        return Edit;
      case "trash":
        return Trash2;
      default:
        return Edit;
    }
  };

  // Рендер значения ячейки
  const renderCellValue = (
    instance: any,
    columnField: string,
    columnType?: string
  ) => {
    const value = instance[columnField];

    if (value == null || value === "") return "-";

    switch (columnType) {
      case "date":
        return new Date(value).toLocaleDateString();
      case "boolean":
        return value ? "Yes" : "No";
      case "number":
        return typeof value === "number" ? value.toLocaleString() : value;
      default:
        return String(value);
    }
  };

  // Обработка ошибок
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 border rounded-lg bg-destructive/10">
        <div className="text-center max-w-md">
          <h3 className="text-xl font-semibold mb-2 text-destructive">
            Error loading data
          </h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => loadData(page, search)} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Индикатор загрузки
  if (loading && instances.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {list.pageTitle}
            </h1>
          </div>
        </div>
        <div className="border rounded-lg p-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Пустое состояние
  if (instances.length === 0 && !search && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 border rounded-lg bg-muted/10">
        <div className="text-center max-w-md">
          <h3 className="text-xl font-semibold mb-2">{list.emptyStateTitle}</h3>
          {list.emptyStateMessages.map((msg, i) => (
            <p key={i} className="text-muted-foreground mb-2">
              {msg}
            </p>
          ))}
          {list.showCreateButton && (
            <Button onClick={handleCreate} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              {list.createButtonText}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Заголовок и кнопка создания */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {list.pageTitle}
          </h1>
          {entityDefinition.description && (
            <p className="text-muted-foreground mt-1">
              {entityDefinition.description}
            </p>
          )}
        </div>
        {list.showCreateButton && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {list.createButtonText}
          </Button>
        )}
      </div>

      {/* Поиск и фильтры */}
      {(list.showSearch || list.enableFilters) && (
        <div className="flex gap-4 items-center">
          {list.showSearch && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={list.searchPlaceholder}
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Место для будущих фильтров */}
          {list.enableFilters && (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">
                Filters enabled
              </span>
              {/* TODO: Компонент фильтров */}
            </div>
          )}
        </div>
      )}

      {/* Результаты поиска (если пусто) */}
      {instances.length === 0 && search && (
        <div className="text-center py-8 border rounded-lg">
          <p className="text-muted-foreground">
            No results found for &quot;{search}&quot;
          </p>
          <Button
            variant="link"
            onClick={() => handleSearch("")}
            className="mt-2"
          >
            Clear search
          </Button>
        </div>
      )}

      {/* Таблица */}
      {instances.length > 0 && !loading && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {list.columns.map((col) => (
                  <th
                    key={col.field}
                    className="px-4 py-3 text-left text-sm font-medium"
                    style={{
                      width: col.width,
                      flex: col.flex,
                    }}
                  >
                    {col.headerName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {instances.map((instance) => (
                <tr
                  key={instance.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {list.columns.map((col) => {
                    const isActionsColumn = col.type === "actions";
                    const isNavigateColumn =
                      col.type === "naigateToDetails" ||
                      col.type === "openEditPage";

                    return (
                      <td
                        key={col.field}
                        className={`px-4 py-3 text-sm ${
                          isActionsColumn ? "text-right" : ""
                        }`}
                      >
                        {isActionsColumn ? (
                          <div className="flex items-center justify-end gap-2">
                            {col.actions?.map((action, idx) => {
                              // Для fields: скрываем delete для не-source relation полей
                              if (
                                action.action === "delete" &&
                                entityDefinition.tableName === "field"
                              ) {
                                const field = instance as any;
                                // Если поле relation и НЕ является источником - скрываем delete
                                if (
                                  field.isRelationSource === false &&
                                  field.relatedEntityDefinitionId &&
                                  [
                                    "manyToOne",
                                    "oneToMany",
                                    "manyToMany",
                                    "oneToOne",
                                  ].includes(field.dbType)
                                ) {
                                  return null;
                                }
                              }

                              const IconComponent = getIcon(action.icon);
                              const actionKey = `${action.action}-${idx}`;

                              if (action.action === "edit") {
                                return (
                                  <Button
                                    key={actionKey}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(instance.id)}
                                  >
                                    <IconComponent className="h-4 w-4" />
                                  </Button>
                                );
                              }

                              if (action.action === "link") {
                                return (
                                  <Button
                                    key={actionKey}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleLink(
                                        instance.id,
                                        action.additionalUrl
                                      )
                                    }
                                  >
                                    <IconComponent className="h-4 w-4" />
                                  </Button>
                                );
                              }

                              if (action.action === "delete") {
                                return (
                                  <Button
                                    key={actionKey}
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(instance.id)}
                                  >
                                    <IconComponent className="h-4 w-4" />
                                  </Button>
                                );
                              }

                              return null;
                            })}
                          </div>
                        ) : isNavigateColumn ? (
                          <button
                            onClick={() =>
                              handleNavigateToDetails(
                                instance.id,
                                col.additionalUrl
                              )
                            }
                            className="text-left hover:underline font-medium text-primary"
                          >
                            {renderCellValue(instance, col.field, col.type)}
                          </button>
                        ) : (
                          renderCellValue(instance, col.field, col.type)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Пагинация */}
      {list.enablePagination && instances.length > 0 && !loading && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newPage = page - 1;
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(newPage));
              router.push(`?${params.toString()}`);
            }}
            disabled={!pagination.hasPreviousPage || isPending || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            Page {pagination.page} of {pagination.totalPages} (
            {pagination.total} total)
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newPage = page + 1;
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(newPage));
              router.push(`?${params.toString()}`);
            }}
            disabled={!pagination.hasNextPage || isPending || loading}
          >
            Next
          </Button>
        </div>
      )}

      {(isPending || loading) && (
        <div className="fixed bottom-4 right-4 bg-background border rounded-lg px-4 py-2 shadow-lg">
          <p className="text-sm">Loading...</p>
        </div>
      )}
    </div>
  );
}
