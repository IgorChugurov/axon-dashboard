import { NextRequest, NextResponse } from "next/server";
import { ServerAuth } from "@/lib/auth/server-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { message: "Refresh token is required" },
        { status: 400 }
      );
    }

    // Выполняем обновление токена через ServerAuth
    const newTokens = await ServerAuth.refreshTokens();

    if (!newTokens) {
      return NextResponse.json(
        {
          message: "Token refresh failed",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    });
  } catch (error: unknown) {
    console.error("Refresh token error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Token refresh failed";
    const errorStatus =
      error && typeof error === "object" && "status" in error
        ? (error.status as number)
        : 500;
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? (error.code as string)
        : undefined;

    return NextResponse.json(
      {
        message: errorMessage,
        code: errorCode,
      },
      { status: errorStatus }
    );
  }
}
