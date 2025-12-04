"use client";

import { useEffect } from "react";
import {
  updateBreadcrumbsCache,
  type BreadcrumbsCacheUpdate,
} from "./breadcrumbs-cache";

type BreadcrumbsCacheUpdaterProps = BreadcrumbsCacheUpdate;

/**
 * Клиентский компонент для обновления кеша breadcrumbs
 * 
 * Используется на серверных страницах для передачи имён сущностей в кеш.
 * Это позволяет Breadcrumbs компоненту отображать имена вместо "Entity Definition".
 * 
 * @example
 * // В серверной странице:
 * <BreadcrumbsCacheUpdater
 *   entityDefinitionId={entityDefinitionId}
 *   entityDefinitionName={entityDefinition.name}
 * />
 */
export function BreadcrumbsCacheUpdater({
  entityDefinitionId,
  entityDefinitionName,
  fieldId,
  fieldName,
  environmentId,
  environmentName,
  adminId,
  adminName,
}: BreadcrumbsCacheUpdaterProps) {
  useEffect(() => {
    updateBreadcrumbsCache({
      entityDefinitionId,
      entityDefinitionName,
      fieldId,
      fieldName,
      environmentId,
      environmentName,
      adminId,
      adminName,
    });
  }, [
    entityDefinitionId,
    entityDefinitionName,
    fieldId,
    fieldName,
    environmentId,
    environmentName,
    adminId,
    adminName,
  ]);

  // Компонент не рендерит ничего
  return null;
}

