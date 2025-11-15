/**
 * Сервис для работы с проектами
 * Использует универсальную систему BaseEntityService
 */

import { createEntityService } from "@/lib/entity-service";
import { getServerUser } from "@/lib/supabase/auth";
import type { Project } from "./types";

/**
 * Сервис проектов с базовыми настройками
 */
export const projectsService = createEntityService<Project>({
  tableName: "projects",
  searchFields: ["name", "description"],
  defaultSortBy: "created_at",
  defaultSortOrder: "desc",

  hooks: {
    // Добавляем created_by при создании проекта
    beforeCreate: async (data) => {
      const user = await getServerUser();
      if (!user) {
        throw new Error("Unauthorized: User not found");
      }

      return {
        ...data,
        created_by: user.id,
        status: data.status || "active",
      };
    },
  },
});

/**
 * Парсинг фильтров проектов из URL
 * (пока только базовые фильтры, можно расширить)
 */
export function parseProjectFilters(
  searchParams: Record<string, string | string[] | undefined>
) {
  // Импортируем parseFiltersFromUrl внутри функции
  const { parseFiltersFromUrl } = require("@/lib/entity-service");

  return parseFiltersFromUrl(searchParams, {
    simpleFilters: [
      {
        paramName: "status",
        field: "status",
        operator: "eq",
      },
    ],
  });
}
