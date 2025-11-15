/**
 * Типы для универсальной системы работы с сущностями
 */

export type FilterMode = "or" | "and";

/**
 * Простой фильтр для полей сущности (status, type и т.д.)
 */
export interface SimpleFilter {
  type: "simple";
  field: string;
  value: any;
  operator?:
    | "eq"
    | "neq"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "like"
    | "ilike"
    | "in";
}

/**
 * Фильтр для связи many-to-one (author_id, category_id)
 */
export interface RelationFilter {
  type: "relation";
  field: string;
  value: string | number;
}

/**
 * Фильтр для связи many-to-many (теги через post_tags)
 */
export interface ManyToManyFilter {
  type: "many-to-many";
  joinTable: string; // 'post_tags'
  joinColumn: string; // 'post_id'
  targetColumn: string; // 'tag_id'
  values: (string | number)[];
  mode: FilterMode; // 'or' | 'and'
}

/**
 * Объединенный тип фильтра
 */
export type EntityFilter = SimpleFilter | RelationFilter | ManyToManyFilter;

/**
 * Расширенные параметры запроса данных
 */
export interface AdvancedServerDataParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: EntityFilter[];
}

/**
 * Ответ с данными и пагинацией
 */
export interface EntityResponse<T> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

/**
 * Результат операции (для Server Actions)
 */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

