/**
 * Компонент заголовка таблицы данных
 * Отображает заголовок, описание, кнопку создания и статистику
 */

import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface DataTableHeaderProps {
  pageTitle: string;
  description?: string;
  statistics?: {
    total: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  };
}

export function DataTableHeader({
  pageTitle,
  description,
  statistics,
}: DataTableHeaderProps) {
  // Формируем текст описания с учетом статистики
  const descriptionText = description
    ? statistics
      ? `${description} • ${statistics.total} total`
      : description
    : statistics
    ? `${statistics.total} total`
    : undefined;

  return (
    <CardHeader>
      <CardTitle>{pageTitle}</CardTitle>
      {descriptionText && <CardDescription>{descriptionText}</CardDescription>}
    </CardHeader>
  );
}
