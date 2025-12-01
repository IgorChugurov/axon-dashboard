/**
 * Компонент фильтра с множественным выбором (faceted filter)
 * Адаптирован для серверной фильтрации
 * Использует кастомный список вместо Command
 * Поддерживает переключение режима фильтрации: ANY (хотя бы один) / ALL (все)
 */

import * as React from "react";
import { PlusCircle, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { FilterMode } from "./types/list-types";

interface DataTableFacetedFilterProps {
  title?: string;
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  value?: string[]; // Массив выбранных значений
  onChange?: (value: string[]) => void;
  /** Показывать toggle для режима фильтрации */
  showModeToggle?: boolean;
  /** Текущий режим фильтрации: 'any' (по умолчанию) или 'all' */
  filterMode?: FilterMode;
  /** Callback при изменении режима фильтрации */
  onFilterModeChange?: (mode: FilterMode) => void;
  /** Callback при изменении состояния открытия Popover */
  onOpenChange?: (open: boolean) => void;
  /** Показывать состояние загрузки */
  isLoading?: boolean;
  /** Сообщение об ошибке */
  error?: string;
}

export function DataTableFacetedFilter({
  title,
  options,
  value = [],
  onChange,
  showModeToggle = false,
  filterMode = "any",
  onFilterModeChange,
  onOpenChange,
  isLoading = false,
  error,
}: DataTableFacetedFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Обработчик изменения состояния открытия
  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    [onOpenChange]
  );

  // Обработчик переключения режима фильтрации
  const handleModeToggle = React.useCallback(
    (checked: boolean) => {
      onFilterModeChange?.(checked ? "all" : "any");
    },
    [onFilterModeChange]
  );

  // Используем useMemo для создания Set из value, чтобы он обновлялся при изменении value
  const selectedValues = React.useMemo(() => new Set(value), [value]);

  // Фильтруем опции по поисковому запросу
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  const handleSelect = React.useCallback(
    (optionValue: string) => {
      if (!onChange) return;
      // Создаем новый Set из текущего value
      const currentSelected = new Set(value);
      if (currentSelected.has(optionValue)) {
        currentSelected.delete(optionValue);
      } else {
        currentSelected.add(optionValue);
      }
      const newValue = Array.from(currentSelected);
      onChange(newValue);
    },
    [value, onChange]
  );

  const handleClear = React.useCallback(() => {
    onChange?.([]);
  }, [onChange]);

  const handleClose = React.useCallback(() => {
    setOpen(false);
    setSearchQuery("");
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircle className="h-4 w-4" />
          {title}
          {selectedValues.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedValues.size}
              </Badge>
              <div className="hidden gap-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Заголовок с поиском и кнопкой закрытия */}
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder={title}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 border-0 bg-transparent px-0 py-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 ml-auto"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Список опций */}
        <div className="max-h-[300px] overflow-y-auto p-1">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading options...
            </div>
          ) : error ? (
            <div className="py-6 text-center text-sm text-destructive">
              {error}
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {filteredOptions.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground",
                      isSelected &&
                        "bg-accent text-accent-foreground font-medium"
                    )}
                  >
                    {option.icon && (
                      <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Toggle режима фильтрации и кнопка очистки */}
        {selectedValues.size > 0 && (
          <>
            <Separator />
            {/* Toggle режима фильтрации: ANY / ALL */}
            {showModeToggle && selectedValues.size > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <Label
                  htmlFor="filter-mode-toggle"
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  {filterMode === "any" ? "Any of" : "All of"}
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Any</span>
                  <Switch
                    id="filter-mode-toggle"
                    checked={filterMode === "all"}
                    onCheckedChange={handleModeToggle}
                    className="h-4 w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                  />
                  <span className="text-xs text-muted-foreground">All</span>
                </div>
              </div>
            )}
            <div className="p-1">
              <button
                type="button"
                onClick={handleClear}
                className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground justify-center text-center"
              >
                Clear filters
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
