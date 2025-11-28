/**
 * Базовый класс для публичного API SDK
 * Содержит общую логику: кэширование, загрузка конфигурации
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type {
  EntityDefinitionConfig,
  FieldConfig,
  QueryParams,
  CreateInstanceData,
  UpdateInstanceData,
  PaginationResult,
  AuthResult,
  SignUpData,
  SDKOptions,
} from "../types";
import type { EntityInstanceWithFields } from "@/lib/universal-entity/types";

/**
 * Базовый класс для публичного API клиента
 */
export abstract class BasePublicAPIClient {
  protected supabase: SupabaseClient<Database>;
  protected projectId: string;
  private enableCache: boolean;
  private cacheTTL: number;
  private configCache: Map<
    string,
    {
      config: EntityDefinitionConfig;
      expiresAt: number;
    }
  > = new Map();

  constructor(
    supabase: SupabaseClient<Database>,
    projectId: string,
    options: SDKOptions = {}
  ) {
    this.supabase = supabase;
    this.projectId = projectId;
    this.enableCache = options.enableCache ?? true;
    this.cacheTTL = options.cacheTTL ?? 5 * 60 * 1000; // 5 минут
  }

  /**
   * Загрузить fields для entityDefinition (с кэшированием)
   * Извлекает fields из кэшированной конфигурации или загружает конфигурацию целиком
   */
  protected async getFields(
    entityDefinitionId: string,
    forceRefresh = false
  ): Promise<FieldConfig[]> {
    // Загружаем всю конфигурацию (она кэшируется целиком)
    const config = await this.getEntityDefinitionConfig(
      entityDefinitionId,
      forceRefresh
    );
    return config.fields;
  }

  /**
   * Загрузить entityDefinition с полями одним запросом (JOIN)
   * Кэширует всю конфигурацию целиком
   */
  async getEntityDefinitionConfig(
    entityDefinitionId: string,
    forceRefresh = false
  ): Promise<EntityDefinitionConfig> {
    // Проверяем кэш конфигурации (если кэш включен и не требуется обновление)
    if (!forceRefresh && this.enableCache) {
      const cached = this.configCache.get(entityDefinitionId);
      if (cached && Date.now() < cached.expiresAt) {
        // Конфигурация в кэше - возвращаем её
        return cached.config;
      }
    }

    // Загружаем entityDefinition и fields одним запросом через JOIN
    const { data, error } = (await this.supabase
      .from("entity_definition")
      .select(
        `
        id, name, table_name, read_permission, create_permission, update_permission, delete_permission,
        field!field_entity_definition_id_fkey (
          id, name, type, db_type, required, related_entity_definition_id, relation_field_id, display_index
        )
      `
      )
      .eq("id", entityDefinitionId)
      .single()) as {
      data: {
        id: string;
        name: string;
        table_name: string;
        read_permission: string;
        create_permission: string;
        update_permission: string;
        delete_permission: string;
        field: Array<{
          id: string;
          name: string;
          type: string;
          db_type: string;
          required: boolean;
          related_entity_definition_id: string | null;
          relation_field_id: string | null;
          display_index: number;
        }> | null;
      } | null;
      error: any;
    };

    if (error || !data) {
      throw new Error(
        `Entity definition not found: ${error?.message || "Unknown error"}`
      );
    }

    // Преобразуем fields (сортировка по display_index)
    const fields: FieldConfig[] = ((data.field || []) as any[])
      .sort((a, b) => {
        // Сортируем по display_index
        const aIndex = a.display_index ?? 999;
        const bIndex = b.display_index ?? 999;
        return aIndex - bIndex;
      })
      .map((row: any) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        dbType: row.db_type,
        required: row.required,
        relatedEntityDefinitionId: row.related_entity_definition_id,
        relationFieldId: row.relation_field_id,
      }));

    // Формируем конфигурацию
    const config: EntityDefinitionConfig = {
      id: data.id,
      name: data.name,
      tableName: data.table_name,
      readPermission: data.read_permission,
      createPermission: data.create_permission,
      updatePermission: data.update_permission,
      deletePermission: data.delete_permission,
      fields,
    };

    // Кэшируем всю конфигурацию (если кэш включен)
    if (this.enableCache) {
      this.configCache.set(entityDefinitionId, {
        config,
        expiresAt: Date.now() + this.cacheTTL,
      });
    }

    return config;
  }

  /**
   * Очистить кэш
   */
  clearCache(): void {
    this.configCache.clear();
  }

  // Абстрактные методы для CRUD операций
  abstract getInstances(
    entityDefinitionId: string,
    params?: QueryParams
  ): Promise<{
    data: EntityInstanceWithFields[];
    pagination: PaginationResult;
  }>;

  abstract getInstance(
    entityDefinitionId: string,
    id: string,
    params?: { relationsAsIds?: boolean }
  ): Promise<EntityInstanceWithFields>;

  abstract createInstance(
    entityDefinitionId: string,
    data: CreateInstanceData
  ): Promise<EntityInstanceWithFields>;

  abstract updateInstance(
    entityDefinitionId: string,
    id: string,
    data: UpdateInstanceData
  ): Promise<EntityInstanceWithFields>;

  abstract deleteInstance(
    entityDefinitionId: string,
    id: string
  ): Promise<void>;

  // Абстрактные методы для авторизации
  abstract signIn(email: string, password: string): Promise<AuthResult>;
  abstract signUp(data: SignUpData): Promise<AuthResult>;
  abstract signOut(): Promise<void>;
  abstract getCurrentUser(): Promise<AuthResult["user"] | null>;
}
