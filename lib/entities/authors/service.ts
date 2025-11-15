/**
 * Сервис для работы с авторами
 */

import { createEntityService } from "@/lib/entity-service";
import type { Author } from "./types";

/**
 * Простой сервис авторов - без дополнительных hooks
 */
export const authorsService = createEntityService<Author>({
  tableName: "authors",
  searchFields: ["name", "email", "bio"],
  defaultSortBy: "name",
  defaultSortOrder: "asc",
});

