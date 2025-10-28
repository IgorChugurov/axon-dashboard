import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/auth/actions";
import { AuthTokens, User } from "@/lib/auth/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokens, user }: { tokens: AuthTokens; user: User } = body;

    if (!tokens || !user) {
      return NextResponse.json(
        { message: "Tokens and user data are required" },
        { status: 400 }
      );
    }

    console.log("[Set Tokens API] Setting tokens and user data");

    // Сохраняем токены и данные пользователя в cookies через Server Action
    await setAuthCookies(tokens, user);

    console.log("[Set Tokens API] Tokens and user data set successfully");

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[Set Tokens API] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to set tokens";

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
