/**
 * Типы для проектов
 * Соответствуют структуре таблицы projects в Supabase
 */

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectData {
  name: string;
  description?: string | null;
  status?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string | null;
  status?: string;
}

