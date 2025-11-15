/**
 * Парсинг и сериализация фильтров из/в URL
 */

import type { EntityFilter, FilterMode } from "./types";

/**
 * Конфигурация фильтров для парсинга из URL
 */
export interface FilterConfig {
  manyToManyFilters?: {
    paramName: string; // 'tags'
    joinTable: string; // 'post_tags'
    joinColumn: string; // 'post_id'
    targetColumn: string; // 'tag_id'
    defaultMode?: FilterMode;
  }[];
  relationFilters?: {
    paramName: string; // 'author_id'
    field: string; // 'author_id'
  }[];
  simpleFilters?: {
    paramName: string; // 'status'
    field: string; // 'status'
    operator?: "eq" | "neq" | "gt" | "lt" | "in" | "like" | "ilike";
  }[];
}

/**
 * Парсинг фильтров из Next.js searchParams
 *
 * Примеры URL:
 * ?author_id=123
 * ?tags=1,2,3&tags_mode=or
 * ?tags=1,2,3&tags_mode=and
 * ?author_id=123&tags=1,2&tags_mode=and&status=published
 */
export function parseFiltersFromUrl(
  searchParams: Record<string, string | string[] | undefined>,
  config: FilterConfig
): EntityFilter[] {
  const filters: EntityFilter[] = [];

  // === Many-to-many фильтры (теги) ===
  if (config.manyToManyFilters) {
    for (const m2m of config.manyToManyFilters) {
      const values = getParam(searchParams, m2m.paramName);
      if (values) {
        const mode = (getParam(searchParams, `${m2m.paramName}_mode`) ||
          m2m.defaultMode ||
          "or") as FilterMode;

        const valueArray = values.split(",").filter(Boolean);

        if (valueArray.length > 0) {
          filters.push({
            type: "many-to-many",
            joinTable: m2m.joinTable,
            joinColumn: m2m.joinColumn,
            targetColumn: m2m.targetColumn,
            values: valueArray,
            mode,
          });
        }
      }
    }
  }

  // === Relation фильтры (author_id) ===
  if (config.relationFilters) {
    for (const rel of config.relationFilters) {
      const value = getParam(searchParams, rel.paramName);
      if (value) {
        filters.push({
          type: "relation",
          field: rel.field,
          value,
        });
      }
    }
  }

  // === Простые фильтры (status, type) ===
  if (config.simpleFilters) {
    for (const simple of config.simpleFilters) {
      const value = getParam(searchParams, simple.paramName);
      if (value) {
        filters.push({
          type: "simple",
          field: simple.field,
          value,
          operator: simple.operator || "eq",
        });
      }
    }
  }

  return filters;
}

/**
 * Получение параметра из searchParams
 */
function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Сериализация фильтров в URL query string
 */
export function serializeFiltersToUrl(
  filters: EntityFilter[]
): URLSearchParams {
  const params = new URLSearchParams();

  for (const filter of filters) {
    if (filter.type === "many-to-many") {
      // Извлекаем имя параметра из targetColumn (tag_id → tags)
      const paramName = filter.targetColumn.replace("_id", "s");
      params.set(paramName, filter.values.join(","));
      params.set(`${paramName}_mode`, filter.mode);
    } else if (filter.type === "relation") {
      params.set(filter.field, String(filter.value));
    } else if (filter.type === "simple") {
      params.set(filter.field, String(filter.value));
    }
  }

  return params;
}

/**
 * Построение URL с параметрами (для клиентского роутинга)
 */
export function buildUrlWithFilters(
  basePath: string,
  page?: number,
  search?: string,
  filters?: EntityFilter[]
): string {
  const params = new URLSearchParams();

  if (page && page > 1) {
    params.set("page", page.toString());
  }

  if (search) {
    params.set("search", search);
  }

  if (filters && filters.length > 0) {
    const filterParams = serializeFiltersToUrl(filters);
    filterParams.forEach((value, key) => {
      params.set(key, value);
    });
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

