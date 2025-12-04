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
import { Settings, Trash2, Edit, List, MoreVertical, Eye } from "lucide-react";
import { ActionsCell } from "./actions-cell";

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
 * Получает значение для отображения из связанного экземпляра
 * Ищет поле для отображения в следующем порядке:
 * 1. Стандартные поля: name, Name, title, Title
 * 2. Первое строковое поле (кроме служебных)
 * 3. ID
 */
function getRelatedInstanceDisplayValue(item: any): string {
  if (!item || typeof item !== "object") return "-";

  // Служебные поля, которые не должны использоваться для отображения
  const systemFields = new Set([
    "id",
    "entityDefinitionId",
    "projectId",
    "createdAt",
    "updatedAt",
  ]);

  // 1. Сначала ищем стандартные поля (с разными регистрами)
  const standardFields = ["name", "Name", "title", "Title"];
  for (const fieldName of standardFields) {
    if (item[fieldName] !== undefined && item[fieldName] !== null) {
      const value = String(item[fieldName]).trim();
      if (value) return value;
    }
  }

  // 2. Ищем первое строковое поле (кроме служебных)
  for (const [key, value] of Object.entries(item)) {
    if (!systemFields.has(key) && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  // 3. В крайнем случае используем ID
  return item.id || "-";
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
      return getRelatedInstanceDisplayValue(item);
    }
    return getRelatedInstanceDisplayValue(value);
  }

  // Для множественных связей (manyToMany, oneToMany) - массив объектов
  if (!Array.isArray(value) || value.length === 0) return "-";

  const names = value
    .map((item: any) => getRelatedInstanceDisplayValue(item))
    .filter((name) => name && name !== "-");

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
 * @param onEdit - Обработчик редактирования (может быть async)
 * @param onDelete - Обработчик удаления
 * @param onLink - Обработчик перехода по ссылке
 * @param readOnly - Если true, скрывает delete действия и заменяет edit на view
 * @param canEdit - Функция проверки прав на редактирование (опционально)
 */
export function generateColumnsFromConfig<TData extends { id: string }>(
  columnsConfig: ColumnConfig[],
  routing: {
    editUrlTemplate: string;
    detailsUrlTemplate: string;
  },
  projectId: string,
  onEdit?: (id: string) => void | Promise<void>,
  onDelete?: (id: string) => void | Promise<void>,
  onLink?: (id: string, additionalUrl?: string) => void,
  readOnly?: boolean,
  canEdit?: (id: string) => boolean | Promise<boolean>
): ColumnDef<TData>[] {
  return columnsConfig
    .map((col) => {
      // Колонка действий
      if (col.type === "actions" && col.actions) {
        const isProjectList = projectId === "global";

        return {
          id: col.field,
          header: col.headerName || "",
          enableHiding: false,
          cell: ({ row }) => {
            const instanceId = row.original.id;
            return (
              <ActionsCell
                instanceId={instanceId}
                actions={col.actions || []}
                readOnly={readOnly}
                onEdit={onEdit}
                onDelete={onDelete}
                onLink={onLink}
                canEdit={canEdit}
                isProjectList={isProjectList}
              />
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
                onClick={() => onLink?.(instance.id, col.additionalUrl)}
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
                // Одиночный объект - используем универсальную функцию для получения имени
                return getRelatedInstanceDisplayValue(value);
              }
              return String(value);
          }
        },
      } as ColumnDef<TData>;
    })
    .filter((col): col is ColumnDef<TData> => col !== undefined);
}
