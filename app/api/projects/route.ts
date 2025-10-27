import { NextRequest, NextResponse } from "next/server";
import { ServerAuth } from "@/lib/auth/server-auth";
import projectsConfig from "@/config/projects.json";

/**
 * API Route для работы с проектами
 * Работает как прокси между клиентом и бэкендом
 * Автоматически управляет токенами (проверка истечения, обновление)
 */

export async function GET(request: NextRequest) {
  try {
    // 1. Проверяем наличие токенов
    const tokens = await ServerAuth.getTokens();
    if (!tokens) {
      console.log("[Projects API] No tokens found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Проверяем истечение токена и обновляем если необходимо
    if (await ServerAuth.isTokenExpired()) {
      console.log("[Projects API] Token expired, refreshing...");
      const newTokens = await ServerAuth.refreshTokens();

      if (!newTokens) {
        console.log("[Projects API] Token refresh failed");
        await ServerAuth.clearAuth();
        return NextResponse.json(
          { error: "Token refresh failed" },
          { status: 401 }
        );
      }
      console.log("[Projects API] Token refreshed successfully");
    }

    // 3. Получаем актуальные токены после возможного обновления
    const validTokens = await ServerAuth.getTokens();
    if (!validTokens) {
      return NextResponse.json(
        { error: "No valid tokens available" },
        { status: 401 }
      );
    }

    // 4. Строим URL к бэкенду с параметрами
    const { searchParams } = new URL(request.url);
    const backendUrl = new URL(
      `${process.env.NEXT_PUBLIC_API_URL}/api/projects`
    );

    // Копируем все query параметры
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value);
    });

    // 5. Делаем запрос к бэкенду с авторизацией
    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${validTokens.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store", // Отключаем кеширование для актуальных данных
    });

    // 6. Обрабатываем ответ от бэкенда
    if (response.status === 401) {
      console.log("[Projects API] Backend returned 401");
      await ServerAuth.clearAuth();
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Projects API] Backend error:", errorText);
      return NextResponse.json(
        { error: "Backend request failed", details: errorText },
        { status: response.status }
      );
    }

    // 7. Возвращаем данные клиенту
    const data = await response.json();
    // Формат бэкенда: { items: [...], meta: { currentPage, perPage, totalItems, ... } }
    const responseData = {
      data: data.items || data, // Поддержка как нового формата (items), так и массиваc
      pagination: data.meta
        ? {
            page: data.meta.currentPage,
            limit: data.meta.perPage,
            total: data.meta.totalItems,
            totalPages: data.meta.totalPages,
            hasPreviousPage: data.meta.hasPreviousPage,
            hasNextPage: data.meta.hasNextPage,
          }
        : undefined,
      config: projectsConfig,
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error("[Projects API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch projects",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Проверяем наличие токенов
    const tokens = await ServerAuth.getTokens();
    if (!tokens) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Проверяем истечение токена и обновляем если необходимо
    if (await ServerAuth.isTokenExpired()) {
      const newTokens = await ServerAuth.refreshTokens();
      if (!newTokens) {
        await ServerAuth.clearAuth();
        return NextResponse.json(
          { error: "Token refresh failed" },
          { status: 401 }
        );
      }
    }

    // 3. Получаем актуальные токены
    const validTokens = await ServerAuth.getTokens();
    if (!validTokens) {
      return NextResponse.json(
        { error: "No valid tokens available" },
        { status: 401 }
      );
    }

    // 4. Получаем данные из запроса
    const body = await request.json();

    // 5. Делаем запрос к бэкенду для создания проекта
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/projects`;

    console.log("[Projects API] Creating project:", body);

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validTokens.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    // 6. Обрабатываем ответ
    if (response.status === 401) {
      await ServerAuth.clearAuth();
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Projects API] Backend error:", errorText);
      return NextResponse.json(
        { error: "Failed to create project", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("[Projects API] Error creating project:", error);
    return NextResponse.json(
      {
        error: "Failed to create project",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
