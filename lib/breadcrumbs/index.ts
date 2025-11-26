// Кеш и функции обновления
export {
  setEntityDefinitionName,
  getEntityDefinitionName,
  setFieldName,
  getFieldName,
  setEnvironmentName,
  getEnvironmentName,
  updateBreadcrumbsCache,
  clearBreadcrumbsCache,
  subscribeToBreadcrumbsCache,
  type BreadcrumbsCacheUpdate,
} from "./breadcrumbs-cache";

// Hook для React компонентов
export { useBreadcrumbsData } from "./use-breadcrumbs-data";

// Компонент для обновления кеша с серверных страниц
export { BreadcrumbsCacheUpdater } from "./BreadcrumbsCacheUpdater";

