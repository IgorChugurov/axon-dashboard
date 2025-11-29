/**
 * Классы ошибок для публичного API SDK
 */

export class SDKError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "SDKError";
  }
}

export class NotFoundError extends SDKError {
  constructor(resource: string, id?: string) {
    super(
      "NOT_FOUND",
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      404
    );
  }
}

export class PermissionDeniedError extends SDKError {
  constructor(action: string, resource: string) {
    super(
      "PERMISSION_DENIED",
      `Permission denied: cannot ${action} ${resource}`,
      403
    );
  }
}

export class ValidationError extends SDKError {
  constructor(field: string, message: string) {
    super(
      "VALIDATION_ERROR",
      `Validation failed for ${field}: ${message}`,
      400,
      {
        field,
        message,
      }
    );
  }
}

export class AuthenticationError extends SDKError {
  constructor(message = "Authentication required") {
    super("AUTHENTICATION_REQUIRED", message, 401);
  }
}

/**
 * Обработка ошибок Supabase и преобразование в SDK ошибки
 */
export function handleSupabaseError(error: any): never {
  // PGRST116 = Row not found
  if (error.code === "PGRST116") {
    throw new NotFoundError("Resource");
  }

  // 23505 = Unique violation (duplicate entry)
  if (error.code === "23505") {
    throw new SDKError("DUPLICATE_ENTRY", "Duplicate entry", 409);
  }

  // 23503 = Foreign key violation
  if (error.code === "23503") {
    throw new SDKError("FOREIGN_KEY_VIOLATION", "Foreign key violation", 400);
  }

  // 42501 = Insufficient privilege (RLS)
  if (error.code === "42501") {
    throw new PermissionDeniedError("access", "resource");
  }

  // Общая ошибка
  throw new SDKError(
    "UNKNOWN_ERROR",
    error.message || "Unknown error",
    500,
    error
  );
}

/**
 * Обработка ошибок при работе с entity instance
 * Специфичная обработка для операций с instances
 */
export function handleInstanceError(error: any, instanceId: string): never {
  // PGRST116 = Row not found
  if (error?.code === "PGRST116") {
    throw new NotFoundError("Entity instance", instanceId);
  }

  // 42501 = Insufficient privilege (RLS) - нет прав доступа
  if (error?.code === "42501") {
    throw new PermissionDeniedError("read", `entity instance ${instanceId}`);
  }

  // Остальные ошибки через общую обработку
  handleSupabaseError(error);
}
