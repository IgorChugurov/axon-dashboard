import { NextRequest, NextResponse } from "next/server";
import { serverApiClient } from "@/lib/auth/server-api-client";
import { LoginCredentials } from "@/lib/auth/types";

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

    // Выполняем авторизацию через серверный API клиент
    const result = await serverApiClient.login(body);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Login error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Login failed";
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
