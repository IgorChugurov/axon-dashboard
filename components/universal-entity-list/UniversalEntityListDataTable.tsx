/**
 * Универсальный компонент списка на основе TanStack Table
 * Использует серверную пагинацию и загрузку данных
 *
 * Упрощенная версия после рефакторинга:
 * - Логика параметров вынесена в useListParams
 * - Логика загрузки данных вынесена в useListQuery
 * - Компонент фокусируется только на рендеринге UI
 */

"use client";

import { useState, useEffect, useRef } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  PaginationState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { DataTableHeader } from "./DataTableHeader";
import { DataTableToolbar } from "./DataTableToolbar";
import { DataTablePagination } from "./DataTablePagination";
import { useListParams } from "./hooks/use-list-params";
import { useListQuery } from "./hooks/use-list-query";
import type {
  LoadDataFn,
  ServiceType,
  RoutingConfig,
} from "./types/list-types";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type { EntityDefinition, Field } from "@/lib/universal-entity/types";
import { useRouter } from "next/navigation";

interface UniversalEntityListDataTableProps<TData extends { id: string }> {
  columns: ColumnDef<TData>[];
  entityDefinition: EntityDefinition;
  uiConfig: EntityUIConfig;
  fields?: Field[]; // Поля для генерации фильтров
  projectId: string;
  serviceType: ServiceType;
  onLoadData: LoadDataFn<TData>;
  routing: RoutingConfig;
  // Эти пропсы используются в UniversalEntityListClient через generateColumnsFromConfig
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEdit?: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDelete?: (id: string) => void | Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onLink?: (id: string, additionalUrl?: string) => void;
}

export function UniversalEntityListDataTable<TData extends { id: string }>({
  columns,
  entityDefinition,
  uiConfig,
  fields = [],
  projectId,
  serviceType,
  onLoadData,
  routing,
  // Эти пропсы используются в UniversalEntityListClient через generateColumnsFromConfig
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEdit,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDelete,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onLink,
}: UniversalEntityListDataTableProps<TData>) {
  const router = useRouter();
  const { list } = uiConfig;
  const pageSize = list.pageSize || 20;

  // Единый источник истины для параметров (State - единственный источник истины)
  const { params, setParams, searchInput, setSearchInput } = useListParams({
    projectId,
    serviceType,
    pageSize,
  });

  // Загрузка данных через React Query (всегда на клиенте)
  const {
    data,
    pagination: paginationInfo,
    isLoading,
    isFetching,
    error,
  } = useListQuery({
    projectId,
    serviceType,
    params,
    onLoadData,
  });

  // Отслеживаем, была ли уже первая загрузка данных
  const hasLoadedOnceRef = useRef(false);
  useEffect(() => {
    if (data.length > 0 || !isLoading) {
      hasLoadedOnceRef.current = true;
    }
  }, [data.length, isLoading]);

  // Состояние пагинации для TanStack Table (синхронизируется с данными из React Query)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: params.page - 1,
    pageSize: params.limit,
  });

  // Синхронизируем пагинацию TanStack Table с данными из React Query
  // Используем примитивные значения в зависимостях, чтобы избежать бесконечного цикла
  useEffect(() => {
    const newPageIndex = paginationInfo.page - 1;
    const newPageSize = paginationInfo.limit;

    // Обновляем только если значения действительно изменились
    if (
      pagination.pageIndex !== newPageIndex ||
      pagination.pageSize !== newPageSize
    ) {
      setPagination({
        pageIndex: newPageIndex,
        pageSize: newPageSize,
      });
    }
  }, [
    paginationInfo.page,
    paginationInfo.limit,
    pagination.pageIndex,
    pagination.pageSize,
    params.page,
    params.limit,
  ]);

  // Вычисляемые значения для удобства
  const hasError = !!error;
  const errorMessage = error?.message || "Failed to load data";
  // Не показываем empty состояние во время загрузки (если данные уже были загружены)
  const isInitialLoading =
    isLoading && data.length === 0 && !hasLoadedOnceRef.current;
  // Не показываем empty во время загрузки (даже если данные уже были загружены)
  const isEmpty = !isLoading && !hasError && data.length === 0 && !searchInput;
  const isSearchEmpty =
    !isLoading && !hasError && data.length === 0 && !!searchInput;
  const hasData =
    (!isLoading || hasLoadedOnceRef.current) && !hasError && data.length > 0;

  // Инициализация таблицы
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true, // Используем серверную пагинацию
    pageCount: paginationInfo.totalPages,
    state: {
      pagination,
    },
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const newPagination = updater(pagination);
        setPagination(newPagination);
        // Обновляем params при изменении пагинации
        setParams({
          page: newPagination.pageIndex + 1,
        });
      }
    },
  });

  // =====================================================
  // Обработчики действий
  // =====================================================

  const handleCreate = () => {
    const url = routing.createUrlTemplate.replace("{projectId}", projectId);
    // Передаём текущий limit для сохранения размера страницы после создания
    const urlWithParams =
      params.limit !== pageSize ? `${url}?returnLimit=${params.limit}` : url;
    router.push(urlWithParams);
  };

  const handleRetry = () => {
    // React Query автоматически перезагрузит данные при изменении queryKey
    // Просто обновляем params чтобы триггернуть новый запрос
    setParams({});
  };

  const handleClearSearch = () => {
    setSearchInput("");
  };

  // =====================================================
  // РЕНДЕРИНГ
  // =====================================================

  // ERROR - Показываем ошибку с возможностью повтора
  if (hasError) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold mb-2 text-destructive">
              Error loading data
            </h3>
            <p className="text-muted-foreground mb-4">{errorMessage}</p>
            <Button onClick={handleRetry} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // LOADING (только первая загрузка) - Показываем только индикатор загрузки
  // Не показываем loading при изменении размера страницы или пагинации
  if (isInitialLoading) {
    return (
      <Card className="w-full">
        <DataTableHeader
          pageTitle={list.pageTitle}
          description={entityDefinition.description || ""}
        />
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // EMPTY (нет данных, не было поиска) - Показываем пустое состояние
  if (isEmpty) {
    return (
      <Card className="w-full">
        <DataTableHeader
          pageTitle={list.pageTitle}
          description={entityDefinition.description || ""}
        />
        <CardContent className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold mb-2">
              {list.emptyStateTitle}
            </h3>
            {list.emptyStateMessages.map((msg, i) => (
              <p key={i} className="text-muted-foreground mb-2">
                {msg}
              </p>
            ))}
            {list.showCreateButton && (
              <Button onClick={handleCreate} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                {list.createButtonText}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <DataTableHeader
        pageTitle={list.pageTitle}
        description={entityDefinition.description || ""}
        statistics={
          list.enablePagination && paginationInfo.total > 0
            ? {
                total: paginationInfo.total,
                currentPage: paginationInfo.page,
                pageSize: paginationInfo.limit,
                totalPages: paginationInfo.totalPages,
              }
            : undefined
        }
      />
      <CardContent className="space-y-4">
        {/* Toolbar с поиском, фильтрами и кнопкой создания */}
        <DataTableToolbar
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder={list.searchPlaceholder}
          showSearch={list.showSearch}
          enableFilters={list.enableFilters}
          fields={fields}
          filters={params.filters}
          onFiltersChange={(newFilters) => {
            setParams({ filters: newFilters, page: 1 }); // Сбрасываем на первую страницу при изменении фильтров
          }}
          showCreateButton={list.showCreateButton}
          createButtonText={list.createButtonText}
          onCreate={handleCreate}
        />

        {/* SEARCH_EMPTY - Поиск выполнен, но результатов нет */}
        {isSearchEmpty && (
          <div className="text-center py-8 border rounded-lg">
            <p className="text-muted-foreground">
              No results found for &quot;{searchInput}&quot;
            </p>
            <Button variant="link" onClick={handleClearSearch} className="mt-2">
              Clear search
            </Button>
          </div>
        )}

        {/* SUCCESS или LOADING (обновление данных) - Показываем таблицу */}
        {hasData && (
          <div className="relative overflow-hidden rounded-md border">
            {/* Overlay loading при обновлении данных (не при первой загрузке) */}
            {isFetching && hasLoadedOnceRef.current && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Пагинация */}
        {list.enablePagination && data.length > 0 && !isLoading && (
          <DataTablePagination
            page={paginationInfo.page}
            pageSize={paginationInfo.limit}
            total={paginationInfo.total}
            totalPages={paginationInfo.totalPages}
            hasPreviousPage={paginationInfo.hasPreviousPage}
            hasNextPage={paginationInfo.hasNextPage}
            onPageChange={(newPage) => {
              setParams({ page: newPage });
            }}
            onPageSizeChange={(newPageSize) => {
              setParams({
                limit: newPageSize,
                page: 1, // Сбрасываем на первую страницу при изменении размера
              });
            }}
            disabled={isLoading}
          />
        )}
      </CardContent>
    </Card>
  );
}
