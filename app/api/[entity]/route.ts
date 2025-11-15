import { NextRequest, NextResponse } from "next/server";
import {
  formatEntityResponse,
  buildBackendUrl,
  fetchFromBackend,
} from "@/lib/api/handlers";
import { getAccessToken } from "@/lib/supabase/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params;

  try {
    console.log(`[${entity} API] Request received`);

    // 1. Получаем access token из Supabase
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.log(`[${entity} API] No access token found`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Строим URL к бэкенду из searchParams запроса
    const { searchParams } = new URL(request.url);
    const backendUrl = buildBackendUrl(entity, searchParams);

    console.log(`[${entity} API] Backend URL:`, backendUrl);

    // 3. Делаем запрос к бэкенду
    // Supabase автоматически обновляет токены через middleware
    const response = await fetchFromBackend(backendUrl, {
      accessToken,
      cookieHeader: request.headers.get("cookie") || "",
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
    return NextResponse.json(formatted);
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

    // 1. Получаем access token из Supabase
    const accessToken = await getAccessToken();
    if (!accessToken) {
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
    // Supabase автоматически обновляет токены через middleware
    const response = await fetch(`${apiBaseUrl}/api/${entity}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

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
