import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/auth/actions";
import { LoginCredentials, AuthTokens, User } from "@/lib/auth/types";

export async function POST(request: NextRequest) {
  try {
    const body: LoginCredentials = await request.json();

    // Валидация данных
    if (!body.email || !body.password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    console.log("[Login API] Attempting login for:", body.email);

    // Запрос к бэкенду для авторизации
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/authentication/sign-in`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Login API] Backend login failed:", response.status);
      return NextResponse.json(
        { message: errorData.message || "Login failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("[Login API] Login successful");

    // Сохраняем токены и данные пользователя
    const tokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt ?? Date.now() / 1000 + 15 * 60, // 15 минут
    };

    const user: User = { email: data.email };

    await setAuthCookies(tokens, user);

    return NextResponse.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      email: user.email,
    });
  } catch (error: unknown) {
    console.error("[Login API] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Login failed";

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
