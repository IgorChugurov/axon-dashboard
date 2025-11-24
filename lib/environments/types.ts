/**
 * Типы для Environments
 * Переменные окружения для проектов
 */

export type EnvironmentType = "string" | "number" | "boolean" | "select";

export interface Environment {
  id: string;
  projectId: string;
  key: string;
  type: EnvironmentType;
  value: string | number | boolean | null;
  options: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnvironmentData {
  key: string;
  type: EnvironmentType;
  value: string | number | boolean | null;
  options: string[];
}

export type UpdateEnvironmentData = Partial<CreateEnvironmentData>;

export interface EnvironmentsResponse {
  data: Environment[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

