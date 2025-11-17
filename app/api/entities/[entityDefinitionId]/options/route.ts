/**
 * API роут для получения опций для select полей
 * GET - получить список экземпляров для использования в select
 */

import { NextRequest, NextResponse } from "next/server";
import { getEntityDefinitionWithFields } from "@/lib/universal-entity/config-service";
import { getInstances } from "@/lib/universal-entity/instance-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityDefinitionId: string }> }
) {
  try {
    const { entityDefinitionId } = await params;

    // Загружаем конфигурацию сущности и поля одним запросом (JOIN)
    const config = await getEntityDefinitionWithFields(entityDefinitionId);
    if (!config) {
      return NextResponse.json(
        { error: "Entity definition not found" },
        { status: 404 }
      );
    }

    const { entityDefinition, fields } = config;
    const titleField = fields.find((f) => f.isOptionTitleField) || fields[0];

    // Загружаем экземпляры
    const instances = await getInstances(
      entityDefinitionId,
      entityDefinition.projectId,
      {
        limit: 1000, // TODO: добавить пагинацию если нужно
      }
    );

    // Форматируем данные для select
    const options = instances.map((instance) => {
      // После нормализации все поля на верхнем уровне instance
      const title = titleField
        ? instance[titleField.name] || instance.id
        : instance.id;

      return {
        id: instance.id,
        title: String(title),
      };
    });

    return NextResponse.json({
      options,
      titleField: titleField?.name || "id",
    });
  } catch (error) {
    console.error("[API Entities Options] GET error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch options",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
