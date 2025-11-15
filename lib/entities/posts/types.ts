/**
 * Типы для постов
 */

import type { Author } from "../authors/types";
import type { Tag } from "../tags/types";

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  status: "draft" | "published" | "archived";
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Связанные данные (загружаются через afterFetch hook)
  author?: Author | null;
  tags?: Tag[];
}

export interface CreatePostData {
  title: string;
  slug?: string;
  content?: string | null;
  excerpt?: string | null;
  status?: "draft" | "published" | "archived";
  author_id: string;
  published_at?: string | null;
  tag_ids?: string[]; // Для создания связей с тегами
}

export interface UpdatePostData {
  title?: string;
  slug?: string;
  content?: string | null;
  excerpt?: string | null;
  status?: "draft" | "published" | "archived";
  author_id?: string;
  published_at?: string | null;
  tag_ids?: string[]; // Для обновления связей с тегами
}

