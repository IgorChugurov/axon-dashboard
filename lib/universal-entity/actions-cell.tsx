/**
 * Универсальный компонент для отображения действий в таблице
 * Используется для всех сущностей, включая Projects
 */

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, Trash2, Edit, List, MoreVertical, Eye } from "lucide-react";
import { useCanEditProject } from "@/hooks/use-can-edit-project";
import { useUserRole } from "@/hooks/use-user-role";
import type { ActionConfig } from "./ui-config-types";

interface ActionsCellProps {
  instanceId: string;
  actions: ActionConfig[];
  readOnly?: boolean;
  onEdit?: (id: string) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  onLink?: (id: string, additionalUrl?: string) => void;
  canEdit?: (id: string) => boolean | Promise<boolean>;
  // Для Projects: projectId = instanceId (ID проекта для проверки прав)
  isProjectList?: boolean;
}

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

export function ActionsCell({
  instanceId,
  actions,
  readOnly = false,
  onEdit,
  onDelete,
  onLink,
  canEdit,
  isProjectList = false,
}: ActionsCellProps) {
  const { isSuperAdmin } = useUserRole();

  // Для Projects используем хук для проверки прав на редактирование
  const { canEdit: canEditProject, isLoading: isCheckingProject } =
    useCanEditProject(isProjectList ? instanceId : undefined);

  // Фильтруем действия на основе прав
  const availableActions = React.useMemo(() => {
    return actions.filter((action) => {
      // link action всегда показываем, если есть обработчик (для просмотра)
      if (action.action === "link") {
        return !!onLink;
      }

      // В режиме readOnly скрываем delete действия
      if (readOnly && action.action === "delete") return false;

      // Проверяем наличие обработчиков
      if (action.action === "edit" && !onEdit && !onLink) return false;
      if (action.action === "delete" && !onDelete) return false;

      // Для Projects: если edit action с link: true, показываем его даже без прав на редактирование (как просмотр)
      if (action.action === "edit" && isProjectList) {
        // Если есть link обработчик, показываем edit как просмотр
        if (onLink) {
          return true; // Показываем как просмотр
        }
        // Если нет прав на редактирование и нет link, скрываем
        if (!isCheckingProject && !canEditProject) {
          return false;
        }
      }

      // Для остальных сущностей: проверяем через функцию canEdit
      if (action.action === "edit" && canEdit && !isProjectList) {
        if (typeof canEdit === "function") {
          const canEditResult = canEdit(instanceId);
          if (canEditResult === false) return false;
        }
      }

      // Для Projects: проверяем права на удаление (только superAdmin)
      if (action.action === "delete" && isProjectList && !isSuperAdmin) {
        return false;
      }

      return true;
    });
  }, [
    actions,
    readOnly,
    onEdit,
    onDelete,
    onLink,
    canEdit,
    instanceId,
    isProjectList,
    canEditProject,
    isCheckingProject,
    isSuperAdmin,
  ]);

  // Если нет доступных действий, не показываем dropdown
  if (availableActions.length === 0) {
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
              // Для Projects: если нет прав на редактирование, но есть link, показываем как View
              const isViewOnly =
                isProjectList &&
                !isCheckingProject &&
                !canEditProject &&
                onLink;

              // В режиме readOnly или view-only заменяем edit на view
              if (readOnly || isViewOnly) {
                return (
                  <DropdownMenuItem
                    key={actionKey}
                    onClick={() => {
                      // Если есть link, используем его, иначе onEdit
                      if (onLink && action.link) {
                        onLink(instanceId, action.additionalUrl);
                      } else {
                        onEdit?.(instanceId);
                      }
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </DropdownMenuItem>
                );
              }
              return (
                <DropdownMenuItem
                  key={actionKey}
                  onClick={async () => {
                    // Если есть link, используем его, иначе onEdit
                    if (onLink && action.link) {
                      onLink(instanceId, action.additionalUrl);
                    } else {
                      await onEdit?.(instanceId);
                    }
                  }}
                >
                  <ActionIcon className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              );
            }

            if (action.action === "link") {
              return (
                <DropdownMenuItem
                  key={actionKey}
                  onClick={() => onLink?.(instanceId, action.additionalUrl)}
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
              onClick={() => onDelete?.(instanceId)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
