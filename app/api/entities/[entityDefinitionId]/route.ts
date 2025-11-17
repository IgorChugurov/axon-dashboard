/**
 * API роут для работы с экземплярами сущности
 * GET - получить список
 * POST - создать новый экземпляр
 */

import { NextRequest, NextResponse } from "next/server";
import { getEntityDefinitionById } from "@/lib/universal-entity/config-service";
import {
  getInstances,
  createInstance,
} from "@/lib/universal-entity/instance-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityDefinitionId: string }> }
) {
  try {
    const { entityDefinitionId } = await params;
    const { searchParams } = new URL(request.url);

    // Проверяем существование сущности
    const entityDefinition = await getEntityDefinitionById(entityDefinitionId);
    if (!entityDefinition) {
      return NextResponse.json(
        { error: "Entity definition not found" },
        { status: 404 }
      );
    }

    // Получаем параметры запроса
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = (page - 1) * limit;

    // Получаем экземпляры
    const instances = await getInstances(
      entityDefinitionId,
      entityDefinition.projectId,
      {
        limit,
        offset,
      }
    );

    return NextResponse.json({
      data: instances,
      pagination: {
        page,
        limit,
        total: instances.length, // TODO: получить реальное количество
      },
    });
  } catch (error) {
    console.error("[API Entities] GET error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch instances",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityDefinitionId: string }> }
) {
  try {
    const { entityDefinitionId } = await params;
    const body = await request.json();

    // Проверяем существование сущности
    const entityDefinition = await getEntityDefinitionById(entityDefinitionId);
    if (!entityDefinition) {
      return NextResponse.json(
        { error: "Entity definition not found" },
        { status: 404 }
      );
    }

    // Разделяем данные и связи
    const { relations, ...data } = body;

    // Создаем экземпляр
    const instance = await createInstance(
      entityDefinitionId,
      entityDefinition.projectId,
      data,
      relations
    );

    return NextResponse.json(instance, { status: 201 });
  } catch (error) {
    console.error("[API Entities] POST error:", error);
    return NextResponse.json(
      {
        error: "Failed to create instance",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
