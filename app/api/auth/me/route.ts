import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/utils";

export async function GET() {
  try {
    // Получаем данные пользователя через utils
    const user = await getAuthUser();

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

    return NextResponse.json(
      {
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
