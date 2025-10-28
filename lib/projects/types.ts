// Типы для проектов

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  description?: string;
  updatedAt?: string;
  status?: string;
  ownerId?: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
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
