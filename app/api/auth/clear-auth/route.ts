import { NextResponse } from "next/server";
import { ServerAuth } from "@/lib/auth/server-auth";

export async function POST() {
  try {
    // Очищаем все cookies авторизации через ServerAuth
    await ServerAuth.clearAuth();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Clear auth error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to clear auth";
    const errorStatus =
      error && typeof error === "object" && "status" in error
        ? (error.status as number)
        : 500;

    return NextResponse.json(
      {
        message: errorMessage,
      },
      { status: errorStatus }
    );
  }
}
