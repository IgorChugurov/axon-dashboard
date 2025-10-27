import { NextResponse } from "next/server";
import { ServerAuth } from "@/lib/auth/server-auth";

export async function GET() {
  try {
    // Получаем данные пользователя через ServerAuth
    const user = await ServerAuth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json(user);
  } catch (error: unknown) {
    console.error("Get user error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to get user";
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
