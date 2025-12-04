/**
 * Хук для проверки прав на редактирование проекта
 * ИСПРАВЛЕНО: Использует get_user_project_role вместо удаленной функции is_project_super_admin
 * 
 * @deprecated Используйте useRole(projectId).canEdit вместо этого хука
 * Оставлен для обратной совместимости
 */

"use client";

import { useRole } from "@/hooks/use-role";

/**
 * Хук для проверки прав на редактирование проекта
 * @param projectId - ID проекта для проверки
 * @returns Объект с результатом проверки, статусом загрузки и ошибкой
 * 
 * @deprecated Используйте useRole(projectId).canEdit
 */
export function useCanEditProject(projectId: string | undefined) {
  const { canEdit, isLoading, error } = useRole(projectId);

  return {
    canEdit,
    isLoading,
    error,
  };
}

