/**
 * Типы для тегов
 */

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTagData {
  name: string;
  slug: string;
  color?: string;
}

export interface UpdateTagData {
  name?: string;
  slug?: string;
  color?: string;
}

