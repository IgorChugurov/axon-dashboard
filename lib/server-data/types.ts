// Общие типы для серверных данных

export interface ServerDataParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, unknown>;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ServerDataResponse<T> {
  data: T[];
  pagination?: PaginationInfo;
  config?: unknown;
}

export interface ServerDataError {
  error: string;
  message?: string;
  details?: string;
}

// Функция для парсинга searchParams из Next.js
export function parseSearchParams(searchParams: {
  [key: string]: string | string[] | undefined;
}): ServerDataParams {
  const params: ServerDataParams = {};

  if (searchParams.page) {
    const page = Array.isArray(searchParams.page)
      ? searchParams.page[0]
      : searchParams.page;
    params.page = parseInt(page, 10) || 1;
  }

  if (searchParams.limit) {
    const limit = Array.isArray(searchParams.limit)
      ? searchParams.limit[0]
      : searchParams.limit;
    params.limit = parseInt(limit, 10) || 16;
  }

  if (searchParams.search) {
    params.search = Array.isArray(searchParams.search)
      ? searchParams.search[0]
      : searchParams.search;
  }

  if (searchParams.sortBy) {
    params.sortBy = Array.isArray(searchParams.sortBy)
      ? searchParams.sortBy[0]
      : searchParams.sortBy;
  }

  if (searchParams.sortOrder) {
    const sortOrder = Array.isArray(searchParams.sortOrder)
      ? searchParams.sortOrder[0]
      : searchParams.sortOrder;
    params.sortOrder = sortOrder === "desc" ? "desc" : "asc";
  }

  // Обработка фильтров (если есть)
  if (searchParams.filters) {
    try {
      params.filters = JSON.parse(
        Array.isArray(searchParams.filters)
          ? searchParams.filters[0]
          : searchParams.filters
      );
    } catch {
      // Игнорируем невалидный JSON
    }
  }

  return params;
}

// Функция для построения URL с параметрами
export function buildUrlWithParams(
  baseUrl: string,
  params: ServerDataParams
): string {
  // Если это относительный путь, используем простую конкатенацию
  if (baseUrl.startsWith("/")) {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set("currentPage", params.page.toString());
    if (params.limit) searchParams.set("perPage", params.limit.toString());
    if (params.search) searchParams.set("search", params.search);
    if (params.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  // Если это полный URL, используем URL constructor
  const url = new URL(baseUrl);

  if (params.page) url.searchParams.set("currentPage", params.page.toString());
  if (params.limit) url.searchParams.set("perPage", params.limit.toString());
  if (params.search) url.searchParams.set("search", params.search);
  if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params.sortOrder) url.searchParams.set("sortOrder", params.sortOrder);

  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value.toString());
      }
    });
  }

  return url.toString();
}
