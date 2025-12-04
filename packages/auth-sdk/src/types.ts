/**
 * Типы для системы авторизации
 */

/**
 * Глобальная роль пользователя
 *
 * УПРОЩЕННАЯ АРХИТЕКТУРА:
 * - Только две глобальные роли: 'user' или 'superAdmin'
 * - Убрали промежуточный 'admin'
 * - projectAdmin и projectSuperAdmin - это роли в проекте, получаются через get_user_project_role()
 */
export type UserRole = "user" | "superAdmin";

export interface User {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface AuthResponse {
  user: User;
  session?: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface OAuthProvider {
  google: "google";
  github: "github";
}

export type OAuthProviderType = keyof OAuthProvider;

/**
 * Конфигурация для серверного клиента
 */
export interface ServerAuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  cookies?: CookieHandler;
}

/**
 * Конфигурация для клиентского клиента
 */
export interface ClientAuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Универсальный интерфейс для работы с cookies
 * Поддерживает разные фреймворки (Next.js, Remix и т.д.)
 */
export interface CookieHandler {
  getAll: () => Array<{ name: string; value: string }>;
  setAll: (
    cookies: Array<{ name: string; value: string; options?: CookieOptions }>
  ) => void;
}

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  maxAge?: number;
  path?: string;
  domain?: string;
}

/**
 * Конфигурация для middleware
 */
export interface MiddlewareConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  publicRoutes?: string[];
  onAuthRequired?: (request: { url: string; pathname: string }) => string;
  onRoleCheck?: (
    user: User,
    role: UserRole,
    request: { url: string; pathname: string }
  ) => string | null;
  roleCacheTtl?: number; // TTL для кэша ролей в секундах (по умолчанию 5 минут)
}
