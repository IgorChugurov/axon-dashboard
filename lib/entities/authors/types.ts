/**
 * Типы для авторов
 */

export interface Author {
  id: string;
  name: string;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAuthorData {
  name: string;
  email?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
}

export interface UpdateAuthorData {
  name?: string;
  email?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
}

