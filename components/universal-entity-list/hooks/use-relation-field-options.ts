/**
 * Хук для загрузки options для relation-полей с filterableInList: true
 * Загружает options напрямую через Supabase (без API)
 *
 * Используется для заполнения options в фильтрах списка Entity Instances
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Field, FieldOption } from "@/lib/universal-entity/types";

interface RelationFieldInfo {
  fieldId: string;
  fieldName: string;
  relatedEntityDefinitionId: string;
}

interface OptionsData {
  options: FieldOption[];
  titleFieldName: string;
}

/**
 * Загружает options для одного relation поля через Supabase
 */
async function loadOptionsForRelation(
  relatedEntityDefinitionId: string
): Promise<OptionsData> {
  const supabase = createClient();

  // 1. Загружаем entity definition и поля
  type EntityDefRow = {
    id: string;
    project_id: string;
  };
  const { data: entityDef, error: entityDefError } = await supabase
    .from("entity_definition")
    .select("id, project_id")
    .eq("id", relatedEntityDefinitionId)
    .single();

  if (entityDefError || !entityDef) {
    console.error(
      "[useRelationFieldOptions] Entity definition not found:",
      relatedEntityDefinitionId
    );
    return { options: [], titleFieldName: "id" };
  }
  const typedEntityDef = entityDef as EntityDefRow;

  // 2. Загружаем поля для определения title field
  const { data: fields, error: fieldsError } = await supabase
    .from("field")
    .select("id, name, is_option_title_field, display_index")
    .eq("entity_definition_id", relatedEntityDefinitionId)
    .order("display_index");

  if (fieldsError) {
    console.error(
      "[useRelationFieldOptions] Failed to load fields:",
      fieldsError
    );
    return { options: [], titleFieldName: "id" };
  }

  // Находим поле для отображения названия (isOptionTitleField или первое поле)
  type FieldRow = {
    id: string;
    name: string;
    is_option_title_field: boolean;
    display_index: number;
  };
  const typedFields = (fields || []) as FieldRow[];
  const titleField =
    typedFields.find((f) => f.is_option_title_field) || typedFields[0];
  const titleFieldName = titleField?.name || "id";

  // 3. Загружаем экземпляры
  type InstanceRow = {
    id: string;
    data: Record<string, unknown>;
  };
  const { data: instances, error: instancesError } = await supabase
    .from("entity_instance")
    .select("id, data")
    .eq("entity_definition_id", relatedEntityDefinitionId)
    .eq("project_id", typedEntityDef.project_id)
    .limit(1000); // TODO: добавить пагинацию если нужно

  if (instancesError) {
    console.error(
      "[useRelationFieldOptions] Failed to load instances:",
      instancesError
    );
    return { options: [], titleFieldName };
  }

  // 4. Формируем options
  const typedInstances = (instances || []) as InstanceRow[];
  const options: FieldOption[] = typedInstances.map((instance) => {
    const data = instance.data as Record<string, unknown>;
    const title = data?.[titleFieldName] || instance.id;

    return {
      id: instance.id,
      name: String(title),
    };
  });

  return { options, titleFieldName };
}

interface UseRelationFieldOptionsResult {
  /** Поля с заполненными options для relation-полей */
  fieldsWithOptions: Field[];
  /** Флаг загрузки */
  isLoading: boolean;
  /** Ошибка загрузки */
  error: Error | null;
}

/**
 * Хук для загрузки options для relation-полей
 *
 * @param fields - Массив полей сущности
 * @returns Поля с заполненными options и статус загрузки
 *
 * @example
 * const { fieldsWithOptions, isLoading } = useRelationFieldOptions(fields);
 */
export function useRelationFieldOptions(
  fields: Field[]
): UseRelationFieldOptionsResult {
  // Находим relation-поля с filterableInList: true
  const relationFieldsToLoad = useMemo<RelationFieldInfo[]>(() => {
    const result = fields
      .filter(
        (field) =>
          field.filterableInList &&
          field.relatedEntityDefinitionId &&
          (field.dbType === "manyToOne" ||
            field.dbType === "oneToOne" ||
            field.dbType === "manyToMany" ||
            field.dbType === "oneToMany")
      )
      .map((field) => ({
        fieldId: field.id,
        fieldName: field.name,
        relatedEntityDefinitionId: field.relatedEntityDefinitionId!,
      }));

    //ßconsole.log("[useRelationFieldOptions] relationFieldsToLoad:", result);
    return result;
  }, [fields]);

  // Создаем стабильный ключ для React Query
  const queryKey = useMemo(() => {
    const ids = relationFieldsToLoad
      .map((f) => f.relatedEntityDefinitionId)
      .sort()
      .join(",");
    return ["relation-field-options", ids];
  }, [relationFieldsToLoad]);

  // Загружаем options через React Query (с кэшированием)
  const {
    data: optionsMap,
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (relationFieldsToLoad.length === 0) {
        return new Map<string, OptionsData>();
      }

      // Загружаем options для всех relation-полей параллельно
      const results = await Promise.all(
        relationFieldsToLoad.map(async (fieldInfo) => {
          const optionsData = await loadOptionsForRelation(
            fieldInfo.relatedEntityDefinitionId
          );
          return {
            fieldId: fieldInfo.fieldId,
            optionsData,
          };
        })
      );

      // Создаем Map для быстрого доступа
      const map = new Map<string, OptionsData>();
      results.forEach(({ fieldId, optionsData }) => {
        map.set(fieldId, optionsData);
      });

      return map;
    },
    enabled: relationFieldsToLoad.length > 0,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут (ранее cacheTime)
  });

  // Обновляем поля с загруженными options
  const fieldsWithOptions = useMemo<Field[]>(() => {
    if (!optionsMap || optionsMap.size === 0) {
      //   console.log(
      //     "[useRelationFieldOptions] No options loaded, returning original fields"
      //   );
      return fields;
    }

    const result = fields.map((field) => {
      const optionsData = optionsMap.get(field.id);
      if (optionsData) {
        // console.log(
        //   `[useRelationFieldOptions] Field ${field.name} options:`,
        //   optionsData.options
        // );
        return {
          ...field,
          options: optionsData.options,
        };
      }
      return field;
    });

    return result;
  }, [fields, optionsMap]);

  return {
    fieldsWithOptions,
    isLoading,
    error: error as Error | null,
  };
}
