"use client";
/**
 * Хук для управления параметрами списка
 * УПРОЩЕННЫЙ ПОДХОД: State как единственный источник истины
 *
 * Принцип:
 * - При первом рендере: читаем из URL → инициализируем state
 * - После первого рендера: state - единственный источник истины
 * - При изменении state: React Query видит изменения сразу → загружает данные
 * - URL обновляется односторонне (state → URL) для синхронизации
 * - При возврате на страницу: снова первый рендер → читаем из URL → React Query использует кеш
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import type { LoadParams } from "../types/list-types";

interface UseListParamsOptions {
  projectId: string;
  serviceType: string;
  pageSize: number;
}

interface UseListParamsReturn {
  params: LoadParams;
  setParams: (updates: Partial<LoadParams>) => void;
  searchInput: string;
  setSearchInput: (value: string) => void;
  isPending: boolean;
}

/**
 * Хук для управления параметрами списка
 *
 * УПРОЩЕННЫЙ ПОДХОД:
 * - При первом рендере: читаем из URL → инициализируем state
 * - State - единственный источник истины после первого рендера
 * - React Query видит изменения state сразу через params
 * - URL обновляется односторонне (state → URL) для синхронизации
 */
export function useListParams({
  projectId,
  serviceType,
  pageSize,
}: UseListParamsOptions): UseListParamsReturn {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Ref для отслеживания, обновляем ли мы URL сами (чтобы избежать бесконечного цикла)
  const isUpdatingUrlRef = useRef(false);

  // Читаем параметры из URL (только для инициализации при первом рендере)
  const urlPage = searchParams.get("page");
  const urlLimit = searchParams.get("limit");
  // URLSearchParams автоматически декодирует кириллические символы при get()
  const urlSearch = searchParams.get("search");
  
  // Читаем фильтры из URL (формат: ?type=string,number)
  const urlFilters: Record<string, string[]> = {};
  searchParams.forEach((value, key) => {
    // Пропускаем стандартные параметры
    if (key !== "page" && key !== "limit" && key !== "search") {
      // Разделяем значения через запятую
      const values = value.split(",").filter(Boolean);
      if (values.length > 0) {
        urlFilters[key] = values;
      }
    }
  });

  // Парсинг и валидация из URL
  const urlPageParsed = urlPage
    ? (() => {
        const parsed = parseInt(urlPage, 10);
        return parsed > 0 ? parsed : 1;
      })()
    : 1;

  const urlLimitParsed = urlLimit
    ? (() => {
        const parsed = parseInt(urlLimit, 10);
        return parsed > 0 ? parsed : pageSize;
      })()
    : pageSize;

  const urlSearchParsed = urlSearch || "";

  // State - единственный источник истины после первого рендера
  // Инициализируем из URL при монтировании
  const [params, setParamsState] = useState<LoadParams>(() => ({
    page: urlPageParsed,
    limit: urlLimitParsed,
    search: urlSearchParsed || undefined,
    filters: Object.keys(urlFilters).length > 0 ? urlFilters : undefined,
  }));

  // Состояние для поиска в UI (отдельно для debounce)
  // Инициализируем из URL при монтировании
  const [searchInput, setSearchInputState] = useState(urlSearchParsed);

  // Функция для обновления URL без SSR (через window.history.pushState)
  const updateURL = useCallback(
    (updates: { 
      page?: number; 
      limit?: number; 
      search?: string;
      filters?: Record<string, string[]>;
    }) => {
      // Используем window.location.search для получения актуальных параметров из URL
      // Это гарантирует, что мы всегда работаем с актуальными данными, а не с устаревшим searchParams
      const currentSearch =
        typeof window !== "undefined" ? window.location.search : "";
      const currentParams = new URLSearchParams(currentSearch);

      // Обновляем page
      if (updates.page !== undefined) {
        if (updates.page === 1) {
          currentParams.delete("page");
        } else {
          currentParams.set("page", updates.page.toString());
        }
      }

      // Обновляем limit
      if (updates.limit !== undefined) {
        // Если limit равен дефолтному pageSize, не сохраняем в URL (для чистоты URL)
        if (updates.limit === pageSize) {
          currentParams.delete("limit");
        } else {
          currentParams.set("limit", updates.limit.toString());
        }
      }

      // Обновляем search
      if (updates.search !== undefined) {
        // Удаляем search если значение пустое (пустая строка, undefined, null)
        if (!updates.search || updates.search === "") {
          currentParams.delete("search");
        } else {
          // URLSearchParams автоматически кодирует кириллические и другие специальные символы
          currentParams.set("search", updates.search);
        }
      }

      // Обновляем фильтры
      if (updates.filters !== undefined) {
        // Удаляем все существующие фильтры (кроме стандартных параметров)
        const keysToDelete: string[] = [];
        currentParams.forEach((_, key) => {
          if (key !== "page" && key !== "limit" && key !== "search") {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach((key) => currentParams.delete(key));

        // Добавляем новые фильтры
        if (updates.filters && Object.keys(updates.filters).length > 0) {
          Object.entries(updates.filters).forEach(([key, values]) => {
            if (values && values.length > 0) {
              // Объединяем значения через запятую
              currentParams.set(key, values.join(","));
            }
          });
        }
      }

      // Обновляем URL через window.history.pushState (БЕЗ SSR)
      const paramsString = currentParams.toString();
      const newUrl = paramsString ? `${pathname}?${paramsString}` : pathname;

      // Используем window.history.pushState для обновления URL без навигации
      isUpdatingUrlRef.current = true;
      window.history.pushState(null, "", newUrl);
      // Сбрасываем флаг после небольшой задержки, чтобы useEffect не сработал
      setTimeout(() => {
        isUpdatingUrlRef.current = false;
      }, 0);
    },
    [pathname, pageSize]
  );

  // Функция для обновления параметров
  const setParams = useCallback(
    (updates: Partial<LoadParams>) => {
      // Обновляем state (React Query видит изменения сразу)
      setParamsState((prev) => ({
        ...prev,
        ...updates,
      }));

      // Подготавливаем обновления для URL (односторонняя синхронизация)
      const urlUpdates: { 
        page?: number; 
        limit?: number; 
        search?: string;
        filters?: Record<string, string[]>;
      } = {};

      if (updates.page !== undefined) {
        urlUpdates.page = updates.page;
      }

      if (updates.limit !== undefined) {
        urlUpdates.limit = updates.limit;
      }

      if (updates.search !== undefined) {
        urlUpdates.search = updates.search;
      }

      if (updates.filters !== undefined) {
        urlUpdates.filters = updates.filters;
      }

      // Обновляем URL для синхронизации (асинхронно, не блокирует)
      updateURL(urlUpdates);
    },
    [updateURL]
  );

  // Debounce для поиска с защитой от сброса page при инициализации
  //
  // Проблема: при возврате на страницу searchInput инициализируется из URL,
  // и useEffect срабатывает, сбрасывая page на 1. Это нужно предотвратить.
  //
  // Решение: проверяем, совпадает ли searchInput с текущим params.search.
  // Если совпадает - это инициализация, пропускаем обновление.
  const prevSearchInputRef = useRef<string>(searchInput);

  useEffect(() => {
    // Проверка 1: Это инициализация из URL?
    // Если searchInput совпадает с params.search, значит компонент только что загрузился
    // и searchInput был восстановлен из URL. В этом случае не обновляем параметры.
    const currentSearchInParams = params.search || "";
    const currentSearchInput = searchInput || "";

    if (currentSearchInput === currentSearchInParams) {
      // Это инициализация - просто сохраняем значение и выходим
      prevSearchInputRef.current = searchInput;
      return;
    }

    // Проверка 2: Поиск реально изменился?
    // Если searchInput не изменился с последнего рендера, не обновляем параметры.
    if (searchInput === prevSearchInputRef.current) {
      return;
    }

    // Поиск изменился - обновляем параметры через 300ms (debounce)
    const timer = setTimeout(() => {
      setParams({
        search: searchInput.trim() || "", // Пустая строка удалит search из URL
        page: 1, // При изменении поиска всегда сбрасываем на первую страницу
      });
      prevSearchInputRef.current = searchInput;
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput, setParams, params.search]);

  // Синхронизация с URL при изменении URL извне (браузерная навигация)
  // Обрабатываем событие popstate для браузерной навигации
  useEffect(() => {
    const handlePopState = () => {
      // При браузерной навигации (назад/вперед) обновляем state из URL
      const urlParams = new URLSearchParams(window.location.search);
      const urlPage = urlParams.get("page");
      const urlLimit = urlParams.get("limit");
      const urlSearch = urlParams.get("search");

      const urlPageParsed = urlPage
        ? (() => {
            const parsed = parseInt(urlPage, 10);
            return parsed > 0 ? parsed : 1;
          })()
        : 1;

      const urlLimitParsed = urlLimit
        ? (() => {
            const parsed = parseInt(urlLimit, 10);
            return parsed > 0 ? parsed : pageSize;
          })()
        : pageSize;

      const urlSearchParsed = urlSearch || "";

      // Читаем фильтры из URL
      const urlFiltersParsed: Record<string, string[]> = {};
      urlParams.forEach((value, key) => {
        if (key !== "page" && key !== "limit" && key !== "search") {
          const values = value.split(",").filter(Boolean);
          if (values.length > 0) {
            urlFiltersParsed[key] = values;
          }
        }
      });

      setParamsState({
        page: urlPageParsed,
        limit: urlLimitParsed,
        search: urlSearchParsed || undefined,
        filters: Object.keys(urlFiltersParsed).length > 0 ? urlFiltersParsed : undefined,
      });

      setSearchInputState(urlSearchParsed);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pageSize]);

  return {
    params,
    setParams,
    searchInput,
    setSearchInput: setSearchInputState,
    isPending: false,
  };
}
