import { NextRequest, NextResponse } from "next/server";
import { ServerAuth } from "@/lib/auth/server-auth";
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

    // Сохраняем токены и данные пользователя в cookies через ServerAuth
    await ServerAuth.setTokens(tokens);
    await ServerAuth.setUser(user);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Set tokens error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to set tokens";
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
