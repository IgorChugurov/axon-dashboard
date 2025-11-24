"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Компонент пагинации для серверной пагинации
 * Адаптирован из примера, но работает с серверной пагинацией через пропсы
 */
interface DataTablePaginationProps {
  /** Текущая страница (1-based) */
  page: number;
  /** Размер страницы */
  pageSize: number;
  /** Общее количество записей */
  total: number;
  /** Общее количество страниц */
  totalPages: number;
  /** Есть ли предыдущая страница */
  hasPreviousPage: boolean;
  /** Есть ли следующая страница */
  hasNextPage: boolean;
  /** Callback при изменении страницы */
  onPageChange: (page: number) => void;
  /** Callback при изменении размера страницы */
  onPageSizeChange: (pageSize: number) => void;
  /** Опции для выбора размера страницы */
  pageSizeOptions?: number[];
  /** Заблокирован ли компонент (во время загрузки) */
  disabled?: boolean;
}

export function DataTablePagination({
  page,
  pageSize,
  total,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 25, 30, 40, 50],
  disabled = false,
}: DataTablePaginationProps) {
  const handleFirstPage = () => {
    if (!disabled && hasPreviousPage) {
      onPageChange(1);
    }
  };

  const handlePreviousPage = () => {
    if (!disabled && hasPreviousPage) {
      onPageChange(page - 1);
    }
  };

  const handleNextPage = () => {
    if (!disabled && hasNextPage) {
      onPageChange(page + 1);
    }
  };

  const handleLastPage = () => {
    if (!disabled && hasNextPage && totalPages > 0) {
      onPageChange(totalPages);
    }
  };

  const handlePageSizeChange = (value: string) => {
    if (!disabled) {
      const newPageSize = Number(value);
      onPageSizeChange(newPageSize);
      // При изменении размера страницы сбрасываем на первую страницу
      onPageChange(1);
    }
  };

  return (
    <div className="flex items-center justify-between px-2">
      <div className="text-muted-foreground flex-1 text-sm">
        {total > 0 ? (
          <>
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, total)} of {total} row(s)
          </>
        ) : (
          <>No rows</>
        )}
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={handlePageSizeChange}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {page} of {totalPages > 0 ? totalPages : 1}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={handleFirstPage}
            disabled={!hasPreviousPage || disabled}
            aria-label="Go to first page"
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={handlePreviousPage}
            disabled={!hasPreviousPage || disabled}
            aria-label="Go to previous page"
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={handleNextPage}
            disabled={!hasNextPage || disabled}
            aria-label="Go to next page"
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={handleLastPage}
            disabled={!hasNextPage || disabled || totalPages === 0}
            aria-label="Go to last page"
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

