/**
 * Базовый класс для публичного API SDK
 * Содержит общую логику: кэширование, загрузка конфигурации
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/types";
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
import type {
  EntityInstanceWithFields,
  FieldType,
  DbType,
  FieldOption,
  EntityDefinition,
  Field,
} from "../types/entity-types";
import type { EntityUIConfig } from "../types/ui-config-types";
import { generateUIConfig } from "../utils/generateUIConfig";

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
   *
   * Флоу работы с кэшем:
   *
   * 1. Если enableCache === true (публичный API):
   *    - Проверяет кэш по entityDefinitionId
   *    - Если есть в кэше и не истек → возвращает из кэша (0 запросов к БД)
   *    - Если нет в кэше или истек → загружает из БД и кэширует (1 запрос к БД)
   *
   * 2. Если enableCache === false (админка):
   *    - Пропускает проверку кэша (эквивалент forceRefresh: true)
   *    - Всегда загружает из БД (1 запрос к БД)
   *    - Не сохраняет в кэш (всегда свежие данные)
   *
   * Используется внутри SDK для получения fields перед операциями с instances.
   * Fields нужны для определения типов полей, relations, и уплощения данных.
   */
  protected async getFields(
    entityDefinitionId: string
  ): Promise<FieldConfig[]> {
    // Загружаем всю конфигурацию (она кэшируется целиком)
    // forceRefresh определяется внутри getEntityDefinitionConfig на основе this.enableCache
    const config = await this.getEntityDefinitionConfig(entityDefinitionId);
    return config.fields;
  }

  /**
   * Преобразование данных entity_definition из БД в EntityDefinitionConfig
   */
  private transformEntityDefinitionFromDB(
    row: any
  ): Omit<EntityDefinitionConfig, "fields"> {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      tableName: row.table_name,
      type: row.type,
      projectId: row.project_id,
      createPermission: row.create_permission,
      readPermission: row.read_permission,
      updatePermission: row.update_permission,
      deletePermission: row.delete_permission,
      titleSection0: row.title_section_0,
      titleSection1: row.title_section_1,
      titleSection2: row.title_section_2,
      titleSection3: row.title_section_3,
      uiConfig: row.ui_config,
      enablePagination: row.enable_pagination,
      pageSize: row.page_size,
      enableFilters: row.enable_filters,
      maxFileSizeMb: row.max_file_size_mb,
      maxFilesCount: row.max_files_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Преобразование данных field из БД в FieldConfig
   */
  private transformFieldFromDB(row: any): FieldConfig {
    return {
      id: row.id,
      entityDefinitionId: row.entity_definition_id,
      name: row.name,
      dbType: row.db_type as DbType,
      type: row.type as FieldType,
      label: row.label,
      placeholder: row.placeholder,
      description: row.description,
      forEditPage: row.for_edit_page,
      forCreatePage: row.for_create_page,
      required: row.required,
      requiredText: row.required_text,
      forEditPageDisabled: row.for_edit_page_disabled,
      displayIndex: row.display_index,
      displayInTable: row.display_in_table,
      sectionIndex: row.section_index ?? 0,
      isOptionTitleField: row.is_option_title_field,
      searchable: row.searchable,
      filterableInList: row.filterable_in_list,
      options: row.options as FieldOption[] | undefined,
      relatedEntityDefinitionId: row.related_entity_definition_id,
      relationFieldId: row.relation_field_id,
      isRelationSource: row.is_relation_source,
      selectorRelationId: row.selector_relation_id,
      relationFieldName: row.relation_field_name,
      relationFieldLabel: row.relation_field_label,
      defaultStringValue: row.default_string_value,
      defaultNumberValue: row.default_number_value,
      defaultBooleanValue: row.default_boolean_value,
      defaultDateValue: row.default_date_value,
      autoPopulate: row.auto_populate,
      includeInSinglePma: row.include_in_single_pma,
      includeInListPma: row.include_in_list_pma,
      includeInSingleSa: row.include_in_single_sa,
      includeInListSa: row.include_in_list_sa,
      foreignKey: row.foreign_key,
      foreignKeyValue: row.foreign_key_value,
      typeFieldName: row.type_field_name,
      optionsFieldName: row.options_field_name,
      acceptFileTypes: row.accept_file_types,
      maxFileSize: row.max_file_size,
      maxFiles: row.max_files,
      storageBucket: row.storage_bucket,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Загрузить entityDefinition с полями одним запросом (JOIN)
   * Кэширует всю конфигурацию целиком (entityDefinition + fields)
   *
   * Логика кэширования:
   * - enableCache: true → использует кэш, сохраняет в кэш (TTL: 5 минут по умолчанию)
   * - enableCache: false → всегда загружает из БД, не использует кэш (эквивалент forceRefresh: true)
   *
   * @returns EntityDefinitionConfig с полями, отсортированными по display_index
   */
  async getEntityDefinitionConfig(
    entityDefinitionId: string
  ): Promise<EntityDefinitionConfig> {
    // Определяем forceRefresh на основе enableCache
    // Если кэш отключен, всегда обновляем (forceRefresh = true)
    const forceRefresh = !this.enableCache;

    // Проверяем кэш конфигурации (если кэш включен и не требуется обновление)
    if (!forceRefresh && this.enableCache) {
      const cached = this.configCache.get(entityDefinitionId);
      if (cached && Date.now() < cached.expiresAt) {
        // Конфигурация в кэше - возвращаем её (0 запросов к БД)
        return cached.config;
      }
    }

    // Загружаем entityDefinition и fields одним запросом через JOIN (все поля)
    const { data, error } = (await this.supabase
      .from("entity_definition")
      .select(
        `
        *,
        field!field_entity_definition_id_fkey (*)
      `
      )
      .eq("id", entityDefinitionId)
      .single()) as {
      data: any | null;
      error: any;
    };

    if (error || !data) {
      throw new Error(
        `Entity definition not found: ${error?.message || "Unknown error"}`
      );
    }

    // Преобразуем entityDefinition
    const entityDefinitionData = this.transformEntityDefinitionFromDB(data);

    // Преобразуем fields (сортировка по display_index)
    const fields: FieldConfig[] = ((data.field || []) as any[])
      .sort((a, b) => {
        // Сортируем по display_index
        const aIndex = a.display_index ?? 999;
        const bIndex = b.display_index ?? 999;
        return aIndex - bIndex;
      })
      .map((row: any) => this.transformFieldFromDB(row));

    // Формируем конфигурацию
    const config: EntityDefinitionConfig = {
      ...entityDefinitionData,
      fields,
    };

    // Кэшируем всю конфигурацию (если кэш включен)
    // Для админки (enableCache: false) не кэшируем - всегда свежие данные
    if (this.enableCache) {
      this.configCache.set(entityDefinitionId, {
        config,
        expiresAt: Date.now() + this.cacheTTL,
      });
    }

    return config;
  }

  /**
   * Преобразование EntityDefinitionConfig в EntityDefinition
   */
  private convertToEntityDefinition(
    config: EntityDefinitionConfig
  ): EntityDefinition {
    return {
      id: config.id,
      name: config.name,
      description: config.description,
      tableName: config.tableName,
      type: config.type,
      projectId: config.projectId,
      createPermission:
        config.createPermission as EntityDefinition["createPermission"],
      readPermission:
        config.readPermission as EntityDefinition["readPermission"],
      updatePermission:
        config.updatePermission as EntityDefinition["updatePermission"],
      deletePermission:
        config.deletePermission as EntityDefinition["deletePermission"],
      titleSection0: config.titleSection0,
      titleSection1: config.titleSection1,
      titleSection2: config.titleSection2,
      titleSection3: config.titleSection3,
      uiConfig: config.uiConfig,
      enablePagination: config.enablePagination,
      pageSize: config.pageSize,
      enableFilters: config.enableFilters,
      maxFileSizeMb: config.maxFileSizeMb,
      maxFilesCount: config.maxFilesCount,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Преобразование FieldConfig в Field
   */
  private convertToField(fieldConfig: FieldConfig): Field {
    return {
      id: fieldConfig.id,
      entityDefinitionId: fieldConfig.entityDefinitionId,
      name: fieldConfig.name,
      dbType: fieldConfig.dbType,
      type: fieldConfig.type,
      label: fieldConfig.label,
      placeholder: fieldConfig.placeholder,
      description: fieldConfig.description,
      forEditPage: fieldConfig.forEditPage,
      forCreatePage: fieldConfig.forCreatePage,
      required: fieldConfig.required,
      requiredText: fieldConfig.requiredText,
      forEditPageDisabled: fieldConfig.forEditPageDisabled,
      displayIndex: fieldConfig.displayIndex,
      displayInTable: fieldConfig.displayInTable,
      sectionIndex: fieldConfig.sectionIndex,
      isOptionTitleField: fieldConfig.isOptionTitleField,
      searchable: fieldConfig.searchable,
      filterableInList: fieldConfig.filterableInList,
      options: fieldConfig.options,
      relatedEntityDefinitionId: fieldConfig.relatedEntityDefinitionId,
      relationFieldId: fieldConfig.relationFieldId,
      isRelationSource: fieldConfig.isRelationSource,
      selectorRelationId: fieldConfig.selectorRelationId,
      relationFieldName: fieldConfig.relationFieldName,
      relationFieldLabel: fieldConfig.relationFieldLabel,
      defaultStringValue: fieldConfig.defaultStringValue,
      defaultNumberValue: fieldConfig.defaultNumberValue,
      defaultBooleanValue: fieldConfig.defaultBooleanValue,
      defaultDateValue: fieldConfig.defaultDateValue,
      autoPopulate: fieldConfig.autoPopulate,
      includeInSinglePma: fieldConfig.includeInSinglePma,
      includeInListPma: fieldConfig.includeInListPma,
      includeInSingleSa: fieldConfig.includeInSingleSa,
      includeInListSa: fieldConfig.includeInListSa,
      foreignKey: fieldConfig.foreignKey,
      foreignKeyValue: fieldConfig.foreignKeyValue,
      typeFieldName: fieldConfig.typeFieldName,
      optionsFieldName: fieldConfig.optionsFieldName,
      acceptFileTypes: fieldConfig.acceptFileTypes,
      maxFileSize: fieldConfig.maxFileSize,
      maxFiles: fieldConfig.maxFiles,
      storageBucket: fieldConfig.storageBucket,
      createdAt: fieldConfig.createdAt,
      updatedAt: fieldConfig.updatedAt,
    };
  }

  /**
   * Получить entity definition с полями и сгенерированным UI конфигом
   * Использует кэш SDK для оптимизации (если дефиниция уже загружена, не делает повторный запрос)
   *
   * @param entityDefinitionId - ID entity definition
   * @returns EntityDefinition, Fields и UI конфиг, или null если не найдено
   */
  async getEntityDefinitionWithUIConfig(entityDefinitionId: string): Promise<{
    entityDefinition: EntityDefinition;
    fields: Field[];
    uiConfig: EntityUIConfig;
  } | null> {
    try {
      // Получаем конфигурацию (использует кэш SDK)
      const config = await this.getEntityDefinitionConfig(entityDefinitionId);

      // Преобразуем в EntityDefinition и Field[]
      const entityDefinition = this.convertToEntityDefinition(config);
      const fields = config.fields.map((f) => this.convertToField(f));

      // Генерируем UI конфиг с defaults + merge с custom конфигом
      const uiConfig = generateUIConfig(entityDefinition, fields);

      return {
        entityDefinition,
        fields,
        uiConfig,
      };
    } catch (error) {
      // Если entity definition не найдена, возвращаем null
      if (error instanceof Error && error.message.includes("not found")) {
        return null;
      }
      // Пробрасываем другие ошибки
      throw error;
    }
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
