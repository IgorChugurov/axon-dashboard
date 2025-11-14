import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    console.log("[RefreshToken API] Refresh request received");

    // Читаем refresh token из cookies сервера (текущих), а не из входящего запроса
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;
    const allCookies = request.headers.get("cookie") || "";

    console.log("[RefreshToken API] Refresh token from server cookies:", {
      hasRefreshToken: !!refreshToken,
      refreshTokenLength: refreshToken?.length || 0,
      refreshTokenPreview: refreshToken
        ? `${refreshToken.substring(0, 20)}...`
        : "none",
      allCookiesNames: request.cookies.getAll().map((c) => c.name),
      cookiesHeaderLength: allCookies.length,
    });

    // Сравниваем refresh token из входящего запроса и из серверных cookies
    const requestRefreshToken = request.cookies.get("refreshToken")?.value;
    console.log("[RefreshToken API] Token comparison:", {
      requestToken: requestRefreshToken
        ? `${requestRefreshToken.substring(0, 20)}...`
        : "none",
      serverToken: refreshToken
        ? `${refreshToken.substring(0, 20)}...`
        : "none",
      tokensMatch: requestRefreshToken === refreshToken,
    });

    // Дополнительная проверка: читаем все cookies и их значения
    const allCookiesData = request.cookies.getAll().reduce((acc, cookie) => {
      acc[cookie.name] = cookie.value.substring(0, 20) + "...";
      return acc;
    }, {} as Record<string, string>);
    console.log("[RefreshToken API] All cookies preview:", allCookiesData);

    if (!refreshToken) {
      console.log("[RefreshToken API] No refresh token found");
      return NextResponse.json(
        { message: "Refresh token is required" },
        { status: 400 }
      );
    }

    console.log("[RefreshToken API] Calling backend API...");
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/authentication/refresh-tokens`;
    console.log("[RefreshToken API] Backend URL:", backendUrl);

    // Запрос к бэкенду для получения новых токенов
    // Отправляем refreshToken в body (JSON), так как бэкенд ожидает его в JSON
    const requestBody = { refreshToken };
    console.log("[RefreshToken API] Request body:", {
      hasRefreshToken: !!requestBody.refreshToken,
      refreshTokenLength: requestBody.refreshToken?.length,
      bodyString: JSON.stringify(requestBody).substring(0, 100) + "...",
    });

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: allCookies, // Пересылаем cookies на всякий случай
      },
      body: JSON.stringify(requestBody), // Отправляем refreshToken в body
      credentials: "include",
    });

    console.log("[RefreshToken API] Backend response status:", response.status);

    if (!response.ok) {
      // Читаем детали ошибки от бэкенда
      const errorText = await response.text().catch(() => "Cannot read error");
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText };
      }

      console.error("[RefreshToken API] Backend refresh failed:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
        headers: Object.fromEntries(response.headers.entries()),
      });

      return NextResponse.json(
        {
          message: "Token refresh failed",
          details: errorData,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("[RefreshToken API] Backend response received");
    console.log(
      "[RefreshToken API] Full response data:",
      JSON.stringify(data, null, 2)
    );
    console.log("[RefreshToken API] Response data keys:", Object.keys(data));
    console.log("[RefreshToken API] Has accessToken:", !!data.accessToken);
    console.log("[RefreshToken API] Has refreshToken:", !!data.refreshToken);
    console.log("[RefreshToken API] Has exp:", !!data.exp);
    console.log("[RefreshToken API] Has expiresAt:", !!data.expiresAt);

    // Создаем ответ с новым access token
    const nextResponse = NextResponse.json({
      accessToken: data.accessToken,
    });

    // Устанавливаем access token прямо в ответе
    nextResponse.cookies.set("accessToken", data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 минут
      path: "/",
    });

    // Если бэкенд вернул новый refreshToken в JSON - сохраняем его
    if (data.refreshToken) {
      console.log("[RefreshToken API] Saving refresh token from JSON response");
      console.log(
        "[RefreshToken API] New refreshToken preview:",
        data.refreshToken.substring(0, 20) + "..."
      );
      // Устанавливаем refresh token прямо в ответе
      nextResponse.cookies.set("refreshToken", data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 дней
        path: "/",
      });

      // Проверяем, что cookie действительно сохранился
      const verificationCookieStore = await cookies();
      const savedRefreshToken =
        verificationCookieStore.get("refreshToken")?.value;
      console.log("[RefreshToken API] Saved refreshToken verification:", {
        hasSavedToken: !!savedRefreshToken,
        savedTokenPreview: savedRefreshToken
          ? savedRefreshToken.substring(0, 20) + "..."
          : "none",
        matchesNewToken: savedRefreshToken === data.refreshToken,
      });
    } else {
      console.log(
        "[RefreshToken API] No refreshToken in JSON - relying on Set-Cookie header"
      );
    }

    // Сохраняем expiresAt если бэкенд вернул его (может быть как exp или expiresAt)
    if (data.exp || data.expiresAt) {
      const expiresAt = data.expiresAt || data.exp;
      nextResponse.cookies.set("expiresAt", expiresAt.toString(), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
      console.log("[RefreshToken API] Saved expiresAt:", expiresAt);
    }

    console.log("[RefreshToken API] Tokens refreshed successfully");

    return nextResponse;
  } catch (error: unknown) {
    console.error("[RefreshToken API] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Token refresh failed";

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
