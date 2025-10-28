import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/actions";

export async function POST() {
  try {
    // Очищаем все cookies авторизации через Server Action
    await clearAuthCookies();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Clear auth error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to clear auth";

    return NextResponse.json(
      {
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
