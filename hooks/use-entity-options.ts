/**
 * Хук для загрузки options для relation-полей
 * Использует React Query для кэширования и дедупликации запросов
 *
 * Все компоненты, использующие один и тот же relatedEntityDefinitionId,
 * будут использовать один и тот же запрос и кэш
 */

import { useQuery } from "@tanstack/react-query";

interface Option {
  id: string;
  title: string;
}

interface EntityOptionsData {
  options: Option[];
  titleField: string;
}

/**
 * Загружает options для relation-поля через API
 */
async function loadEntityOptions(
  relatedEntityDefinitionId: string
): Promise<EntityOptionsData> {
  const response = await fetch(
    `/api/entities/${relatedEntityDefinitionId}/options`
  );

  if (!response.ok) {
    throw new Error(`Failed to load options: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    options: data.options || [],
    titleField: data.titleField || "id",
  };
}

/**
 * Хук для загрузки options для relation-поля
 *
 * @param relatedEntityDefinitionId - ID связанной сущности
 * @returns Данные options, состояние загрузки и ошибки
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useEntityOptions(relatedEntityDefinitionId);
 * const options = data?.options || [];
 * ```
 */
export function useEntityOptions(relatedEntityDefinitionId: string) {
  return useQuery({
    queryKey: ["entity-options", relatedEntityDefinitionId],
    queryFn: () => loadEntityOptions(relatedEntityDefinitionId),
    staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
    gcTime: 10 * 60 * 1000, // 10 минут - кэш хранится в памяти
    retry: 1, // повторить 1 раз при ошибке
    retryDelay: 1000, // задержка перед повтором (1 секунда)
  });
}

export type { Option, EntityOptionsData };
