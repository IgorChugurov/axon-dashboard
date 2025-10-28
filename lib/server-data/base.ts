// Базовый класс для работы с серверными данными

import {
  ServerDataParams,
  ServerDataResponse,
  buildUrlWithParams,
} from "./types";
import { cookies } from "next/headers";

export abstract class ServerDataProvider<T> {
  protected apiEndpoint: string;
  protected configPath?: string;

  constructor(apiEndpoint: string, configPath?: string) {
    this.apiEndpoint = apiEndpoint;
    this.configPath = configPath;
  }

  /**
   * Получение полного URL для серверного контекста
   */
  private getFullUrl(url: string): string {
    // Если URL уже полный (начинается с http), возвращаем как есть
    if (url.startsWith("http")) {
      return url;
    }

    // Для серверного контекста добавляем базовый URL
    const baseUrl = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";
    console.log("baseUrl:", baseUrl);
    return `${baseUrl}${url}`;
  }

  /**
   * Получение данных с сервера через собственное API
   */
  async getData(params: ServerDataParams): Promise<ServerDataResponse<T>> {
    try {
      console.log(
        `[${this.constructor.name}] Getting data with params:`,
        params
      );

      // 1. Строим URL с параметрами
      const url = buildUrlWithParams(this.apiEndpoint, params);
      console.log(`[${this.constructor.name}] API URL:`, url);

      // 2. Для серверного контекста добавляем базовый URL
      const fullUrl = this.getFullUrl(url);
      console.log(`[${this.constructor.name}] Full URL:`, fullUrl);

      // 3. Получаем cookies для передачи в запросе
      const cookieStore = await cookies();
      const cookieHeader = cookieStore.toString();

      // 4. Делаем запрос к собственному API с cookies
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(cookieHeader && { Cookie: cookieHeader }),
        },
        cache: "no-store",
      });

      console.log(
        `[${this.constructor.name}] API response status:`,
        response.status
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${this.constructor.name}] API error:`, errorText);
        throw new Error(`API request failed: ${errorText}`);
      }

      // 3. Парсим данные
      const data = await response.json();
      console.log(`[${this.constructor.name}] Data received successfully`);

      // 4. Форматируем ответ
      return this.formatResponse(data);
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
   * Создание новой записи через собственное API
   */
  async createData(data: Partial<T>): Promise<T> {
    try {
      console.log(`[${this.constructor.name}] Creating data:`, data);

      const fullUrl = this.getFullUrl(this.apiEndpoint);
      console.log(`[${this.constructor.name}] Create URL:`, fullUrl);

      // Получаем cookies для передачи в запросе
      const cookieStore = await cookies();
      const cookieHeader = cookieStore.toString();

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(cookieHeader && { Cookie: cookieHeader }),
        },
        body: JSON.stringify(data),
      });

      console.log(
        `[${this.constructor.name}] Create response status:`,
        response.status
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${this.constructor.name}] Create error:`, errorText);
        throw new Error(`Failed to create: ${errorText}`);
      }

      const result = await response.json();
      console.log(`[${this.constructor.name}] Data created successfully`);
      return result;
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

      console.error(`[${this.constructor.name}] Create error:`, error);
      throw error;
    }
  }

  /**
   * Форматирование ответа от API
   * Переопределяется в наследниках для специфичной логики
   */
  protected formatResponse(data: unknown): ServerDataResponse<T> {
    const responseData = data as {
      data?: T[];
      pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasPreviousPage: boolean;
        hasNextPage: boolean;
      };
      config?: unknown;
    };

    return {
      data: responseData.data || (data as T[]),
      pagination: responseData.pagination,
      config: responseData.config,
    };
  }
}
