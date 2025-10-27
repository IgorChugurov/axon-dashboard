import { NextResponse } from "next/server";
import { serverApiClient } from "@/lib/auth/server-api-client";

export async function POST() {
  try {
    // Выполняем выход через серверный API клиент
    await serverApiClient.logout();

    return NextResponse.json({ message: "Logged out successfully" });
  } catch (error: unknown) {
    console.error("Logout error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Logout failed";
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
