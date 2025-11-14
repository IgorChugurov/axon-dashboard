import { NextRequest, NextResponse } from "next/server";
import {
  getEntityDataFromBackend,
  formatEntityResponse,
  buildBackendUrl,
  fetchFromBackend,
} from "@/lib/api/handlers";
import { getAuthTokens } from "@/lib/auth/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params;

  try {
    console.log(`[${entity} API] Request received`);

    // 1. Получаем токены из cookies
    const tokens = await getAuthTokens();
    if (!tokens) {
      console.log(`[${entity} API] No tokens found`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Строим URL к бэкенду из searchParams запроса
    const { searchParams } = new URL(request.url);
    const backendUrl = buildBackendUrl(entity, searchParams);

    console.log(`[${entity} API] Backend URL:`, backendUrl);

    // 3. Делаем запрос к бэкенду с обработкой refresh
    let refreshSetCookie: string | null = null;
    const cookieHeader = request.headers.get("cookie") || "";
    const response = await fetchFromBackend(backendUrl, {
      accessToken: tokens.accessToken,
      cookieHeader, // Передаем cookies для refresh
      onTokenRefresh: async (newToken) => {
        // Получаем set-cookie заголовок от refresh
        const baseUrl = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";
        const refreshResponse = await fetch(
          `${baseUrl}/api/auth/refresh-token`,
          {
            method: "POST",
            headers: {
              cookie: cookieHeader,
            },
            cache: "no-store",
          }
        );

        if (refreshResponse.ok) {
          refreshSetCookie = refreshResponse.headers.get("set-cookie");
        }
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${entity} API] Backend error:`, errorText);
      return NextResponse.json(
        { error: `Backend request failed: ${errorText}` },
        { status: response.status }
      );
    }

    // 4. Возвращаем данные
    const data = await response.json();
    console.log(`[${entity} API] Success, returning data`);
    const formatted = formatEntityResponse(data, entity);
    const next = NextResponse.json(formatted);

    // Устанавливаем cookies от refresh, если были
    if (refreshSetCookie) {
      next.headers.set("set-cookie", refreshSetCookie);
    }

    return next;
  } catch (error) {
    console.error(`[${entity} API] Error:`, error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: `Failed to fetch ${entity}` },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params;

  try {
    console.log(`[${entity} API] POST request received`);

    // 1. Получаем токены из cookies
    const tokens = await getAuthTokens();
    if (!tokens) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Получаем данные из запроса
    const body = await request.json();

    // 3. Проверяем конфигурацию API
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBaseUrl) {
      console.error(`[${entity} API] NEXT_PUBLIC_API_URL is not set`);
      return NextResponse.json(
        { error: "API configuration error" },
        { status: 500 }
      );
    }

    // 4. Делаем запрос к бэкенду
    const response = await fetch(`${apiBaseUrl}/api/${entity}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    // 5. Если 401 - обновляем токен и повторяем
    if (response.status === 401) {
      console.log(`[${entity} API] Got 401, refreshing tokens and retrying...`);

      // Вызываем внутренний refresh endpoint
      const baseUrl = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";
      const refreshResponse = await fetch(`${baseUrl}/api/auth/refresh-token`, {
        method: "POST",
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
        cache: "no-store",
      });

      if (!refreshResponse.ok) {
        return NextResponse.json(
          { error: "Token refresh failed" },
          { status: 401 }
        );
      }

      const refreshData = await refreshResponse.json();
      const refreshSetCookie = refreshResponse.headers.get("set-cookie");

      const retryResponse = await fetch(`${apiBaseUrl}/api/${entity}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshData.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!retryResponse.ok) {
        return NextResponse.json(
          { error: "Request failed after retry" },
          { status: 401 }
        );
      }

      const data = await retryResponse.json();
      const next = NextResponse.json(data, { status: 201 });
      if (refreshSetCookie) {
        next.headers.set("set-cookie", refreshSetCookie);
      }
      return next;
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Failed to create ${entity}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error(`[${entity} API] POST Error:`, error);
    return NextResponse.json(
      { error: `Failed to create ${entity}` },
      { status: 500 }
    );
  }
}
