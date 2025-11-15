/**
 * Login API Route
 * Обрабатывает вход через Email/Password
 * OAuth обрабатывается напрямую через Supabase на клиенте
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LoginCredentials } from "@/lib/auth/types";
import { getServerUser } from "@/lib/supabase/auth";

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

    console.log("[Login API] Attempting login for:", body.email);

    const supabase = await createClient();

    // Авторизация через Supabase
    const { error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error) {
      console.error("[Login API] Supabase login failed:", error.message);
      return NextResponse.json(
        { message: error.message || "Login failed" },
        { status: 401 }
      );
    }

    // Получаем пользователя с профилем
    const user = await getServerUser();

    console.log("[Login API] Login successful");

    return NextResponse.json({
      user,
      success: true,
    });
  } catch (error: unknown) {
    console.error("[Login API] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Login failed";

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
