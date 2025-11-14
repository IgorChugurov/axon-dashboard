import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/utils";

export async function POST(request: NextRequest) {
  try {
    console.log("[Logout API] Logout request received");

    // Читаем refresh token из cookies
    const refreshToken = request.cookies.get("refreshToken")?.value;

    if (refreshToken) {
      try {
        // Отправляем запрос на бэкенд для инвалидации refresh token
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/authentication/logout`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              cookie: request.headers.get("cookie") || "",
            },
            credentials: "include",
          }
        );

        console.log("[Logout API] Backend logout response:", response.status);

        // Создаем ответ
        const nextResponse = NextResponse.json({ success: true });

        // Пересылаем Set-Cookie заголовки от backend для очистки cookies
        const setCookie = response.headers.get("set-cookie");
        if (setCookie) {
          nextResponse.headers.set("set-cookie", setCookie);
        }

        // Очищаем access token cookie на стороне Next.js
        await clearAuthCookies();

        console.log("[Logout API] Logout successful");
        return nextResponse;
      } catch (error) {
        console.error("[Logout API] Backend logout failed:", error);
        // Продолжаем выполнение даже если бэкенд недоступен
      }
    }

    // Очищаем cookies в любом случае
    await clearAuthCookies();
    console.log("[Logout API] Cookies cleared");

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[Logout API] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Logout failed";

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
