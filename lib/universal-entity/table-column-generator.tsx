/**
 * Генератор колонок для TanStack Table на основе конфигурации
 */

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import type { ColumnConfig, ActionConfig } from "./ui-config-types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, Trash2, Edit, List, MoreVertical } from "lucide-react";

/**
 * Получить иконку по имени
 */
function getIcon(iconName?: string) {
  switch (iconName) {
    case "settings":
      return Settings;
    case "trash":
      return Trash2;
    case "edit":
      return Edit;
    case "list":
      return List;
    default:
      return Edit;
  }
}

/**
 * Форматирует значение поля-связи для отображения в таблице
 *
 * @param value - Значение поля (объект или массив объектов)
 * @param relationDbType - Тип связи (manyToOne, oneToOne, manyToMany, oneToMany)
 * @returns Строка для отображения
 */
function formatRelationValue(
  value: any,
  relationDbType?: "manyToOne" | "oneToOne" | "manyToMany" | "oneToMany"
): string {
  // Для одиночных связей (manyToOne, oneToOne) - значение может быть объектом
  if (relationDbType === "manyToOne" || relationDbType === "oneToOne") {
    if (!value || typeof value !== "object") return "-";
    // Если пришел массив (старый формат), берем первый элемент
    if (Array.isArray(value)) {
      const item = value[0];
      if (!item) return "-";
      return item.name || item.title || item.id || "-";
    }
    return value.name || value.title || value.id || "-";
  }

  // Для множественных связей (manyToMany, oneToMany) - массив объектов
  if (!Array.isArray(value) || value.length === 0) return "-";

  const names = value
    .map((item: any) => item?.name || item?.title || item?.id)
    .filter(Boolean);

  if (names.length === 0) return "-";

  // Ограничиваем количество отображаемых имен
  const maxDisplayNames = 3;
  if (names.length <= maxDisplayNames) {
    return `${value.length} (${names.join(", ")})`;
  }

  const displayedNames = names.slice(0, maxDisplayNames).join(", ");
  const remaining = names.length - maxDisplayNames;
  return `${value.length} (${displayedNames}, +${remaining} more)`;
}

/**
 * Генерирует колонки для TanStack Table на основе конфигурации
 *
 * @param columnsConfig - Конфигурация колонок из EntityUIConfig
 * @param routing - Конфигурация роутинга для навигации
 * @param projectId - ID проекта
 * @param onEdit - Обработчик редактирования
 * @param onDelete - Обработчик удаления
 * @param onLink - Обработчик перехода по ссылке
 */
export function generateColumnsFromConfig<TData extends { id: string }>(
  columnsConfig: ColumnConfig[],
  routing: {
    editUrlTemplate: string;
    detailsUrlTemplate: string;
  },
  projectId: string,
  onEdit?: (id: string) => void,
  onDelete?: (id: string) => void,
  onLink?: (id: string, additionalUrl?: string) => void
): ColumnDef<TData>[] {
  return columnsConfig
    .map((col) => {
      // Колонка действий
      if (col.type === "actions" && col.actions) {
        return {
          id: col.field,
          header: col.headerName || "",
          enableHiding: false,
          cell: ({ row }) => {
            const instance = row.original;

            // Фильтруем действия, которые должны быть отображены
            const availableActions = col.actions?.filter((action) => {
              if (action.action === "edit" && !onEdit) return false;
              if (action.action === "delete" && !onDelete) return false;
              if (action.action === "link" && !onLink) return false;
              return true;
            });

            // Если нет доступных действий, не показываем dropdown
            if (!availableActions || availableActions.length === 0) {
              return null;
            }

            // Разделяем действия на группы: обычные и delete
            const regularActions = availableActions.filter(
              (action) => action.action !== "delete"
            );
            const deleteAction = availableActions.find(
              (action) => action.action === "delete"
            );

            return (
              <div className="flex items-center justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* Обычные действия (edit, link) */}
                    {regularActions.map((action: ActionConfig, idx: number) => {
                      const ActionIcon = getIcon(action.icon);
                      const actionKey = `${action.action}-${idx}`;

                      if (action.action === "edit") {
                        return (
                          <DropdownMenuItem
                            key={actionKey}
                            onClick={() => onEdit?.(instance.id)}
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        );
                      }

                      if (action.action === "link") {
                        return (
                          <DropdownMenuItem
                            key={actionKey}
                            onClick={() =>
                              onLink?.(instance.id, action.additionalUrl)
                            }
                          >
                            <List className="h-4 w-4" />
                            {action?.label || "View Details"}
                          </DropdownMenuItem>
                        );
                      }

                      return null;
                    })}

                    {/* Separator перед delete, если есть обычные действия */}
                    {regularActions.length > 0 && deleteAction && (
                      <DropdownMenuSeparator />
                    )}

                    {/* Delete действие */}
                    {deleteAction && (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete?.(instance.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          },
        } as ColumnDef<TData>;
      }

      // Колонка с навигацией к деталям
      if (col.type === "naigateToDetails" || col.type === "openEditPage") {
        return {
          accessorKey: col.field,
          header: col.headerName || col.field,
          cell: ({ row }) => {
            const value = row.getValue(col.field) as any;
            const instance = row.original;

            const displayValue =
              value == null || value === ""
                ? "-"
                : col.type === "date"
                ? new Date(value).toLocaleDateString()
                : col.type === "boolean"
                ? value
                  ? "Yes"
                  : "No"
                : col.type === "number"
                ? typeof value === "number"
                  ? value.toLocaleString()
                  : value
                : String(value);

            return (
              <button
                onClick={() => {
                  const url = routing.detailsUrlTemplate
                    .replace("{projectId}", projectId)
                    .replace("{instanceId}", instance.id);
                  if (col.additionalUrl) {
                    window.location.href = `${url}${col.additionalUrl}`;
                  } else {
                    window.location.href = url;
                  }
                }}
                className="text-left hover:underline font-medium text-primary"
              >
                {displayValue}
              </button>
            );
          },
        } as ColumnDef<TData>;
      }

      // Обычная колонка
      return {
        accessorKey: col.field,
        header: col.headerName || col.field,
        cell: ({ row }) => {
          const value = row.getValue(col.field) as any;

          if (value == null || value === "") return "-";

          switch (col.type) {
            case "date":
              return new Date(value).toLocaleDateString();
            case "boolean":
              return value ? "Yes" : "No";
            case "number":
              return typeof value === "number" ? value.toLocaleString() : value;
            case "relation":
              return formatRelationValue(value, col.relationDbType);
            default:
              // Для объектов (на случай если relation не определен корректно)
              if (typeof value === "object") {
                if (Array.isArray(value)) {
                  // Пытаемся отформатировать как массив связей
                  return formatRelationValue(value, "manyToMany");
                }
                // Одиночный объект - пытаемся получить имя
                return value.name || value.title || value.id || String(value);
              }
              return String(value);
          }
        },
      } as ColumnDef<TData>;
    })
    .filter((col): col is ColumnDef<TData> => col !== undefined);
}
