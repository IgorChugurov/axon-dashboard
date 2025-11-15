/**
 * API Route для работы с проектами
 * Работает напрямую с Supabase с пагинацией и поиском
 */

import { NextRequest, NextResponse } from "next/server";
import { getProjectsFromSupabase } from "@/lib/projects/supabase";
import { getServerUser } from "@/lib/supabase/auth";
import { parseSearchParams } from "@/lib/server-data/types";

export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Парсим параметры из URL
    const { searchParams } = new URL(request.url);
    const params = parseSearchParams(
      Object.fromEntries(searchParams.entries())
    );

    // Получаем проекты из Supabase с пагинацией и поиском
    const result = await getProjectsFromSupabase(params);

    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("[Projects API] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, status = "active" } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Создаем проект через Supabase
    const { createProjectInSupabase } = await import("@/lib/projects/supabase");
    const project = await createProjectInSupabase({
      name,
      description: description || null,
      status,
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    console.error("[Projects API] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
