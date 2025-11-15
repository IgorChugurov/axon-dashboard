// Типы для системы авторизации

export type UserRole = "user" | "admin" | "superAdmin";

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

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  email: string;
  expiresAt: number;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
  requires2FA?: boolean;
  tempToken?: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface AuthConfig {
  loginAndGetTokenUrl: string;
  getCurrentAuthUserUrl: string;
  refreshAuthSessionUrl: string;
  fields: AuthField[];
}

export interface AuthField {
  name: string;
  label: string;
  placeholder: string;
  type: string;
  forEditPage: string;
  forCreatePage: string;
  required: boolean;
  requiredText: string;
}

export interface ApiRequestConfig {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
  queryParams?: Record<string, string | number>;
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}
