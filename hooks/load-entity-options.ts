/**
 * Утилита для загрузки options для relation-полей через SDK
 * Используется в useEntityOptions и других местах
 */

import type { PublicAPIClient } from "@igorchugurov/public-api-sdk";

export interface Option {
  id: string;
  title: string;
}

export interface EntityOptionsData {
  options: Option[];
  titleField: string;
}

/**
 * Загружает options для relation-поля через SDK
 */
export async function loadEntityOptions(
  relatedEntityDefinitionId: string,
  sdk: PublicAPIClient
): Promise<EntityOptionsData> {
  try {
    // 1. Получаем конфигурацию entity definition через SDK (использует кэш)
    const config = await sdk.getEntityDefinitionConfig(
      relatedEntityDefinitionId
    );

    // 2. Находим поле для отображения названия (isOptionTitleField или первое поле)
    const titleField =
      config.fields.find((f) => f.isOptionTitleField) || config.fields[0];
    const titleFieldName = titleField?.name || "id";

    // 3. Загружаем экземпляры через SDK (для options нужны все)
    const result = await sdk.getInstances(relatedEntityDefinitionId, {
      page: 1,
      limit: 1000, // TODO: добавить пагинацию если нужно больше
    });

    // 4. Формируем options из загруженных экземпляров
    const options: Option[] = (result.data || []).map((instance) => {
      // Экземпляр уже уплощен SDK, поля на верхнем уровне
      const title = (instance as any)[titleFieldName] || instance.id;

      return {
        id: instance.id,
        title: String(title),
      };
    });

    return { options, titleField: titleFieldName };
  } catch (error) {
    console.error(
      "[loadEntityOptions] Failed to load options:",
      relatedEntityDefinitionId,
      error
    );
    throw new Error(
      `Failed to load options: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
