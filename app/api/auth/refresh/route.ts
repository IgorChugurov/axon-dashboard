import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setAuthCookies } from "@/lib/auth/actions";

export async function POST() {
  try {
    console.log("[RefreshAPI] Refresh request received");

    // Читаем refresh token из cookies
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (!refreshToken) {
      console.log("[RefreshAPI] No refresh token found");
      return NextResponse.json(
        { message: "Refresh token is required" },
        { status: 400 }
      );
    }

    console.log("[RefreshAPI] Calling backend API...");

    // Запрос к бэкенду для получения новых токенов
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "https://dummyjson.com"
      }/api/authentication/refresh-tokens`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error("[RefreshAPI] Backend refresh failed:", response.status);
      return NextResponse.json(
        { message: "Token refresh failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("[RefreshAPI] Backend response received");

    const newTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.exp,
    };

    const user = {
      email: data.email,
    };

    // Сохраняем новые токены через Server Action (здесь это разрешено - Route Handler)
    await setAuthCookies(newTokens, user);

    console.log("[RefreshAPI] Tokens refreshed and saved to cookies");

    // Возвращаем токены клиенту
    return NextResponse.json({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresAt: newTokens.expiresAt,
    });
  } catch (error: unknown) {
    console.error("[RefreshAPI] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Token refresh failed";

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
