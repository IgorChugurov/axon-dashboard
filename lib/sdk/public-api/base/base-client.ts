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
  private fieldsCache: Map<
    string,
    {
      fields: FieldConfig[];
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
   */
  protected async getFields(
    entityDefinitionId: string,
    forceRefresh = false
  ): Promise<FieldConfig[]> {
    // Если кэш отключен - всегда загружаем из БД
    if (!this.enableCache || forceRefresh) {
      return this.loadFieldsFromDB(entityDefinitionId);
    }

    // Проверяем кэш
    const cached = this.fieldsCache.get(entityDefinitionId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.fields;
    }

    // Загружаем и кэшируем
    const fields = await this.loadFieldsFromDB(entityDefinitionId);
    this.fieldsCache.set(entityDefinitionId, {
      fields,
      expiresAt: Date.now() + this.cacheTTL,
    });

    return fields;
  }

  /**
   * Загрузить fields из БД
   */
  private async loadFieldsFromDB(
    entityDefinitionId: string
  ): Promise<FieldConfig[]> {
    const { data, error } = await this.supabase
      .from("field")
      .select(
        "id, name, type, db_type, required, related_entity_definition_id, relation_field_id"
      )
      .eq("entity_definition_id", entityDefinitionId)
      .order("display_index");

    if (error) {
      throw new Error(`Failed to load fields: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      dbType: row.db_type,
      required: row.required,
      relatedEntityDefinitionId: row.related_entity_definition_id,
      relationFieldId: row.relation_field_id,
    }));
  }

  /**
   * Загрузить entityDefinition с полями (если нужна для UI)
   */
  async getEntityDefinitionConfig(
    entityDefinitionId: string,
    forceRefresh = false
  ): Promise<EntityDefinitionConfig> {
    // Загружаем entityDefinition
    const { data: entityDef, error: entityError } = (await this.supabase
      .from("entity_definition")
      .select(
        "id, name, table_name, read_permission, create_permission, update_permission, delete_permission"
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
      } | null;
      error: any;
    };

    if (entityError || !entityDef) {
      throw new Error(
        `Entity definition not found: ${
          entityError?.message || "Unknown error"
        }`
      );
    }

    // Загружаем fields (с кэшированием)
    const fields = await this.getFields(entityDefinitionId, forceRefresh);

    return {
      id: entityDef.id,
      name: entityDef.name,
      tableName: entityDef.table_name,
      readPermission: entityDef.read_permission,
      createPermission: entityDef.create_permission,
      updatePermission: entityDef.update_permission,
      deletePermission: entityDef.delete_permission,
      fields,
    };
  }

  /**
   * Очистить кэш
   */
  clearCache(): void {
    this.fieldsCache.clear();
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
    params?: { includeRelations?: string[]; relationsAsIds?: boolean }
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
