/**
 * OAuth Callback Route
 * Обрабатывает редиректы от OAuth провайдеров (Google, GitHub и др.)
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[Auth Callback] Error exchanging code:", error);
      // Редиректим на логин с ошибкой
      const errorUrl = new URL("/login", request.url);
      errorUrl.searchParams.set("error", "auth_failed");
      return NextResponse.redirect(errorUrl);
    }
  }

  // Успешная авторизация, редиректим на указанную страницу или главную
  return NextResponse.redirect(new URL(next, request.url));
}

