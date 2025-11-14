// Базовый класс для работы с серверными данными

import { ServerDataParams, ServerDataResponse } from "./types";
import { getEntityData } from "@/lib/api/server";
import { formatEntityResponse } from "@/lib/api/handlers";

export abstract class ServerDataProvider<T> {
  protected apiEndpoint: string;
  protected configPath?: string;

  constructor(apiEndpoint: string, configPath?: string) {
    this.apiEndpoint = apiEndpoint;
    this.configPath = configPath;
  }

  /**
   * Получение данных с сервера через прямое обращение к API
   * Использует прямую функцию вместо HTTP fetch для серверных компонентов
   */
  async getData(params: ServerDataParams): Promise<ServerDataResponse<T>> {
    try {
      console.log(
        `[${this.constructor.name}] Getting data with params:`,
        params
      );

      // Извлекаем имя сущности из endpoint (например, "/api/projects" -> "projects")
      const entity = this.apiEndpoint.replace("/api/", "").replace(/^\//, "");
      console.log(`[${this.constructor.name}] Entity:`, entity);

      // Прямой вызов функции без HTTP слоя (получаем сырые данные)
      const rawData = await getEntityData(entity, params);
      console.log(`[${this.constructor.name}] Data received successfully`);

      // Форматируем ответ (преобразуем сырые данные в нужный формат)
      return this.formatResponse(rawData, entity);
    } catch (error) {
      // Если это NEXT_REDIRECT ошибка - не перехватываем её
      if (
        error &&
        typeof error === "object" &&
        "digest" in error &&
        typeof error.digest === "string" &&
        error.digest.startsWith("NEXT_REDIRECT")
      ) {
        throw error; // Перебрасываем NEXT_REDIRECT без изменений
      }

      console.error(`[${this.constructor.name}] Error:`, error);
      throw error;
    }
  }

  /**
   * Создание новой записи через прямое обращение к API
   * TODO: Реализовать через createEntityData() аналогично getEntityData()
   * Пока оставляем заглушку - используется редко
   */
  async createData(data: Partial<T>): Promise<T> {
    throw new Error(
      "createData() not implemented yet. Use route handler /api/[entity] for POST requests."
    );
  }

  /**
   * Форматирование ответа от API
   * Переопределяется в наследниках для специфичной логики
   */
  protected formatResponse(
    rawData: unknown,
    entity: string
  ): ServerDataResponse<T> {
    // Используем общую функцию форматирования
    const formatted = formatEntityResponse(rawData, entity);

    return {
      data: (formatted.data as T[]) || [],
      pagination: formatted.pagination,
      config: formatted.config,
    };
  }
}
