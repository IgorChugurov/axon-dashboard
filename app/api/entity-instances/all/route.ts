/**
 * GET /api/entity-instances/all
 * 
 * Получить ВСЕ экземпляры сущности (без пагинации)
 * 
 * Используется для:
 * - Селектов (выбор тегов, категорий и т.д.)
 * - Фильтров на страницах списков
 * - UI элементов где нужны все данные
 * 
 * ⚠️ ВНИМАНИЕ: Использовать только для сущностей с небольшим количеством записей (< 1000)
 * Для больших таблиц используйте endpoint с пагинацией
 * 
 * Headers:
 * - entityDefinitionId: ID определения сущности (обязательно)
 * 
 * Query params:
 * - search: поисковый запрос (опционально)
 * - sortBy: поле для сортировки (опционально, default: created_at)
 * - sortOrder: направление сортировки asc/desc (опционально, default: desc)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEntityDefinitionWithFields } from "@/lib/universal-entity/config-service";

export async function GET(request: NextRequest) {
  try {
    // Получаем entityDefinitionId из headers
    const entityDefinitionId = request.headers.get("entityDefinitionId");

    if (!entityDefinitionId) {
      return NextResponse.json(
        {
          error: "Missing entityDefinitionId header",
          message:
            "entityDefinitionId is required in headers to identify the entity",
        },
        { status: 400 }
      );
    }

    // Получаем query параметры
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as
      | "asc"
      | "desc";

    // Загружаем конфигурацию сущности
    const config = await getEntityDefinitionWithFields(entityDefinitionId);

    if (!config) {
      return NextResponse.json(
        {
          error: "Entity definition not found",
          message: `Entity definition with ID ${entityDefinitionId} does not exist`,
        },
        { status: 404 }
      );
    }

    const { entityDefinition, fields } = config;
    const supabase = await createClient();

    // Строим базовый запрос
    let query = supabase
      .from(entityDefinition.tableName)
      .select("*")
      .order(sortBy, { ascending: sortOrder === "asc" });

    // Добавляем поиск если указан
    if (search) {
      // Находим searchable поля
      const searchableFields = fields.filter((f) => f.searchable);

      if (searchableFields.length > 0) {
        // Строим OR условие для поиска по всем searchable полям
        const orConditions = searchableFields
          .map((f) => `${f.name}.ilike.%${search}%`)
          .join(",");

        query = query.or(orConditions);
      }
    }

    // Выполняем запрос
    const { data, error } = await query;

    if (error) {
      console.error("[API /all] Database error:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch instances",
          message: error.message,
        },
        { status: 500 }
      );
    }

    // Возвращаем все данные
    return NextResponse.json({
      data: data || [],
      total: data?.length || 0,
      entityDefinitionId,
      tableName: entityDefinition.tableName,
    });
  } catch (error) {
    console.error("[API /all] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

