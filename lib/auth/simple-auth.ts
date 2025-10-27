import { cookies } from "next/headers";
import { User } from "./types";

// ПРОСТАЯ функция чтения пользователя из cookies
export async function getUserFromCookies(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("userData")?.value;

    if (!userData) {
      return null;
    }

    return JSON.parse(userData);
  } catch (error) {
    console.error("Error getting user from cookies:", error);
    return null;
  }
}

// ПРОСТАЯ функция проверки токенов
export async function hasValidTokens(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    const refreshToken = cookieStore.get("refreshToken")?.value;

    return !!(accessToken && refreshToken);
  } catch (error) {
    console.error("Error checking tokens:", error);
    return false;
  }
}
