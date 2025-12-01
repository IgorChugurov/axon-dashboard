/**
 * Классы ошибок для системы авторизации
 */

export class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class AuthenticationError extends AuthError {
  constructor(message: string = "Authentication failed", code?: string) {
    super(message, code);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AuthError {
  constructor(message: string = "Authorization failed", code?: string) {
    super(message, code);
    this.name = "AuthorizationError";
  }
}

export class ValidationError extends AuthError {
  constructor(message: string = "Validation failed", code?: string) {
    super(message, code);
    this.name = "ValidationError";
  }
}

export class OAuthError extends AuthError {
  constructor(
    message: string = "OAuth authentication failed",
    public provider?: string,
    code?: string
  ) {
    super(message, code);
    this.name = "OAuthError";
  }
}

