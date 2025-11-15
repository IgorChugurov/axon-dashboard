/**
 * Me API Route
 * Получение информации о текущем пользователе
 */

import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/auth";

export async function GET() {
  try {
    console.log("[Me API] Getting user info");

    const user = await getServerUser();

    if (!user) {
      console.log("[Me API] User not authenticated");
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    console.log("[Me API] User info retrieved successfully");
    return NextResponse.json(user);
  } catch (error: unknown) {
    console.error("[Me API] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to get user";

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
