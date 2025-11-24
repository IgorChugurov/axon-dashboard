/**
 * Экспорты для универсального компонента списка
 */

export { UniversalEntityListDataTable } from "./UniversalEntityListDataTable";
export { UniversalEntityListClient } from "./UniversalEntityListClient";
export { DataTablePagination } from "./DataTablePagination";

// Типы
export type {
  LoadParams,
  PaginationInfo,
  LoadDataResult,
  LoadDataFn,
  ServiceType,
  RoutingConfig,
} from "./types/list-types";

// Хуки (для расширенного использования)
export { useListParams } from "./hooks/use-list-params";
export { useListQuery } from "./hooks/use-list-query";

// Утилиты
export { getListQueryKey } from "./utils/list-query-key";

