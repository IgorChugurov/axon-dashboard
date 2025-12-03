/**
 * Хук для загрузки данных списка через React Query
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { getListQueryKey } from "../utils/list-query-key";
import type { LoadParams, LoadDataFn, ServiceType } from "../types/list-types";

interface UseListQueryOptions<TData> {
  projectId: string;
  serviceType: ServiceType;
  params: LoadParams;
  onLoadData: LoadDataFn<TData>;
}

interface UseListQueryReturn<TData> {
  data: TData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
}

/**
 * Хук для загрузки данных списка через React Query
 *
 * Автоматически генерирует query key на основе параметров.
 * Использует кеширование (30s staleTime, 5min gcTime).
 *
 * ВАЖНО: placeholderData проверяет, что предыдущие данные относятся к тому же
 * serviceType и projectId, чтобы избежать показа данных из другого списка.
 */
export function useListQuery<TData extends { id: string }>({
  projectId,
  serviceType,
  params,
  onLoadData,
}: UseListQueryOptions<TData>): UseListQueryReturn<TData> {
  const queryKey = getListQueryKey(projectId, serviceType, params);

  // Отслеживаем предыдущий query key для проверки placeholderData
  const previousQueryKeyRef = useRef<readonly string[] | null>(null);

  // Ключевые части query key для проверки совпадения (projectId и serviceType)
  const keyPrefix = ["list", projectId, serviceType] as const;

  const {
    data: queryResult,
    isLoading: isQueryLoading,
    error: queryError,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      return await onLoadData(params, signal);
    },
    staleTime: 30 * 1000, // 30 секунд - данные считаются свежими
    gcTime: 5 * 60 * 1000, // 5 минут
    enabled: true,
    // Принудительно обновляем данные при монтировании, если изменился serviceType или projectId
    refetchOnMount: "always", // Всегда проверяем свежесть данных при монтировании
    refetchOnWindowFocus: false, // Не перезагружать при фокусе окна
    refetchOnReconnect: true, // Перезагружать при переподключении
    // Показываем предыдущие данные только если они относятся к тому же списку
    // (тот же projectId и serviceType)
    placeholderData: (previousData, previousQuery) => {
      // Если нет предыдущих данных, не показываем placeholder
      if (!previousData) {
        previousQueryKeyRef.current = null;
        return undefined;
      }

      // Получаем ключ предыдущего запроса
      const prevKey = previousQuery?.queryKey;
      if (!prevKey || !Array.isArray(prevKey)) {
        previousQueryKeyRef.current = null;
        return undefined;
      }

      // Проверяем, что ключевые части совпадают (list, projectId, serviceType)
      // Это гарантирует, что мы не показываем данные из другого списка
      if (prevKey.length < 3) {
        previousQueryKeyRef.current = null;
        return undefined;
      }

      const prevPrefix = prevKey.slice(0, 3);
      const currentPrefix = keyPrefix;

      // Сравниваем префиксы (projectId и serviceType должны совпадать)
      const prefixesMatch =
        prevPrefix[0] === currentPrefix[0] &&
        prevPrefix[1] === currentPrefix[1] &&
        prevPrefix[2] === currentPrefix[2];

      if (!prefixesMatch) {
        // Это другой список - не показываем placeholder данные
        previousQueryKeyRef.current = null;
        return undefined;
      }

      // Это тот же список (только изменились параметры пагинации/фильтров)
      // Можно показать предыдущие данные для плавного перехода
      previousQueryKeyRef.current = prevKey as readonly string[];
      return previousData;
    },
  });

  // Обновляем ref при изменении query key
  previousQueryKeyRef.current = queryKey;

  // Извлекаем данные и пагинацию из результата
  const data = queryResult?.data || [];
  const pagination = queryResult?.pagination || {
    page: params.page,
    limit: params.limit,
    total: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };

  return {
    data,
    pagination,
    isLoading: isQueryLoading,
    isFetching,
    error: queryError instanceof Error ? queryError : null,
  };
}
