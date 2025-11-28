// Типы для проектов
// Соответствуют структуре таблицы projects в Supabase

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdBy: string | null;
  enableSignIn: boolean;
  enableSignUp: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  name: string;
  description?: string | null;
  status?: string;
  enableSignIn?: boolean;
  enableSignUp?: boolean;
}

export interface UpdateProjectData {
  name?: string;
  description?: string | null;
  status?: string;
  enableSignIn?: boolean;
  enableSignUp?: boolean;
}

export interface ProjectsResponse {
  data: Project[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  config?: unknown;
}
