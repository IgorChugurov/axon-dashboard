/**
 * Компонент фильтра с ленивой загрузкой options
 * Загружает options только при открытии Popover через useEntityOptions
 */

"use client";

import * as React from "react";
import { DataTableFacetedFilter } from "./DataTableFacetedFilter";
import { useEntityOptions } from "@/hooks/use-entity-options";
import type { Field } from "@/lib/universal-entity/types";
import type { FilterMode } from "./types/list-types";

interface FilterFieldProps {
  field: Field;
  value?: string[];
  onChange?: (value: string[]) => void;
  filterMode?: FilterMode;
  onFilterModeChange?: (mode: FilterMode) => void;
}

export function FilterField({
  field,
  value = [],
  onChange,
  filterMode = "any",
  onFilterModeChange,
}: FilterFieldProps) {
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  // Определяем, является ли поле relation-полем
  const isRelationField =
    !!field.relatedEntityDefinitionId &&
    (field.dbType === "manyToOne" ||
      field.dbType === "oneToOne" ||
      field.dbType === "manyToMany" ||
      field.dbType === "oneToMany");

  // Загружаем options только если Popover открыт и это relation-поле
  const shouldLoadOptions = popoverOpen && isRelationField;

  const {
    data: optionsData,
    isLoading,
    error,
  } = useEntityOptions(field.relatedEntityDefinitionId || "", {
    enabled: shouldLoadOptions,
  });

  // Преобразуем options в формат для DataTableFacetedFilter
  const options = React.useMemo(() => {
    // Если это relation-поле и данные загружены
    if (isRelationField && optionsData?.options) {
      return optionsData.options.map((opt) => ({
        label: opt.title,
        value: opt.id,
      }));
    }

    // Если options уже есть в поле (для не-relation полей), используем их
    return (
      field.options?.map((opt) => ({
        label: opt.name,
        value: opt.id,
      })) || []
    );
  }, [optionsData, field.options, isRelationField]);

  return (
    <DataTableFacetedFilter
      title={field.label}
      options={options}
      value={value}
      onChange={onChange}
      showModeToggle={isRelationField}
      filterMode={filterMode}
      onFilterModeChange={onFilterModeChange}
      onOpenChange={setPopoverOpen}
      isLoading={shouldLoadOptions && isLoading}
      error={shouldLoadOptions && error ? error.message : undefined}
    />
  );
}
