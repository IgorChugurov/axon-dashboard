import { NextRequest, NextResponse } from "next/server";
import { setAccessTokenCookie, setRefreshTokenCookie } from "@/lib/auth/utils";
import { LoginCredentials, User } from "@/lib/auth/types";

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
    console.log("[Login API] Response data keys:", Object.keys(data));
    console.log("[Login API] Has accessToken:", !!data.accessToken);
    console.log("[Login API] Has refreshToken:", !!data.refreshToken);

    // Создаем ответ с теми же данными
    const nextResponse = NextResponse.json({
      accessToken: data.accessToken,
      user: { email: data.email },
    });

    // Пересылаем cookies от backend к клиенту
    const backendCookie = response.headers.get("set-cookie");
    if (backendCookie) {
      console.log("[Login API] Backend sent Set-Cookie header");
      nextResponse.headers.set("set-cookie", backendCookie);
    }

    // Сохраняем access token в httpOnly cookie на стороне Next.js
    await setAccessTokenCookie(data.accessToken);

    // Если бэкенд вернул refreshToken в JSON - сохраняем его
    if (data.refreshToken) {
      console.log("[Login API] Saving refresh token from JSON response");
      await setRefreshTokenCookie(data.refreshToken);
    } else {
      console.log(
        "[Login API] No refreshToken in JSON - relying on Set-Cookie header"
      );
    }

    return nextResponse;
  } catch (error: unknown) {
    console.error("[Login API] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Login failed";

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
