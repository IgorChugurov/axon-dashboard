/**
 * Простой кеш в памяти для имён сущностей (breadcrumbs)
 * 
 * Этот кеш хранит имена entityDefinition, field, environment
 * для отображения в breadcrumbs без необходимости глобального состояния.
 * 
 * Кеш обновляется когда:
 * - Страница загружает данные сущности
 * - Сущность редактируется/создаётся
 */

// Типы кешируемых данных
interface CachedEntityData {
  name: string;
  updatedAt: number;
}

// In-memory кеш
const entityDefinitionsCache = new Map<string, CachedEntityData>();
const fieldsCache = new Map<string, CachedEntityData>();
const environmentsCache = new Map<string, CachedEntityData>();
const adminsCache = new Map<string, CachedEntityData>();

// TTL кеша - 5 минут (данные обновятся при навигации на страницу)
const CACHE_TTL = 5 * 60 * 1000;

// Listeners для реактивного обновления
type CacheListener = () => void;
const listeners = new Set<CacheListener>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribeToBreadcrumbsCache(listener: CacheListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// --- EntityDefinition ---

export function setEntityDefinitionName(id: string, name: string): void {
  const existing = entityDefinitionsCache.get(id);
  // Не обновляем если имя не изменилось
  if (existing?.name === name) return;
  
  entityDefinitionsCache.set(id, {
    name,
    updatedAt: Date.now(),
  });
  notifyListeners();
}

export function getEntityDefinitionName(id: string): string | undefined {
  const cached = entityDefinitionsCache.get(id);
  if (!cached) return undefined;
  
  // Проверяем TTL
  if (Date.now() - cached.updatedAt > CACHE_TTL) {
    entityDefinitionsCache.delete(id);
    return undefined;
  }
  
  return cached.name;
}

// --- Field ---

export function setFieldName(id: string, name: string): void {
  const existing = fieldsCache.get(id);
  if (existing?.name === name) return;
  
  fieldsCache.set(id, {
    name,
    updatedAt: Date.now(),
  });
  notifyListeners();
}

export function getFieldName(id: string): string | undefined {
  const cached = fieldsCache.get(id);
  if (!cached) return undefined;
  
  if (Date.now() - cached.updatedAt > CACHE_TTL) {
    fieldsCache.delete(id);
    return undefined;
  }
  
  return cached.name;
}

// --- Environment ---

export function setEnvironmentName(id: string, name: string): void {
  const existing = environmentsCache.get(id);
  if (existing?.name === name) return;
  
  environmentsCache.set(id, {
    name,
    updatedAt: Date.now(),
  });
  notifyListeners();
}

export function getEnvironmentName(id: string): string | undefined {
  const cached = environmentsCache.get(id);
  if (!cached) return undefined;
  
  if (Date.now() - cached.updatedAt > CACHE_TTL) {
    environmentsCache.delete(id);
    return undefined;
  }
  
  return cached.name;
}

// --- Admin ---

export function setAdminName(id: string, name: string): void {
  const existing = adminsCache.get(id);
  if (existing?.name === name) return;
  
  adminsCache.set(id, {
    name,
    updatedAt: Date.now(),
  });
  notifyListeners();
}

export function getAdminName(id: string): string | undefined {
  const cached = adminsCache.get(id);
  if (!cached) return undefined;
  
  if (Date.now() - cached.updatedAt > CACHE_TTL) {
    adminsCache.delete(id);
    return undefined;
  }
  
  return cached.name;
}

// --- Batch update (для удобства) ---

export interface BreadcrumbsCacheUpdate {
  entityDefinitionId?: string;
  entityDefinitionName?: string;
  fieldId?: string;
  fieldName?: string;
  environmentId?: string;
  environmentName?: string;
  adminId?: string;
  adminName?: string;
}

export function updateBreadcrumbsCache(data: BreadcrumbsCacheUpdate): void {
  if (data.entityDefinitionId && data.entityDefinitionName) {
    setEntityDefinitionName(data.entityDefinitionId, data.entityDefinitionName);
  }
  if (data.fieldId && data.fieldName) {
    setFieldName(data.fieldId, data.fieldName);
  }
  if (data.environmentId && data.environmentName) {
    setEnvironmentName(data.environmentId, data.environmentName);
  }
  if (data.adminId && data.adminName) {
    setAdminName(data.adminId, data.adminName);
  }
}

// --- Clear (для тестов или reset) ---

export function clearBreadcrumbsCache(): void {
  entityDefinitionsCache.clear();
  fieldsCache.clear();
  environmentsCache.clear();
  adminsCache.clear();
  notifyListeners();
}

