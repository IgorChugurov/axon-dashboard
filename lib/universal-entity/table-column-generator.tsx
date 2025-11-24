/**
 * Генератор колонок для TanStack Table на основе конфигурации
 */

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import type { ColumnConfig, ActionConfig } from "./ui-config-types";
import { Button } from "@/components/ui/button";
import { Settings, Trash2, Edit, List } from "lucide-react";

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

            return (
              <div className="flex items-center justify-end gap-2">
                {col.actions?.map((action: ActionConfig, idx: number) => {
                  const ActionIcon = getIcon(action.icon);
                  const actionKey = `${action.action}-${idx}`;

                  if (action.action === "edit") {
                    return (
                      <Button
                        key={actionKey}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onEdit?.(instance.id)}
                      >
                        <span className="sr-only">Edit</span>
                        <ActionIcon className="h-4 w-4" />
                      </Button>
                    );
                  }

                  if (action.action === "delete") {
                    return (
                      <Button
                        key={actionKey}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => onDelete?.(instance.id)}
                      >
                        <span className="sr-only">Delete</span>
                        <ActionIcon className="h-4 w-4" />
                      </Button>
                    );
                  }

                  if (action.action === "link") {
                    return (
                      <Button
                        key={actionKey}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onLink?.(instance.id, action.additionalUrl)}
                      >
                        <span className="sr-only">Link</span>
                        <ActionIcon className="h-4 w-4" />
                      </Button>
                    );
                  }

                  return null;
                })}
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
            default:
              return String(value);
          }
        },
      } as ColumnDef<TData>;
    })
    .filter((col): col is ColumnDef<TData> => col !== undefined);
}

