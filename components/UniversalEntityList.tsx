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

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2, Edit, Settings, List } from "lucide-react";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type { EntityDefinition, Field } from "@/lib/universal-entity/types";

interface UniversalEntityListProps {
  entityDefinition: EntityDefinition;
  fields: Field[];
  uiConfig: EntityUIConfig;
  initialInstances: any[];
  initialPage?: number;
  initialSearch?: string;
  projectId: string;
}

export function UniversalEntityList({
  entityDefinition,
  uiConfig,
  initialInstances,
  initialPage = 1,
  initialSearch = "",
  projectId,
}: UniversalEntityListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [instances] = useState(initialInstances);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);

  const { list } = uiConfig;

  // Обработчик поиска
  const handleSearch = (value: string) => {
    setSearch(value);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.push(`?${params.toString()}`);
    });
  };

  // Обработчик создания
  const handleCreate = () => {
    // Для entityDefinitions - создание новой entityDefinition
    // Для fields - создание нового field
    // Для обычных сущностей - создание нового instance
    if (entityDefinition.tableName === "entity_definition") {
      router.push(`/${projectId}/entity-definition/new`);
    } else if (entityDefinition.tableName === "field") {
      // Для fields нужно получить entityDefinitionId из контекста
      // Пока используем projectId, но это нужно будет исправить
      // TODO: Передавать entityDefinitionId как проп
      const currentPath = window.location.pathname;
      const match = currentPath.match(/\/entity-definition\/([^/]+)\/fields/);
      if (match) {
        router.push(`/${projectId}/entity-definition/${match[1]}/fields/new`);
      }
    } else {
      router.push(`/${projectId}/entities/${entityDefinition.id}/new`);
    }
  };

  // Обработчик редактирования
  const handleEdit = (instanceId: string) => {
    // Для entityDefinitions - редактирование самой entityDefinition
    // Для fields - редактирование field
    // Для обычных сущностей - редактирование instance
    if (entityDefinition.tableName === "entity_definition") {
      router.push(`/${projectId}/entity-definition/${instanceId}/edit`);
    } else if (entityDefinition.tableName === "field") {
      const currentPath = window.location.pathname;
      const match = currentPath.match(/\/entity-definition\/([^/]+)\/fields/);
      if (match) {
        router.push(
          `/${projectId}/entity-definition/${match[1]}/fields/${instanceId}/edit`
        );
      }
    } else {
      router.push(
        `/${projectId}/entities/${entityDefinition.id}/${instanceId}/edit`
      );
    }
  };

  // Обработчик навигации к деталям
  const handleNavigateToDetails = (
    instanceId: string,
    additionalUrl?: string
  ) => {
    // Для entityDefinitions без additionalUrl - переход на список сущностей
    if (entityDefinition.tableName === "entity_definition" && !additionalUrl) {
      router.push(`/${projectId}/entities/${instanceId}`);
    } else if (entityDefinition.tableName === "field") {
      // Для fields - переход на редактирование
      const currentPath = window.location.pathname;
      const match = currentPath.match(/\/entity-definition\/([^/]+)\/fields/);
      if (match) {
        router.push(
          `/${projectId}/entity-definition/${match[1]}/fields/${instanceId}/edit`
        );
      }
    } else {
      const url = additionalUrl
        ? `/${projectId}/entities/${entityDefinition.id}/${instanceId}${additionalUrl}`
        : `/${projectId}/entities/${entityDefinition.id}/${instanceId}`;
      router.push(url);
    }
  };

  // Обработчик link action (для перехода на связанные страницы)
  const handleLink = (instanceId: string, additionalUrl?: string) => {
    if (entityDefinition.tableName === "entity_definition") {
      // Для entityDefinitions - переход на связанные страницы
      router.push(`/${projectId}/entity-definition/${instanceId}${additionalUrl || ""}`);
    } else {
      // Для обычных сущностей
      const url = additionalUrl
        ? `/${projectId}/entities/${entityDefinition.id}/${instanceId}${additionalUrl}`
        : `/${projectId}/entities/${entityDefinition.id}/${instanceId}`;
      router.push(url);
    }
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

  // Пустое состояние
  if (instances.length === 0 && !search) {
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
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Место для будущих фильтров */}
          {list.enableFilters &&
            list.filterEntityDefinitionIds &&
            list.filterEntityDefinitionIds.length > 0 && (
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground">
                  Filters configured: {list.filterEntityDefinitionIds.length}
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
      {instances.length > 0 && (
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
                                  ["manyToOne", "oneToMany", "manyToMany", "oneToOne"].includes(
                                    field.dbType
                                  )
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
                                      handleLink(instance.id, action.additionalUrl)
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
      {list.enablePagination && instances.length > 0 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newPage = page - 1;
              setPage(newPage);
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(newPage));
              router.push(`?${params.toString()}`);
            }}
            disabled={page <= 1 || isPending}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            Page {page}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newPage = page + 1;
              setPage(newPage);
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(newPage));
              router.push(`?${params.toString()}`);
            }}
            disabled={instances.length < (list.pageSize || 20) || isPending}
          >
            Next
          </Button>
        </div>
      )}

      {/* Индикатор загрузки */}
      {isPending && (
        <div className="fixed bottom-4 right-4 bg-background border rounded-lg px-4 py-2 shadow-lg">
          <p className="text-sm">Loading...</p>
        </div>
      )}
    </div>
  );
}
