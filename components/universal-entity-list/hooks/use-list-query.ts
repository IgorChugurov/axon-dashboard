/**
 * Хук для загрузки данных списка через React Query
 */

import { useQuery } from "@tanstack/react-query";
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
 */
export function useListQuery<TData extends { id: string }>({
  projectId,
  serviceType,
  params,
  onLoadData,
}: UseListQueryOptions<TData>): UseListQueryReturn<TData> {
  const queryKey = getListQueryKey(projectId, serviceType, params);

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
    staleTime: 30 * 1000, // 30 секунд
    gcTime: 5 * 60 * 1000, // 5 минут
    enabled: true,
    // Показываем предыдущие данные во время загрузки новых (плавный переход без loading)
    placeholderData: (previousData) => previousData,
  });

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
