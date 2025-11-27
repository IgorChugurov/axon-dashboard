/**
 * Утилита для генерации query key для React Query
 */

import type { LoadParams, ServiceType } from "../types/list-types";

/**
 * Генерирует query key для React Query на основе параметров списка
 */
export function getListQueryKey(
  projectId: string,
  serviceType: ServiceType,
  params: LoadParams
): readonly string[] {
  return [
    "list",
    projectId,
    serviceType,
    String(params.page),
    String(params.limit),
    params.search || "",
    // Фильтры (если есть)
    ...(params.filters ? [JSON.stringify(params.filters)] : []),
    // Режимы фильтрации (если есть)
    ...(params.filterModes ? [JSON.stringify(params.filterModes)] : []),
    // Сортировка (если есть)
    ...(params.sortBy ? [params.sortBy, params.sortOrder || "asc"] : []),
  ] as const;
}
