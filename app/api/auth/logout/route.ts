import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/actions";
import { getAuthTokens } from "@/lib/auth/utils";

export async function POST() {
  try {
    console.log("[Logout API] Logout request received");

    // Получаем токены для отправки на бэкенд
    const tokens = await getAuthTokens();

    if (tokens?.refreshToken) {
      try {
        // Отправляем запрос на бэкенд для инвалидации refresh token
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/authentication/logout`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken: tokens.refreshToken }),
          }
        );
        console.log("[Logout API] Backend logout successful");
      } catch (error) {
        console.error("[Logout API] Backend logout failed:", error);
        // Продолжаем выполнение даже если бэкенд недоступен
      }
    }

    // Очищаем cookies в любом случае
    await clearAuthCookies();
    console.log("[Logout API] Cookies cleared");

    return NextResponse.json({ message: "Logged out successfully" });
  } catch (error: unknown) {
    console.error("[Logout API] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Logout failed";

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
