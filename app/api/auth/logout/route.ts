/**
 * Logout API Route
 * Выход из Supabase сессии
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    console.log("[Logout API] Logout request received");

    const supabase = await createClient();

    // Выход из Supabase (автоматически очистит все cookies)
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[Logout API] Supabase logout error:", error);
      // Продолжаем выполнение даже при ошибке
    }

    console.log("[Logout API] Logout successful");

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[Logout API] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Logout failed";

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
