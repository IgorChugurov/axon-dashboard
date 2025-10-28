import { NextRequest, NextResponse } from "next/server";
import { tokenManager } from "@/lib/auth/token-manager";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params;

  try {
    console.log(`[${entity} API] Request received`);

    // 1. Получаем валидные токены
    const tokens = await tokenManager.getValidTokens();
    if (!tokens) {
      console.log(`[${entity} API] No valid tokens found`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Строим URL к бэкенду
    const { searchParams } = new URL(request.url);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiBaseUrl) {
      console.error(`[${entity} API] NEXT_PUBLIC_API_URL is not set`);
      return NextResponse.json(
        { error: "API configuration error" },
        { status: 500 }
      );
    }

    const backendUrl = new URL(`${apiBaseUrl}/api/${entity}`);
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value);
    });

    console.log(`[${entity} API] Backend URL:`, backendUrl.toString());

    // 3. Делаем запрос к бэкенду
    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    console.log(`[${entity} API] Backend response status:`, response.status);

    // 4. Если 401 - обновляем токен и повторяем
    if (response.status === 401) {
      console.log(`[${entity} API] Got 401, refreshing tokens and retrying...`);

      const newTokens = await tokenManager.refreshTokens();
      if (!newTokens) {
        console.log(`[${entity} API] Token refresh failed`);
        return NextResponse.json(
          { error: "Token refresh failed" },
          { status: 401 }
        );
      }

      const retryResponse = await fetch(backendUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${newTokens.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!retryResponse.ok) {
        console.log(`[${entity} API] Retry failed:`, retryResponse.status);
        return NextResponse.json(
          { error: "Request failed after retry" },
          { status: 401 }
        );
      }

      const data = await retryResponse.json();
      console.log(`[${entity} API] Retry successful`);
      return NextResponse.json(formatResponse(data, entity));
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${entity} API] Backend error:`, errorText);
      return NextResponse.json(
        { error: `Backend request failed: ${errorText}` },
        { status: response.status }
      );
    }

    // 5. Возвращаем данные
    const data = await response.json();
    console.log(`[${entity} API] Success, returning data`);
    return NextResponse.json(formatResponse(data, entity));
  } catch (error) {
    console.error(`[${entity} API] Error:`, error);
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

    // 1. Получаем валидные токены
    const tokens = await tokenManager.getValidTokens();
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

    // 4. Если 401 - обновляем токен и повторяем
    if (response.status === 401) {
      const newTokens = await tokenManager.refreshTokens();
      if (!newTokens) {
        return NextResponse.json(
          { error: "Token refresh failed" },
          { status: 401 }
        );
      }

      const retryResponse = await fetch(`${apiBaseUrl}/api/${entity}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${newTokens.accessToken}`,
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
      return NextResponse.json(data, { status: 201 });
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

// Универсальная функция форматирования ответа
function formatResponse(data: unknown, entity: string) {
  const responseData = data as {
    items?: unknown[];
    meta?: {
      currentPage: number;
      perPage: number;
      totalItems: number;
      totalPages: number;
      hasPreviousPage: boolean;
      hasNextPage: boolean;
    };
  };

  return {
    data: responseData.items || data,
    pagination: responseData.meta
      ? {
          page: responseData.meta.currentPage,
          limit: responseData.meta.perPage,
          total: responseData.meta.totalItems,
          totalPages: responseData.meta.totalPages,
          hasPreviousPage: responseData.meta.hasPreviousPage,
          hasNextPage: responseData.meta.hasNextPage,
        }
      : undefined,
    config: getConfigForEntity(entity),
  };
}

// Получение конфига для сущности
function getConfigForEntity(entity: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(`@/config/${entity}.json`);
  } catch {
    return null;
  }
}
