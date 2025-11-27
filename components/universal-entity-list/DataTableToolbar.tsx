/**
 * Компонент toolbar для таблицы данных
 * Отображает поиск, фильтры и кнопку создания
 */

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { DataTableFacetedFilter } from "./DataTableFacetedFilter";
import type { Field } from "@/lib/universal-entity/types";
import type { FilterMode } from "./types/list-types";

interface DataTableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  // Фильтры
  enableFilters?: boolean;
  fields?: Field[]; // Поля для генерации фильтров
  filters?: Record<string, string[]>; // Текущие значения фильтров
  onFiltersChange?: (filters: Record<string, string[]>) => void;
  // Режимы фильтрации для каждого поля
  filterModes?: Record<string, FilterMode>;
  onFilterModesChange?: (modes: Record<string, FilterMode>) => void;
  // Кнопка создания
  showCreateButton?: boolean;
  createButtonText?: string;
  onCreate?: () => void;
}

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  showSearch = true,
  enableFilters = false,
  fields = [],
  filters = {},
  onFiltersChange,
  filterModes = {},
  onFilterModesChange,
  showCreateButton = false,
  createButtonText = "Create",
  onCreate,
}: DataTableToolbarProps) {
  // Получаем поля, которые можно фильтровать
  const filterableFields = fields.filter(
    (field) =>
      field.filterableInList && field.options && field.options.length > 0
  );

  // Проверяем, является ли поле relation-полем (для показа toggle режима)
  const isRelationField = (field: Field): boolean => {
    return (
      field.dbType === "manyToOne" ||
      field.dbType === "oneToOne" ||
      field.dbType === "manyToMany" ||
      field.dbType === "oneToMany"
    );
  };

  // Обработчик изменения фильтра для конкретного поля
  const handleFilterChange = (fieldName: string, value: string[]) => {
    const newFilters = { ...filters };
    if (value.length === 0) {
      delete newFilters[fieldName];
    } else {
      newFilters[fieldName] = value;
    }
    onFiltersChange?.(newFilters);
  };

  // Обработчик изменения режима фильтрации для конкретного поля
  const handleFilterModeChange = (fieldName: string, mode: FilterMode) => {
    const newModes = { ...filterModes, [fieldName]: mode };
    onFilterModesChange?.(newModes);
  };

  const hasFilters = enableFilters && filterableFields.length > 0;
  const hasContent = showSearch || hasFilters || showCreateButton;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 flex-wrap justify-between">
      <div className="flex items-center gap-2 flex-wrap">
        {showSearch && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Фильтры */}
        {hasFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            {filterableFields.map((field) => {
              const options =
                field.options?.map((opt) => ({
                  label: opt.name,
                  value: opt.id,
                })) || [];

              // Для relation-полей показываем toggle режима фильтрации
              const showModeToggle = isRelationField(field);

              return (
                <DataTableFacetedFilter
                  key={field.name}
                  title={field.label}
                  options={options}
                  value={filters[field.name] || []}
                  onChange={(value) => handleFilterChange(field.name, value)}
                  showModeToggle={showModeToggle}
                  filterMode={filterModes[field.name] || "any"}
                  onFilterModeChange={(mode) =>
                    handleFilterModeChange(field.name, mode)
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Кнопка создания */}
      {showCreateButton && onCreate && (
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {createButtonText}
        </Button>
      )}
    </div>
  );
}
