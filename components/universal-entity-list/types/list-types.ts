/**
 * Типы для универсального компонента списка
 */

/**
 * Режим фильтрации для relation полей
 * - 'any': хотя бы одно из выбранных значений (OR) - по умолчанию
 * - 'all': все выбранные значения (AND)
 */
export type FilterMode = "any" | "all";

export interface LoadParams {
  page: number;
  limit: number;
  search?: string;
  filters?: Record<string, string[]>; // Фильтры: ключ - имя поля, значение - массив выбранных значений
  filterModes?: Record<string, FilterMode>; // Режимы фильтрации для каждого поля
  sortBy?: string; // для будущей сортировки
  sortOrder?: "asc" | "desc";
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface LoadDataResult<TData> {
  data: TData[];
  pagination: PaginationInfo;
}

export type LoadDataFn<TData> = (
  params: LoadParams,
  signal?: AbortSignal
) => Promise<LoadDataResult<TData>>;

export type ServiceType =
  | "admin"
  | "environment"
  | "entity-definition"
  | "entity-instance"
  | "field"
  | "project";

export interface RoutingConfig {
  createUrlTemplate: string;
  editUrlTemplate: string;
  detailsUrlTemplate: string;
}
