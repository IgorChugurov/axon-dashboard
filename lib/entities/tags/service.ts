/**
 * Сервис для работы с тегами
 */

import { createEntityService } from "@/lib/entity-service";
import type { Tag } from "./types";

/**
 * Сервис тегов с автогенерацией slug
 */
export const tagsService = createEntityService<Tag>({
  tableName: "tags",
  searchFields: ["name", "slug"],
  defaultSortBy: "name",
  defaultSortOrder: "asc",

  hooks: {
    // Автоматически генерируем slug из name, если не указан
    beforeCreate: async (data) => {
      if (!data.slug && data.name) {
        data.slug = data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      // Цвет по умолчанию
      if (!data.color) {
        data.color = "#3b82f6";
      }

      return data;
    },

    beforeUpdate: async (id, data) => {
      // Обновляем slug, если изменилось имя
      if (data.name && !data.slug) {
        data.slug = data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      return data;
    },
  },
});

