/**
 * Базовый универсальный сервис для работы с сущностями
 * Функциональный подход для избежания проблем с сериализацией классов в Server Actions
 */

import { createClient } from "@/lib/supabase/server";
import type {
  AdvancedServerDataParams,
  EntityFilter,
  EntityResponse,
  ManyToManyFilter,
  SimpleFilter,
} from "./types";

/**
 * Тип сервиса сущности (для типизации в actions)
 */
export interface EntityService<T extends { id: string }> {
  getAll: (params?: AdvancedServerDataParams) => Promise<EntityResponse<T>>;
  getById: (id: string) => Promise<T | null>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<void>;
}

/**
 * Конфигурация сущности
 */
export interface EntityConfig<T> {
  tableName: string;
  searchFields?: string[]; // Множественные поля для поиска
  defaultSortBy?: string;
  defaultSortOrder?: "asc" | "desc";

  // Hooks для кастомизации
  hooks?: {
    beforeFetch?: (query: any, params: AdvancedServerDataParams) => any;
    afterFetch?: (data: T[]) => Promise<T[]>;
    beforeCreate?: (data: Partial<T>) => Promise<Partial<T>>;
    afterCreate?: (data: T) => Promise<T>;
    beforeUpdate?: (id: string, data: Partial<T>) => Promise<Partial<T>>;
    afterUpdate?: (data: T) => Promise<T>;
    beforeDelete?: (id: string) => Promise<void>;
    afterDelete?: (id: string) => Promise<void>;
  };
}

/**
 * Создание сервиса для работы с сущностью (функциональный подход)
 * Возвращает объект с методами вместо экземпляра класса
 * 
 * Преимущество: объект с функциями сериализуем, класс - нет
 */
export function createEntityService<T extends { id: string }>(
  config: EntityConfig<T>
) {
  /**
   * Применение простого фильтра
   */
  function applySimpleFilter(query: any, filter: SimpleFilter): any {
    const operator = filter.operator || "eq";

    switch (operator) {
      case "eq":
        return query.eq(filter.field, filter.value);
      case "neq":
        return query.neq(filter.field, filter.value);
      case "gt":
        return query.gt(filter.field, filter.value);
      case "lt":
        return query.lt(filter.field, filter.value);
      case "gte":
        return query.gte(filter.field, filter.value);
      case "lte":
        return query.lte(filter.field, filter.value);
      case "like":
        return query.like(filter.field, filter.value);
      case "ilike":
        return query.ilike(filter.field, filter.value);
      case "in":
        return query.in(filter.field, filter.value);
      default:
        return query;
    }
  }

  /**
   * Применение many-to-many фильтра
   *
   * OR mode: записи с ЛЮБЫМ из выбранных значений
   * AND mode: записи со ВСЕМИ выбранными значениями
   */
  async function applyManyToManyFilter(
    query: any,
    filter: ManyToManyFilter
  ): Promise<any> {
    const supabase = await createClient();

    if (filter.mode === "or") {
      // OR режим: используем inner join через подзапрос
      const { data: joinData } = await supabase
        .from(filter.joinTable)
        .select(filter.joinColumn)
        .in(filter.targetColumn, filter.values);

      if (joinData && joinData.length > 0) {
        const ids = joinData.map((row) => row[filter.joinColumn]);
        query = query.in("id", ids);
      } else {
        // Нет совпадений - возвращаем пустой результат
        query = query.in("id", []);
      }
    } else {
      // AND режим: записи должны иметь ВСЕ указанные значения
      const { data: joinData } = await supabase
        .from(filter.joinTable)
        .select(`${filter.joinColumn}, ${filter.targetColumn}`)
        .in(filter.targetColumn, filter.values);

      if (joinData && joinData.length > 0) {
        // Группируем по joinColumn и считаем уникальные targetColumn
        const grouped = new Map<string, Set<string>>();

        for (const row of joinData) {
          const joinId = row[filter.joinColumn];
          const targetId = row[filter.targetColumn];

          if (!grouped.has(joinId)) {
            grouped.set(joinId, new Set());
          }
          grouped.get(joinId)!.add(targetId);
        }

        // Находим записи, у которых количество уникальных targetColumn == количеству фильтров
        const requiredCount = filter.values.length;
        const matchingIds: string[] = [];

        grouped.forEach((targetIds, joinId) => {
          if (targetIds.size === requiredCount) {
            matchingIds.push(joinId);
          }
        });

        if (matchingIds.length > 0) {
          query = query.in("id", matchingIds);
        } else {
          // Нет совпадений - возвращаем пустой результат
          query = query.in("id", []);
        }
      } else {
        // Нет совпадений - возвращаем пустой результат
        query = query.in("id", []);
      }
    }

    return query;
  }

  /**
   * Применение фильтров к запросу
   */
  async function applyFilters(
    query: any,
    filters: EntityFilter[]
  ): Promise<any> {
    for (const filter of filters) {
      switch (filter.type) {
        case "simple":
          query = applySimpleFilter(query, filter);
          break;

        case "relation":
          // Many-to-one (author_id)
          query = query.eq(filter.field, filter.value);
          break;

        case "many-to-many":
          query = await applyManyToManyFilter(query, filter);
          break;
      }
    }

    return query;
  }

  /**
   * Получение всех записей с пагинацией, поиском и фильтрами
   */
  async function getAll(
    params: AdvancedServerDataParams = {}
  ): Promise<EntityResponse<T>> {
    const supabase = await createClient();

    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    console.log(`[${config.tableName}] Getting data with params:`, {
      page,
      limit,
      search: params.search,
      filters: params.filters,
    });

    // Базовый запрос
    let query = supabase
      .from(config.tableName)
      .select("*", { count: "exact" });

    // === ПОИСК ===
    if (params.search && config.searchFields) {
      // Поиск по нескольким полям через OR
      const searchConditions = config.searchFields
        .map((field) => `${field}.ilike.%${params.search}%`)
        .join(",");
      query = query.or(searchConditions);
    }

    // === ФИЛЬТРЫ ===
    if (params.filters && params.filters.length > 0) {
      query = await applyFilters(query, params.filters);
    }

    // === СОРТИРОВКА ===
    const sortBy = params.sortBy || config.defaultSortBy || "created_at";
    const sortOrder =
      params.sortOrder || config.defaultSortOrder || "desc";
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    // === КАСТОМНАЯ ОБРАБОТКА (hooks) ===
    if (config.hooks?.beforeFetch) {
      query = config.hooks.beforeFetch(query, params);
    }

    // === ПАГИНАЦИЯ ===
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error(`[${config.tableName}] Error:`, error);
      throw new Error(
        `Failed to fetch ${config.tableName}: ${error.message}`
      );
    }

    // === POST-PROCESSING ===
    let processedData = (data as T[]) || [];
    if (config.hooks?.afterFetch) {
      processedData = await config.hooks.afterFetch(processedData);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    console.log(`[${config.tableName}] Success:`, {
      count: processedData.length,
      total,
    });

    return {
      data: processedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  /**
   * Получение одной записи по ID
   */
  async function getById(id: string): Promise<T | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from(config.tableName)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(`[${config.tableName}] Get by ID error:`, error);
      return null;
    }

    let result = data as T;

    // POST-PROCESSING для одной записи
    if (config.hooks?.afterFetch) {
      const processed = await config.hooks.afterFetch([result]);
      result = processed[0];
    }

    return result;
  }

  /**
   * Создание записи
   */
  async function create(data: Partial<T>): Promise<T> {
    const supabase = await createClient();

    console.log(`[${config.tableName}] Creating:`, data);

    // PRE-PROCESSING
    let processedData = data;
    if (config.hooks?.beforeCreate) {
      processedData = await config.hooks.beforeCreate(data);
    }

    const { data: created, error } = await supabase
      .from(config.tableName)
      .insert(processedData as never)
      .select()
      .single();

    if (error) {
      console.error(`[${config.tableName}] Create error:`, error);
      throw new Error(
        `Failed to create ${config.tableName}: ${error.message}`
      );
    }

    // POST-PROCESSING
    let result = created as T;
    if (config.hooks?.afterCreate) {
      result = await config.hooks.afterCreate(result);
    }

    console.log(`[${config.tableName}] Created:`, result.id);

    return result;
  }

  /**
   * Обновление записи
   */
  async function update(id: string, data: Partial<T>): Promise<T> {
    const supabase = await createClient();

    console.log(`[${config.tableName}] Updating:`, id, data);

    // PRE-PROCESSING
    let processedData = data;
    if (config.hooks?.beforeUpdate) {
      processedData = await config.hooks.beforeUpdate(id, data);
    }

    const { data: updated, error } = await supabase
      .from(config.tableName)
      .update(processedData as never)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`[${config.tableName}] Update error:`, error);
      throw new Error(
        `Failed to update ${config.tableName}: ${error.message}`
      );
    }

    // POST-PROCESSING
    let result = updated as T;
    if (config.hooks?.afterUpdate) {
      result = await config.hooks.afterUpdate(result);
    }

    console.log(`[${config.tableName}] Updated:`, result.id);

    return result;
  }

  /**
   * Удаление записи
   */
  async function deleteFn(id: string): Promise<void> {
    const supabase = await createClient();

    console.log(`[${config.tableName}] Deleting:`, id);

    // PRE-PROCESSING
    if (config.hooks?.beforeDelete) {
      await config.hooks.beforeDelete(id);
    }

    const { error } = await supabase
      .from(config.tableName)
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`[${config.tableName}] Delete error:`, error);
      throw new Error(
        `Failed to delete ${config.tableName}: ${error.message}`
      );
    }

    // POST-PROCESSING
    if (config.hooks?.afterDelete) {
      await config.hooks.afterDelete(id);
    }

    console.log(`[${config.tableName}] Deleted:`, id);
  }

  // Возвращаем объект с методами (НЕ класс!)
  return {
    getAll,
    getById,
    create,
    update,
    delete: deleteFn, // delete - зарезервированное слово
  };
}

// Для обратной совместимости оставляем алиас
export const BaseEntityService = createEntityService;
