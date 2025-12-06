/**
 * Утилиты для генерации slug из строк
 * Slug используется для URL-friendly идентификаторов в клиентских приложениях
 */

/**
 * Генерирует slug из строки
 * Преобразует строку в URL-friendly формат: lowercase, заменяет пробелы и спецсимволы на дефисы
 */
export function generateSlug(name: string): string {
  if (!name || typeof name !== "string") {
    throw new Error("Name must be a non-empty string");
  }

  return (
    name
      .toLowerCase()
      .trim()
      // Заменяем все не-латинские буквы, цифры и дефисы на дефисы
      .replace(/[^a-z0-9]+/g, "-")
      // Удаляем дефисы в начале и конце
      .replace(/^-+|-+$/g, "")
      // Ограничиваем длину (максимум 100 символов для производительности)
      .substring(0, 100)
  );
}

/**
 * Генерирует случайный суффикс из 4 символов (буквы и цифры)
 */
function generateRandomSuffix(): string {
  return Math.random().toString(36).substring(2, 6);
}

/**
 * Генерирует уникальный slug для EntityDefinition
 * Проверяет уникальность в рамках проекта
 *
 * @param name - название entity definition
 * @param projectId - ID проекта
 * @param checkExists - функция проверки существования slug
 * @param excludeId - ID entity definition для исключения (при обновлении)
 * @returns уникальный slug
 */
export async function generateUniqueSlugForEntityDefinition(
  name: string,
  projectId: string,
  checkExists: (
    slug: string,
    projectId: string,
    excludeId?: string
  ) => Promise<boolean>,
  excludeId?: string
): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const exists = await checkExists(slug, projectId, excludeId);

    if (!exists) {
      return slug;
    }

    // Добавляем случайный суффикс из 4 символов
    const randomSuffix = generateRandomSuffix();
    slug = `${baseSlug}-${randomSuffix}`;
    attempts++;
  }

  // Fallback: используем timestamp если не удалось найти уникальный slug за 100 попыток
  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
}

/**
 * Генерирует уникальный slug для EntityInstance
 * Проверяет уникальность в рамках одной entityDefinition
 *
 * @param name - название instance (из поля name в data)
 * @param entityDefinitionId - ID entity definition
 * @param checkExists - функция проверки существования slug
 * @param excludeId - ID instance для исключения (при обновлении)
 * @returns уникальный slug
 */
export async function generateUniqueSlugForInstance(
  name: string,
  entityDefinitionId: string,
  checkExists: (
    slug: string,
    entityDefinitionId: string,
    excludeId?: string
  ) => Promise<boolean>,
  excludeId?: string
): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const exists = await checkExists(slug, entityDefinitionId, excludeId);

    if (!exists) {
      return slug;
    }

    // Добавляем случайный суффикс из 4 символов
    const randomSuffix = generateRandomSuffix();
    slug = `${baseSlug}-${randomSuffix}`;
    attempts++;
  }

  // Fallback: используем timestamp если не удалось найти уникальный slug за 100 попыток
  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
}
