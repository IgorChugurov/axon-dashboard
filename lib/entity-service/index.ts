/**
 * Entity Service - Универсальная система работы с сущностями
 *
 * Экспорт всех необходимых компонентов
 */

export { createEntityService, BaseEntityService } from "./base";
export type { EntityService, EntityConfig } from "./base";

export { createEntityActions } from "./actions";

export {
  parseFiltersFromUrl,
  serializeFiltersToUrl,
  buildUrlWithFilters,
} from "./url-filters";
export type { FilterConfig } from "./url-filters";

export type {
  EntityFilter,
  SimpleFilter,
  RelationFilter,
  ManyToManyFilter,
  FilterMode,
  AdvancedServerDataParams,
  EntityResponse,
  ActionResult,
} from "./types";

