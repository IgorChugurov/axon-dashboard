/**
 * Унифицированный SDK клиент для работы с экземплярами сущностей
 * Поддерживает как Server Components (SSR), так и Client Components
 * Использует динамические импорты для изоляции server/client кода
 */

import { BasePublicAPIClient } from "./base/base-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";
import type {
  QueryParams,
  CreateInstanceData,
  UpdateInstanceData,
  PaginationResult,
  AuthResult,
  SignUpData,
  SDKOptions,
} from "./types";
import type { EntityInstanceWithFields } from "./types/entity-types";
import {
  transformEntityInstance,
  flattenInstance,
} from "./utils/instance-utils";
import {
  SDKError,
  NotFoundError,
  PermissionDeniedError,
  handleSupabaseError,
  handleInstanceError,
  AuthenticationError,
} from "./errors";

/**
 * Унифицированный публичный API клиент
 * Работает как в server, так и в client режиме
 */
export class PublicAPIClient extends BasePublicAPIClient {
  private static instances: Map<string, PublicAPIClient> = new Map();
  private mode: "server" | "client";

  private constructor(
    supabase: SupabaseClient<Database>,
    projectId: string,
    mode: "server" | "client",
    options: SDKOptions = {}
  ) {
    super(supabase, projectId, options);
    this.mode = mode;
  }

  /**
   * Создать SDK клиент напрямую с Supabase инстансом
   * Используется для создания через фабричные функции createServerSDK/createClientSDK
   *
   * @param supabase - Supabase клиент
   * @param projectId - ID проекта
   * @param mode - Режим работы: 'server' для SSR, 'client' для браузера
   * @param options - Опции SDK (кэширование и т.д.)
   */
  static create(
    supabase: SupabaseClient<Database>,
    projectId: string,
    mode: "server" | "client",
    options: SDKOptions = {}
  ): PublicAPIClient {
    const cacheKey = `${mode}-${projectId}-${JSON.stringify(options)}`;

    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    const client = new PublicAPIClient(supabase, projectId, mode, options);

    this.instances.set(cacheKey, client);
    return client;
  }

  /**
   * Получить режим работы клиента (для отладки)
   */
  getMode(): "server" | "client" {
    return this.mode;
  }

  /**
   * Получить один экземпляр
   */
  async getInstance(
    entityDefinitionId: string,
    id: string,
    params?: { relationsAsIds?: boolean }
  ): Promise<EntityInstanceWithFields> {
    try {
      // 1. Получаем fields из кэша SDK
      const fields = await this.getFields(entityDefinitionId);

      // 2. Получаем instance (используем this.supabase)
      const { data: instance, error: instanceError } = (await this.supabase
        .from("entity_instance")
        .select("*")
        .eq("id", id)
        .eq("entity_definition_id", entityDefinitionId)
        .eq("project_id", this.projectId)
        .single()) as {
        data: {
          id: string;
          entity_definition_id: string;
          project_id: string;
          data: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        } | null;
        error: any;
      };

      if (instanceError || !instance) {
        // Обрабатываем ошибки получения instance
        handleInstanceError(
          instanceError || new Error("Instance not found"),
          id
        );
      }

      // Трансформируем экземпляр
      const transformedInstance = transformEntityInstance(instance);

      // Проверяем принадлежность к entityDefinitionId
      if (transformedInstance.entityDefinitionId !== entityDefinitionId) {
        throw new NotFoundError("Entity instance", id);
      }

      // 3. Определяем все relation fields
      const relationFields = fields.filter(
        (f) =>
          f.dbType === "manyToMany" ||
          f.dbType === "manyToOne" ||
          f.dbType === "oneToMany" ||
          f.dbType === "oneToOne"
      );

      // 4. Загружаем все relations одним batch-запросом (используем this.supabase)
      const relations: Record<string, EntityInstanceWithFields[]> = {};
      if (relationFields.length > 0) {
        const relationFieldIds = relationFields
          .map((f) => f.id)
          .filter((id): id is string => Boolean(id));

        if (relationFieldIds.length > 0) {
          // Batch-запрос: получаем все relations для всех полей одним запросом
          const { data: allRelations, error: relationsError } =
            (await this.supabase
              .from("entity_relation")
              .select("target_instance_id, relation_field_id")
              .eq("source_instance_id", id)
              .in("relation_field_id", relationFieldIds)) as {
              data: Array<{
                target_instance_id: string;
                relation_field_id: string;
              }> | null;
              error: any;
            };

          if (relationsError) {
            // Пробрасываем ошибку загрузки relations для отладки
            throw new SDKError(
              "RELATIONS_LOAD_ERROR",
              `Failed to load relations for instance ${id}: ${relationsError.message}`,
              500,
              relationsError
            );
          }

          if (allRelations && allRelations.length > 0) {
            // Получаем все уникальные target_instance_id
            const targetInstanceIds = [
              ...new Set(allRelations.map((r) => r.target_instance_id)),
            ];

            // Загружаем все связанные экземпляры одним запросом
            const { data: relatedInstances, error: instancesError } =
              (await this.supabase
                .from("entity_instance")
                .select("*")
                .in("id", targetInstanceIds)) as {
                data: Array<{
                  id: string;
                  entity_definition_id: string;
                  project_id: string;
                  data: Record<string, unknown>;
                  created_at: string;
                  updated_at: string;
                }> | null;
                error: any;
              };

            if (instancesError) {
              // Пробрасываем ошибку загрузки связанных instances для отладки
              throw new SDKError(
                "RELATED_INSTANCES_LOAD_ERROR",
                `Failed to load related instances for instance ${id}: ${instancesError.message}`,
                500,
                instancesError
              );
            }

            if (relatedInstances) {
              // Создаем карту связанных экземпляров
              const relatedInstancesMap = new Map(
                relatedInstances.map((inst) => [
                  inst.id,
                  transformEntityInstance(inst),
                ])
              );

              // Группируем relations по полям
              for (const relation of allRelations) {
                const relationField = relationFields.find(
                  (f) => f.id === relation.relation_field_id
                );
                if (relationField) {
                  const relatedInstance = relatedInstancesMap.get(
                    relation.target_instance_id
                  );
                  if (relatedInstance) {
                    if (!relations[relationField.name]) {
                      relations[relationField.name] = [];
                    }
                    relations[relationField.name].push(
                      relatedInstance as unknown as EntityInstanceWithFields
                    );
                  }
                }
              }
            }
          }
        }
      }

      // 5. Загружаем файлы одним batch-запросом (используем this.supabase)
      const fileFields = fields.filter(
        (f) => f.type === "files" || f.type === "images"
      );

      if (fileFields.length > 0) {
        const { data: allFiles, error: filesError } = (await this.supabase
          .from("entity_file")
          .select("id, field_id")
          .eq("entity_instance_id", id)) as {
          data: Array<{ id: string; field_id: string | null }> | null;
          error: any;
        };

        if (filesError) {
          // Пробрасываем ошибку загрузки файлов для отладки
          throw new SDKError(
            "FILES_LOAD_ERROR",
            `Failed to load files for instance ${id}: ${filesError.message}`,
            500,
            filesError
          );
        }

        if (allFiles) {
          // Группируем файлы по field_id
          const filesByFieldId = new Map<string, string[]>();
          allFiles.forEach((file) => {
            if (file.field_id) {
              if (!filesByFieldId.has(file.field_id)) {
                filesByFieldId.set(file.field_id, []);
              }
              filesByFieldId.get(file.field_id)!.push(file.id);
            }
          });

          // Подставляем массивы ID файлов в data для каждого поля
          fileFields.forEach((field) => {
            const fileIds = filesByFieldId.get(field.id) || [];
            if (fileIds.length > 0 || !transformedInstance.data[field.name]) {
              transformedInstance.data[field.name] = fileIds;
            }
          });
        }
      }

      // 6. Создаем объект с relations для уплощения
      const instanceWithRelations = {
        ...transformedInstance,
        relations: Object.keys(relations).length > 0 ? relations : undefined,
      };

      // 7. Уплощаем экземпляр используя утилиту из SDK
      return flattenInstance(
        instanceWithRelations,
        fields.map((f) => ({ name: f.name, dbType: f.dbType })),
        params?.relationsAsIds ?? false
      );
    } catch (error: any) {
      // Если ошибка уже является SDKError (NotFoundError, PermissionDeniedError и т.д.)
      // просто пробрасываем её дальше
      if (
        error instanceof NotFoundError ||
        error instanceof PermissionDeniedError ||
        error instanceof SDKError
      ) {
        throw error;
      }

      // Для остальных ошибок используем общую обработку
      handleSupabaseError(error);
    }
  }

  /**
   * Получить список экземпляров
   * Поддерживает поиск, фильтры (JSONB и relation), пагинацию
   */
  async getInstances(
    entityDefinitionId: string,
    params?: QueryParams
  ): Promise<{
    data: EntityInstanceWithFields[];
    pagination: PaginationResult;
  }> {
    try {
      // 1. Получаем fields из кэша SDK
      const fields = await this.getFields(entityDefinitionId);

      // 2. Настраиваем пагинацию
      const page = params?.page || 1;
      const limit = params?.limit || 20;
      const offset = (page - 1) * limit;

      // 3. Разделяем фильтры на обычные (JSONB) и relation-фильтры
      const relationFilterFieldNames = new Set(
        (params?.relationFilters || []).map((rf) => rf.fieldName)
      );

      const jsonbFilters: Record<string, string[]> = {};
      const relationFiltersToApply: Array<{
        fieldName: string;
        fieldId: string;
        values: string[];
      }> = [];

      if (params?.filters) {
        Object.entries(params.filters).forEach(([fieldName, values]) => {
          if (values && values.length > 0) {
            if (relationFilterFieldNames.has(fieldName)) {
              // Это relation-фильтр
              const relationInfo = params.relationFilters?.find(
                (rf) => rf.fieldName === fieldName
              );
              if (relationInfo) {
                relationFiltersToApply.push({
                  fieldName,
                  fieldId: relationInfo.fieldId,
                  values,
                });
              }
            } else {
              // Это обычный JSONB-фильтр
              jsonbFilters[fieldName] = values;
            }
          }
        });
      }

      // 4. Если есть relation-фильтры, сначала получаем ID экземпляров из entity_relation
      let allowedInstanceIds: string[] | null = null;

      if (relationFiltersToApply.length > 0) {
        // Получаем режимы фильтрации для каждого поля (по умолчанию "any")
        const filterModes = params?.relationFilterModes || {};

        // Группируем фильтры по режиму
        const anyModeFilters: typeof relationFiltersToApply = [];
        const allModeFilters: typeof relationFiltersToApply = [];

        relationFiltersToApply.forEach((rf) => {
          const mode = filterModes[rf.fieldName] || "any";
          if (mode === "all") {
            allModeFilters.push(rf);
          } else {
            anyModeFilters.push(rf);
          }
        });

        // Обрабатываем фильтры с режимом "any"
        const anyModeInstanceIds: Set<string> | null =
          anyModeFilters.length > 0 ? new Set() : null;

        if (anyModeInstanceIds !== null && anyModeFilters.length > 0) {
          // ANY: хотя бы одна из связей должна совпадать
          const orConditions = anyModeFilters.flatMap((rf) =>
            rf.values.map(
              (targetId) =>
                `and(relation_field_id.eq.${rf.fieldId},target_instance_id.eq.${targetId})`
            )
          );

          const { data: relations, error: relError } = (await this.supabase
            .from("entity_relation")
            .select("source_instance_id")
            .or(orConditions.join(","))) as {
            data: { source_instance_id: string }[] | null;
            error: any;
          };

          if (relError) {
            throw new SDKError(
              "RELATION_FILTER_ERROR",
              `Failed to apply relation filters (any mode): ${relError.message}`,
              500,
              relError
            );
          } else if (relations) {
            relations.forEach((r) =>
              anyModeInstanceIds.add(r.source_instance_id)
            );
          }
        }

        // Обрабатываем фильтры с режимом "all"
        const allModeInstanceIdSets: Set<string>[] = [];

        for (const rf of allModeFilters) {
          const { data: relations, error: relError } = (await this.supabase
            .from("entity_relation")
            .select("source_instance_id, target_instance_id")
            .eq("relation_field_id", rf.fieldId)
            .in("target_instance_id", rf.values)) as {
            data:
              | { source_instance_id: string; target_instance_id: string }[]
              | null;
            error: any;
          };

          if (relError) {
            throw new SDKError(
              "RELATION_FILTER_ERROR",
              `Failed to apply relation filters (all mode): ${relError.message}`,
              500,
              relError
            );
          }

          if (relations) {
            const sourceTargetMap = new Map<string, Set<string>>();
            relations.forEach((r) => {
              if (!sourceTargetMap.has(r.source_instance_id)) {
                sourceTargetMap.set(r.source_instance_id, new Set());
              }
              sourceTargetMap
                .get(r.source_instance_id)!
                .add(r.target_instance_id);
            });

            const validSources = new Set<string>();
            const requiredTargets = new Set(rf.values);

            sourceTargetMap.forEach((targets, sourceId) => {
              const hasAll = [...requiredTargets].every((t) => targets.has(t));
              if (hasAll) {
                validSources.add(sourceId);
              }
            });

            allModeInstanceIdSets.push(validSources);
          }
        }

        // Объединяем результаты
        if (anyModeInstanceIds !== null || allModeInstanceIdSets.length > 0) {
          if (anyModeInstanceIds !== null && anyModeInstanceIds.size > 0) {
            allowedInstanceIds = [...anyModeInstanceIds];
          } else if (allModeInstanceIdSets.length > 0) {
            allowedInstanceIds = [...allModeInstanceIdSets[0]];
          }

          if (allowedInstanceIds !== null && allModeInstanceIdSets.length > 0) {
            for (const idSet of allModeInstanceIdSets) {
              allowedInstanceIds = allowedInstanceIds.filter((id) =>
                idSet.has(id)
              );
            }
          }
        }

        if (allowedInstanceIds !== null && allowedInstanceIds.length === 0) {
          return {
            data: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasPreviousPage: false,
              hasNextPage: false,
            },
          };
        }
      }

      // 5. Определяем поля для поиска
      const searchFields =
        params?.searchableFields && params.searchableFields.length > 0
          ? params.searchableFields
          : ["name"];
      const searchTerm = params?.search?.trim() || null;

      let data: any[] | null = null;
      let error: any = null;
      let count: number | null = null;

      interface SearchResult {
        id: string;
        entity_definition_id: string;
        project_id: string;
        data: Record<string, unknown>;
        created_at: string;
        updated_at: string;
        total_count: number;
      }

      // 6. Если есть поиск - используем RPC функцию
      if (searchTerm) {
        const rpcParams = {
          p_entity_definition_id: entityDefinitionId,
          p_project_id: this.projectId,
          p_search_term: searchTerm,
          p_search_fields: searchFields,
          p_limit: limit,
          p_offset: offset,
        };

        const { data: rpcData, error: rpcError } = (await this.supabase.rpc(
          "search_entity_instances" as any,
          rpcParams as any
        )) as { data: SearchResult[] | null; error: any };

        if (rpcError) {
          error = rpcError;
        } else if (rpcData && rpcData.length > 0) {
          count = rpcData[0].total_count;
          data = rpcData;
        } else {
          data = [];
          count = 0;
        }
      } else {
        // 7. Обычный запрос без поиска
        let query = this.supabase
          .from("entity_instance")
          .select("*", { count: "exact" })
          .eq("entity_definition_id", entityDefinitionId)
          .eq("project_id", this.projectId);

        if (allowedInstanceIds !== null && allowedInstanceIds.length > 0) {
          query = query.in("id", allowedInstanceIds);
        }

        if (Object.keys(jsonbFilters).length > 0) {
          Object.entries(jsonbFilters).forEach(([fieldName, values]) => {
            if (values && values.length > 0) {
              query = query.or(
                values.map((v) => `data->>${fieldName}.eq.${v}`).join(",")
              );
            }
          });
        }

        const sortBy = params?.sortBy || "created_at";
        const sortOrder = params?.sortOrder || "desc";
        query = query.order(sortBy, { ascending: sortOrder === "asc" });
        query = query.range(offset, offset + limit - 1);

        const result = await query;
        data = result.data;
        error = result.error;
        count = result.count;
      }

      if (error) {
        handleSupabaseError(error);
      }

      if (!data || data.length === 0) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
            hasPreviousPage: page > 1,
            hasNextPage: page < Math.ceil((count || 0) / limit),
          },
        };
      }

      // 8. Трансформируем экземпляры
      const transformedInstances = data.map(transformEntityInstance);

      // 9. Загружаем relations batch-запросом (если нужно)
      const relationsMap = new Map<
        string,
        Record<string, EntityInstanceWithFields[]>
      >();

      if (
        params?.includeRelations &&
        params.includeRelations.length > 0 &&
        transformedInstances.length > 0
      ) {
        const relationFields = params.includeRelations
          .map((fieldName) => {
            const field = fields.find(
              (f) =>
                f.name === fieldName &&
                (f.dbType === "manyToMany" ||
                  f.dbType === "manyToOne" ||
                  f.dbType === "oneToMany" ||
                  f.dbType === "oneToOne")
            );
            return field ? { name: fieldName, field } : null;
          })
          .filter(
            (f): f is { name: string; field: (typeof fields)[0] } => f !== null
          );

        if (relationFields.length > 0) {
          const instanceIds = transformedInstances.map((inst) => inst.id);
          const relationFieldIds = relationFields.map((rf) => rf.field.id);

          const { data: allRelations, error: relationsError } =
            (await this.supabase
              .from("entity_relation")
              .select(
                "source_instance_id, target_instance_id, relation_field_id"
              )
              .in("source_instance_id", instanceIds)
              .in("relation_field_id", relationFieldIds)) as {
              data: Array<{
                source_instance_id: string;
                target_instance_id: string;
                relation_field_id: string;
              }> | null;
              error: any;
            };

          if (relationsError) {
            throw new SDKError(
              "RELATIONS_LOAD_ERROR",
              `Failed to load relations: ${relationsError.message}`,
              500,
              relationsError
            );
          }

          if (allRelations && allRelations.length > 0) {
            const targetInstanceIds = [
              ...new Set(allRelations.map((r) => r.target_instance_id)),
            ];

            const { data: relatedInstances, error: relatedInstancesError } =
              (await this.supabase
                .from("entity_instance")
                .select("*")
                .in("id", targetInstanceIds)) as {
                data: Array<{
                  id: string;
                  entity_definition_id: string;
                  project_id: string;
                  data: Record<string, unknown>;
                  created_at: string;
                  updated_at: string;
                }> | null;
                error: any;
              };

            if (relatedInstancesError) {
              throw new SDKError(
                "RELATED_INSTANCES_LOAD_ERROR",
                `Failed to load related instances: ${relatedInstancesError.message}`,
                500,
                relatedInstancesError
              );
            }

            if (relatedInstances) {
              const relatedInstancesMap = new Map(
                relatedInstances.map((inst) => [
                  inst.id,
                  transformEntityInstance(inst),
                ])
              );

              const targetEntityDefinitionIds = [
                ...new Set(
                  Array.from(relatedInstancesMap.values()).map(
                    (inst) => inst.entityDefinitionId
                  )
                ),
              ];
              const fieldsMap = new Map<
                string,
                Array<{ name: string; dbType: string }>
              >();
              await Promise.all(
                targetEntityDefinitionIds.map(async (entityDefId) => {
                  const targetFields = await this.getFields(entityDefId);
                  fieldsMap.set(
                    entityDefId,
                    targetFields.map((f) => ({
                      name: f.name,
                      dbType: f.dbType,
                    }))
                  );
                })
              );

              for (const relation of allRelations) {
                const instanceId = relation.source_instance_id;
                const relationField = relationFields.find(
                  (rf) => rf.field.id === relation.relation_field_id
                );

                if (relationField) {
                  const relatedInstance = relatedInstancesMap.get(
                    relation.target_instance_id
                  );

                  if (relatedInstance) {
                    if (!relationsMap.has(instanceId)) {
                      relationsMap.set(instanceId, {});
                    }
                    const instanceRelations = relationsMap.get(instanceId)!;
                    if (!instanceRelations[relationField.name]) {
                      instanceRelations[relationField.name] = [];
                    }
                    const targetFields =
                      fieldsMap.get(relatedInstance.entityDefinitionId) || [];
                    const flattenedRelated = flattenInstance(
                      relatedInstance,
                      targetFields,
                      params?.relationsAsIds ?? false
                    );
                    instanceRelations[relationField.name].push(
                      flattenedRelated
                    );
                  }
                }
              }
            }
          }
        }
      }

      // 10. Загружаем файлы batch-запросом (если нужно)
      const fileFields = fields.filter(
        (f) => f.type === "files" || f.type === "images"
      );

      if (fileFields.length > 0 && transformedInstances.length > 0) {
        const instanceIds = transformedInstances.map((inst) => inst.id);
        const fieldIds = fileFields.map((f) => f.id);

        const { data: allFiles, error: filesError } = (await this.supabase
          .from("entity_file")
          .select("id, entity_instance_id, field_id")
          .in("entity_instance_id", instanceIds)
          .in("field_id", fieldIds)) as {
          data: Array<{
            id: string;
            entity_instance_id: string;
            field_id: string | null;
          }> | null;
          error: any;
        };

        if (filesError) {
          throw new SDKError(
            "FILES_LOAD_ERROR",
            `Failed to load files: ${filesError.message}`,
            500,
            filesError
          );
        }

        if (allFiles) {
          const filesMap = new Map<string, Map<string, string[]>>();
          allFiles.forEach((file) => {
            if (file.field_id) {
              if (!filesMap.has(file.entity_instance_id)) {
                filesMap.set(file.entity_instance_id, new Map());
              }
              const instanceFiles = filesMap.get(file.entity_instance_id)!;
              if (!instanceFiles.has(file.field_id)) {
                instanceFiles.set(file.field_id, []);
              }
              instanceFiles.get(file.field_id)!.push(file.id);
            }
          });

          transformedInstances.forEach((instance) => {
            const instanceFiles = filesMap.get(instance.id);
            if (instanceFiles) {
              fileFields.forEach((field) => {
                const fileIds = instanceFiles.get(field.id) || [];
                if (fileIds.length > 0 || !instance.data[field.name]) {
                  instance.data[field.name] = fileIds;
                }
              });
            }
          });
        }
      }

      // 11. Добавляем relations к экземплярам и уплощаем
      const instancesWithRelations = transformedInstances.map((instance) => {
        const instanceRelations = relationsMap.get(instance.id) || {};
        return {
          ...instance,
          relations:
            Object.keys(instanceRelations).length > 0
              ? instanceRelations
              : undefined,
        };
      });

      // 12. Уплощаем экземпляры
      const flattenedInstances = instancesWithRelations.map((inst) =>
        flattenInstance(
          inst,
          fields.map((f) => ({ name: f.name, dbType: f.dbType })),
          params?.relationsAsIds ?? false
        )
      );

      // 13. Вычисляем пагинацию
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: flattenedInstances,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
      };
    } catch (error: any) {
      if (
        error instanceof NotFoundError ||
        error instanceof PermissionDeniedError ||
        error instanceof SDKError
      ) {
        throw error;
      }
      handleSupabaseError(error);
    }
  }

  /**
   * Создать экземпляр сущности
   * Поддерживает создание с relations и автоматически устанавливает created_by
   */
  async createInstance(
    entityDefinitionId: string,
    data: CreateInstanceData
  ): Promise<EntityInstanceWithFields> {
    try {
      // 1. Получаем fields из кэша SDK
      const fields = await this.getFields(entityDefinitionId);

      // 2. Получаем текущего пользователя для установки created_by
      const {
        data: { user },
        error: userError,
      } = await this.supabase.auth.getUser();

      if (userError) {
        // Не критично, если пользователь не авторизован - created_by будет null
        // Но логируем для отладки
        console.warn(
          "[SDK] Could not get user for created_by:",
          userError.message
        );
      }

      // 3. Разделяем data и relations из CreateInstanceData
      const { data: instanceData, relations } = data;

      // 4. Создаем экземпляр
      const { data: instance, error: instanceError } = (await this.supabase
        .from("entity_instance")
        .insert({
          entity_definition_id: entityDefinitionId,
          project_id: this.projectId,
          data: instanceData,
          created_by: user?.id || null,
        } as never)
        .select()
        .single()) as {
        data: {
          id: string;
          entity_definition_id: string;
          project_id: string;
          data: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        } | null;
        error: any;
      };

      if (instanceError || !instance) {
        handleInstanceError(
          instanceError || new Error("Failed to create instance"),
          "new"
        );
      }

      const transformedInstance = transformEntityInstance(instance);

      // 5. Создаем связи если есть
      if (relations && Object.keys(relations).length > 0) {
        // Определяем relation поля
        const relationFields = fields.filter(
          (f) =>
            f.dbType === "manyToMany" ||
            f.dbType === "manyToOne" ||
            f.dbType === "oneToMany" ||
            f.dbType === "oneToOne"
        );

        const relationInserts: Array<{
          source_instance_id: string;
          target_instance_id: string;
          relation_field_id: string;
          relation_type: string;
        }> = [];

        for (const [fieldName, targetInstanceIds] of Object.entries(
          relations
        )) {
          const field = relationFields.find((f) => f.name === fieldName);

          if (!field) {
            console.warn(
              `[SDK] Field ${fieldName} not found or not a relation field`
            );
            continue;
          }

          // Преобразуем в массив если нужно
          const ids = Array.isArray(targetInstanceIds)
            ? targetInstanceIds
            : targetInstanceIds
            ? [targetInstanceIds]
            : [];

          for (const targetInstanceId of ids) {
            if (targetInstanceId) {
              relationInserts.push({
                source_instance_id: transformedInstance.id,
                target_instance_id: targetInstanceId,
                relation_field_id: field.id,
                relation_type: field.dbType,
              });
            }
          }
        }

        if (relationInserts.length > 0) {
          const { error: relationsError } = (await this.supabase
            .from("entity_relation")
            .insert(relationInserts as never)) as {
            error: any;
          };

          if (relationsError) {
            throw new SDKError(
              "RELATIONS_CREATE_ERROR",
              `Failed to create relations: ${relationsError.message}`,
              500,
              relationsError
            );
          }
        }
      }

      // 6. Возвращаем полный экземпляр через getInstance
      return await this.getInstance(entityDefinitionId, transformedInstance.id);
    } catch (error: any) {
      // Если ошибка уже является SDKError (NotFoundError, PermissionDeniedError и т.д.)
      // просто пробрасываем её дальше
      if (
        error instanceof NotFoundError ||
        error instanceof PermissionDeniedError ||
        error instanceof SDKError
      ) {
        throw error;
      }

      // Для остальных ошибок используем общую обработку
      handleSupabaseError(error);
    }
  }

  async updateInstance(
    entityDefinitionId: string,
    id: string,
    data: UpdateInstanceData
  ): Promise<EntityInstanceWithFields> {
    try {
      // 1. Проверяем, что экземпляр существует и принадлежит правильному entityDefinitionId и projectId
      const { data: currentInstance, error: checkError } = (await this.supabase
        .from("entity_instance")
        .select("id, data, entity_definition_id, project_id")
        .eq("id", id)
        .eq("entity_definition_id", entityDefinitionId)
        .eq("project_id", this.projectId)
        .single()) as {
        data: {
          id: string;
          data: Record<string, unknown>;
          entity_definition_id: string;
          project_id: string;
        } | null;
        error: any;
      };

      if (checkError || !currentInstance) {
        handleInstanceError(checkError || new Error("Instance not found"), id);
      }

      // 2. Получаем fields из кэша SDK
      const fields = await this.getFields(entityDefinitionId);

      // 3. Разделяем data и relations из UpdateInstanceData
      const { data: instanceData, relations } = data;

      // 4. Объединяем данные (новые перезаписывают старые)
      const updatedData = {
        ...(currentInstance.data || {}),
        ...instanceData,
      };

      // 5. Обновляем экземпляр
      const { data: updated, error: updateError } = (await this.supabase
        .from("entity_instance")
        .update({
          data: updatedData,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", id)
        .eq("entity_definition_id", entityDefinitionId)
        .eq("project_id", this.projectId)
        .select()
        .single()) as {
        data: {
          id: string;
          entity_definition_id: string;
          project_id: string;
          data: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        } | null;
        error: any;
      };

      if (updateError || !updated) {
        throw new SDKError(
          "UPDATE_ERROR",
          `Failed to update entity instance: ${
            updateError?.message || "Update failed"
          }`,
          500,
          updateError
        );
      }

      // 6. Обновляем связи если есть
      if (relations && Object.keys(relations).length > 0) {
        // Определяем relation поля
        const relationFields = fields.filter(
          (f) =>
            f.dbType === "manyToMany" ||
            f.dbType === "manyToOne" ||
            f.dbType === "oneToMany" ||
            f.dbType === "oneToOne"
        );

        // Получаем fieldIds для полей, которые нужно обновить
        const fieldIds = Object.keys(relations)
          .map((fieldName) => {
            const field = relationFields.find((f) => f.name === fieldName);
            return field?.id;
          })
          .filter(Boolean) as string[];

        // Удаляем старые связи для указанных полей
        if (fieldIds.length > 0) {
          const { error: deleteError } = (await this.supabase
            .from("entity_relation")
            .delete()
            .eq("source_instance_id", id)
            .in("relation_field_id", fieldIds)) as {
            error: any;
          };

          if (deleteError) {
            throw new SDKError(
              "RELATIONS_DELETE_ERROR",
              `Failed to delete old relations: ${deleteError.message}`,
              500,
              deleteError
            );
          }
        }

        // Создаем новые связи
        const relationInserts: Array<{
          source_instance_id: string;
          target_instance_id: string;
          relation_field_id: string;
          relation_type: string;
        }> = [];

        for (const [fieldName, targetInstanceIds] of Object.entries(
          relations
        )) {
          const field = relationFields.find((f) => f.name === fieldName);

          if (!field) {
            console.warn(
              `[SDK] Field ${fieldName} not found or not a relation field`
            );
            continue;
          }

          // Преобразуем в массив если нужно
          const ids = Array.isArray(targetInstanceIds)
            ? targetInstanceIds
            : targetInstanceIds
            ? [targetInstanceIds]
            : [];

          for (const targetInstanceId of ids) {
            if (targetInstanceId) {
              relationInserts.push({
                source_instance_id: id,
                target_instance_id: targetInstanceId,
                relation_field_id: field.id,
                relation_type: field.dbType,
              });
            }
          }
        }

        if (relationInserts.length > 0) {
          const { error: relationsError } = (await this.supabase
            .from("entity_relation")
            .insert(relationInserts as never)) as {
            error: any;
          };

          if (relationsError) {
            throw new SDKError(
              "RELATIONS_CREATE_ERROR",
              `Failed to create relations: ${relationsError.message}`,
              500,
              relationsError
            );
          }
        }
      }

      // 7. Возвращаем полный обновленный экземпляр через getInstance
      return await this.getInstance(entityDefinitionId, id);
    } catch (error: any) {
      // Если ошибка уже является SDKError (NotFoundError, PermissionDeniedError и т.д.)
      // просто пробрасываем её дальше
      if (
        error instanceof NotFoundError ||
        error instanceof PermissionDeniedError ||
        error instanceof SDKError
      ) {
        throw error;
      }

      // Для остальных ошибок используем общую обработку
      handleSupabaseError(error);
    }
  }

  /**
   * Удалить экземпляр сущности
   * Связи удалятся автоматически через ON DELETE CASCADE
   */
  async deleteInstance(entityDefinitionId: string, id: string): Promise<void> {
    try {
      // 1. Проверяем, что экземпляр существует и принадлежит правильному entityDefinitionId и projectId
      // Это дополнительная проверка безопасности
      const { data: instance, error: checkError } = (await this.supabase
        .from("entity_instance")
        .select("id, entity_definition_id, project_id")
        .eq("id", id)
        .eq("entity_definition_id", entityDefinitionId)
        .eq("project_id", this.projectId)
        .single()) as {
        data: {
          id: string;
          entity_definition_id: string;
          project_id: string;
        } | null;
        error: any;
      };

      if (checkError || !instance) {
        handleInstanceError(checkError || new Error("Instance not found"), id);
      }

      // 2. Удаляем экземпляр
      // Связи удалятся автоматически через ON DELETE CASCADE в БД
      const { error: deleteError } = await this.supabase
        .from("entity_instance")
        .delete()
        .eq("id", id)
        .eq("entity_definition_id", entityDefinitionId)
        .eq("project_id", this.projectId);

      if (deleteError) {
        throw new SDKError(
          "DELETE_ERROR",
          `Failed to delete entity instance: ${deleteError.message}`,
          500,
          deleteError
        );
      }
    } catch (error: any) {
      // Если ошибка уже является SDKError (NotFoundError, PermissionDeniedError и т.д.)
      // просто пробрасываем её дальше
      if (
        error instanceof NotFoundError ||
        error instanceof PermissionDeniedError ||
        error instanceof SDKError
      ) {
        throw error;
      }

      // Для остальных ошибок используем общую обработку
      handleSupabaseError(error);
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    throw new Error("signIn: Not implemented yet");
  }

  async signUp(data: SignUpData): Promise<AuthResult> {
    throw new Error("signUp: Not implemented yet");
  }

  async signOut(): Promise<void> {
    throw new Error("signOut: Not implemented yet");
  }

  async getCurrentUser(): Promise<AuthResult["user"] | null> {
    throw new Error("getCurrentUser: Not implemented yet");
  }
}
