"use client";

import { useState, useEffect } from "react";
import {
  subscribeToBreadcrumbsCache,
  getEntityDefinitionName,
  getFieldName,
  getEnvironmentName,
  getAdminName,
} from "./breadcrumbs-cache";

/**
 * Hook для получения данных breadcrumbs из кеша
 * 
 * Использует useState + useEffect для реактивного обновления
 * при изменении кеша.
 */

interface BreadcrumbsData {
  entityDefinitionName: string | undefined;
  fieldName: string | undefined;
  environmentName: string | undefined;
  adminName: string | undefined;
}

interface UseBreadcrumbsDataParams {
  entityDefinitionId?: string;
  fieldId?: string;
  environmentId?: string;
  adminId?: string;
}

function getBreadcrumbsData(params: UseBreadcrumbsDataParams): BreadcrumbsData {
  return {
    entityDefinitionName: params.entityDefinitionId
      ? getEntityDefinitionName(params.entityDefinitionId)
      : undefined,
    fieldName: params.fieldId
      ? getFieldName(params.fieldId)
      : undefined,
    environmentName: params.environmentId
      ? getEnvironmentName(params.environmentId)
      : undefined,
    adminName: params.adminId
      ? getAdminName(params.adminId)
      : undefined,
  };
}

export function useBreadcrumbsData(params: UseBreadcrumbsDataParams): BreadcrumbsData {
  const { entityDefinitionId, fieldId, environmentId, adminId } = params;

  // Инициализируем с текущими значениями из кеша
  const [data, setData] = useState<BreadcrumbsData>(() => 
    getBreadcrumbsData(params)
  );

  useEffect(() => {
    // Обновляем при изменении параметров
    setData(getBreadcrumbsData({ entityDefinitionId, fieldId, environmentId, adminId }));

    // Подписываемся на изменения кеша
    const unsubscribe = subscribeToBreadcrumbsCache(() => {
      setData(getBreadcrumbsData({ entityDefinitionId, fieldId, environmentId, adminId }));
    });

    return unsubscribe;
  }, [entityDefinitionId, fieldId, environmentId, adminId]);

  return data;
}
