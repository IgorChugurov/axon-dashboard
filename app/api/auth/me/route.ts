import { NextRequest, NextResponse } from "next/server";
import { getAuthTokens } from "@/lib/auth/utils";

export async function GET(request: NextRequest) {
  try {
    console.log("[Me API] Getting user info");

    // Читаем access token из cookies
    const tokens = await getAuthTokens();

    if (!tokens?.accessToken) {
      console.log("[Me API] No access token found");
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    // Отправляем запрос на backend с Bearer token
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    // Если токен истек, пытаемся обновить
    if (response.status === 401) {
      console.log("[Me API] Token expired, attempting refresh");

      // Вызываем внутренний refresh endpoint
      const baseUrl = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";
      const refreshResponse = await fetch(`${baseUrl}/api/auth/refresh-token`, {
        method: "POST",
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
        cache: "no-store",
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();

        // Повторяем запрос с новым токеном
        const retryResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${refreshData.accessToken}`,
              "Content-Type": "application/json",
            },
            cache: "no-store",
          }
        );

        if (retryResponse.ok) {
          const userData = await retryResponse.json();
          console.log("[Me API] User info retrieved after refresh");
          return NextResponse.json(userData);
        }
      }

      console.log("[Me API] Refresh failed, user not authenticated");
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    if (!response.ok) {
      console.error("[Me API] Backend error:", response.status);
      return NextResponse.json(
        { message: "Failed to fetch user info" },
        { status: response.status }
      );
    }

    const userData = await response.json();
    console.log("[Me API] User info retrieved successfully");
    return NextResponse.json(userData);
  } catch (error: unknown) {
    console.error("[Me API] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to get user";

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
