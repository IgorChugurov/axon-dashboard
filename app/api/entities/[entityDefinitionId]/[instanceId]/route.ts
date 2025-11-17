/**
 * API роут для работы с конкретным экземпляром
 * GET - получить экземпляр
 * PATCH - обновить экземпляр
 * DELETE - удалить экземпляр
 */

import { NextRequest, NextResponse } from "next/server";
import { getEntityDefinitionById } from "@/lib/universal-entity/config-service";
import {
  getInstanceById,
  updateInstance,
  deleteInstance,
} from "@/lib/universal-entity/instance-service";

export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ entityDefinitionId: string; instanceId: string }> }
) {
  try {
    const { entityDefinitionId, instanceId } = await params;

    // Проверяем существование сущности
    const entityDefinition = await getEntityDefinitionById(entityDefinitionId);
    if (!entityDefinition) {
      return NextResponse.json(
        { error: "Entity definition not found" },
        { status: 404 }
      );
    }

    // Получаем экземпляр
    const instance = await getInstanceById(instanceId);

    // Проверяем, что экземпляр принадлежит этой сущности
    if (instance.entityDefinitionId !== entityDefinitionId) {
      return NextResponse.json(
        { error: "Instance not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(instance);
  } catch (error) {
    console.error("[API Entities] GET instance error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch instance",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ entityDefinitionId: string; instanceId: string }> }
) {
  try {
    const { entityDefinitionId, instanceId } = await params;
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

    // Обновляем экземпляр
    const instance = await updateInstance(instanceId, data, relations);

    return NextResponse.json(instance);
  } catch (error) {
    console.error("[API Entities] PATCH error:", error);
    return NextResponse.json(
      {
        error: "Failed to update instance",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ entityDefinitionId: string; instanceId: string }> }
) {
  try {
    const { entityDefinitionId, instanceId } = await params;

    // Проверяем существование сущности
    const entityDefinition = await getEntityDefinitionById(entityDefinitionId);
    if (!entityDefinition) {
      return NextResponse.json(
        { error: "Entity definition not found" },
        { status: 404 }
      );
    }

    // Удаляем экземпляр
    await deleteInstance(instanceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Entities] DELETE error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete instance",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
