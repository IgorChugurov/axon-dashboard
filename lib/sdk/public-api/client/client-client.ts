/**
 * Client SDK для публичного API
 * Используется в Client Components
 */

import { createClient } from "@/lib/supabase/client";
import { BasePublicAPIClient } from "../base/base-client";
import type { Database } from "@/lib/supabase/types";
import type {
  QueryParams,
  CreateInstanceData,
  UpdateInstanceData,
  PaginationResult,
  AuthResult,
  SignUpData,
  SDKOptions,
} from "../types";
import type { EntityInstanceWithFields } from "@/lib/universal-entity/types";
import {
  getEntityInstancesFromClient,
  createEntityInstanceFromClient,
  updateEntityInstanceFromClient,
  deleteEntityInstanceFromClient,
} from "@/lib/universal-entity/instance-client-service";
import { handleSupabaseError, AuthenticationError } from "../errors";

export class ClientPublicAPIClient extends BasePublicAPIClient {
  private static instances: Map<string, ClientPublicAPIClient> = new Map();

  private constructor(projectId: string, options: SDKOptions = {}) {
    // Создаем client client (синхронный)
    super(null as any, projectId, options);
  }

  /**
   * Создать Client SDK клиент
   */
  static create(
    projectId: string,
    options: SDKOptions = {}
  ): ClientPublicAPIClient {
    const cacheKey = `client-${projectId}-${JSON.stringify(options)}`;

    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    const supabase = createClient(); // Client client (синхронный)
    const client = new ClientPublicAPIClient(projectId, options);
    client.supabase = supabase;

    this.instances.set(cacheKey, client);
    return client;
  }

  /**
   * Получить список экземпляров
   */
  async getInstances(
    entityDefinitionId: string,
    params?: QueryParams
  ): Promise<{
    data: EntityInstanceWithFields[];
    pagination: PaginationResult;
  }> {
    try {
      // Используем существующий клиентский сервис
      const response = await getEntityInstancesFromClient(
        entityDefinitionId,
        this.projectId,
        {
          page: params?.page,
          limit: params?.limit,
          search: params?.search,
          filters: params?.filters,
          includeRelations: params?.includeRelations,
          relationsAsIds: params?.relationsAsIds,
        }
      );

      return {
        data: response.data,
        pagination: {
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
          hasPreviousPage: response.pagination.hasPreviousPage,
          hasNextPage: response.pagination.hasNextPage,
        },
      };
    } catch (error: any) {
      handleSupabaseError(error);
      throw error;
    }
  }

  /**
   * Получить один экземпляр
   */
  async getInstance(
    entityDefinitionId: string,
    id: string,
    params?: { includeRelations?: string[]; relationsAsIds?: boolean }
  ): Promise<EntityInstanceWithFields> {
    try {
      // Загружаем экземпляр напрямую из Supabase
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
        if (instanceError?.code === "PGRST116") {
          throw new Error(`Entity instance not found: ${id}`);
        }
        throw new Error(
          `Failed to get entity instance: ${
            instanceError?.message || "Instance not found"
          }`
        );
      }

      // Трансформируем экземпляр
      const transformedInstance = {
        id: instance.id,
        entityDefinitionId: instance.entity_definition_id,
        projectId: instance.project_id,
        data: instance.data || {},
        createdAt: instance.created_at,
        updatedAt: instance.updated_at,
      };

      // Загружаем fields для уплощения (один раз, с кэшем)
      const fields = await this.getFields(entityDefinitionId);

      // Загружаем relations если нужно
      const relations: Record<string, EntityInstanceWithFields[]> = {};
      if (params?.includeRelations && params.includeRelations.length > 0) {
        for (const relationFieldName of params.includeRelations) {
          const relationField = fields.find(
            (f) =>
              f.name === relationFieldName &&
              (f.dbType === "manyToMany" ||
                f.dbType === "manyToOne" ||
                f.dbType === "oneToMany" ||
                f.dbType === "oneToOne")
          );

          if (relationField && relationField.relationFieldId) {
            // Загружаем связанные экземпляры
            const { data: relationData } = (await this.supabase
              .from("entity_relation")
              .select("target_instance_id")
              .eq("source_instance_id", id)
              .eq("relation_field_id", relationField.relationFieldId)) as {
              data: Array<{ target_instance_id: string }> | null;
              error: any;
            };

            if (relationData && relationData.length > 0) {
              const targetIds = relationData.map((r) => r.target_instance_id);

              // Загружаем связанные экземпляры
              const { data: relatedInstances } = (await this.supabase
                .from("entity_instance")
                .select("*")
                .in("id", targetIds)) as {
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

              if (relatedInstances) {
                const relatedFields = await this.getFields(
                  relationField.relatedEntityDefinitionId || ""
                );

                relations[relationFieldName] = relatedInstances.map((inst) => {
                  const flat: EntityInstanceWithFields = {
                    id: inst.id,
                    entityDefinitionId: inst.entity_definition_id,
                    projectId: inst.project_id,
                    createdAt: inst.created_at,
                    updatedAt: inst.updated_at,
                    ...(inst.data || {}),
                  };
                  return flat;
                });
              }
            }
          }
        }
      }

      // Уплощаем экземпляр
      const flattened: EntityInstanceWithFields = {
        id: transformedInstance.id,
        entityDefinitionId: transformedInstance.entityDefinitionId,
        projectId: transformedInstance.projectId,
        createdAt: transformedInstance.createdAt,
        updatedAt: transformedInstance.updatedAt,
        ...transformedInstance.data,
      };

      // Добавляем relations
      if (params?.relationsAsIds) {
        // Если relationsAsIds = true, сохраняем только ID
        Object.entries(relations).forEach(([fieldName, relatedInstances]) => {
          (flattened as any)[fieldName] = relatedInstances.map(
            (inst) => inst.id
          );
        });
      } else {
        // Иначе сохраняем полные объекты
        Object.entries(relations).forEach(([fieldName, relatedInstances]) => {
          const field = fields.find((f) => f.name === fieldName);
          if (field?.dbType === "manyToOne" || field?.dbType === "oneToOne") {
            (flattened as any)[fieldName] = relatedInstances[0] || null;
          } else {
            (flattened as any)[fieldName] = relatedInstances;
          }
        });
      }

      return flattened;
    } catch (error: any) {
      handleSupabaseError(error);
      throw error;
    }
  }

  /**
   * Создать экземпляр
   */
  async createInstance(
    entityDefinitionId: string,
    data: CreateInstanceData
  ): Promise<EntityInstanceWithFields> {
    try {
      // Используем существующий клиентский сервис
      const instance = await createEntityInstanceFromClient(
        entityDefinitionId,
        this.projectId,
        data.data as any,
        data.relations
      );

      return instance;
    } catch (error: any) {
      handleSupabaseError(error);
      throw error;
    }
  }

  /**
   * Обновить экземпляр
   */
  async updateInstance(
    entityDefinitionId: string,
    id: string,
    data: UpdateInstanceData
  ): Promise<EntityInstanceWithFields> {
    try {
      // Проверяем, что экземпляр существует и принадлежит правильной entityDefinition
      const { data: currentInstance } = (await this.supabase
        .from("entity_instance")
        .select("entity_definition_id")
        .eq("id", id)
        .eq("project_id", this.projectId)
        .single()) as {
        data: { entity_definition_id: string } | null;
        error: any;
      };

      if (!currentInstance) {
        throw new Error(`Entity instance not found: ${id}`);
      }

      if (currentInstance.entity_definition_id !== entityDefinitionId) {
        throw new Error(
          `Instance ${id} does not belong to entityDefinition ${entityDefinitionId}`
        );
      }

      // Используем существующий клиентский сервис
      const instance = await updateEntityInstanceFromClient(
        id,
        data.data as any,
        data.relations
      );

      return instance;
    } catch (error: any) {
      handleSupabaseError(error);
      throw error;
    }
  }

  /**
   * Удалить экземпляр
   */
  async deleteInstance(entityDefinitionId: string, id: string): Promise<void> {
    try {
      // Проверяем, что экземпляр существует и принадлежит правильной entityDefinition
      const { data: currentInstance } = (await this.supabase
        .from("entity_instance")
        .select("entity_definition_id")
        .eq("id", id)
        .eq("project_id", this.projectId)
        .single()) as {
        data: { entity_definition_id: string } | null;
        error: any;
      };

      if (!currentInstance) {
        throw new Error(`Entity instance not found: ${id}`);
      }

      if (currentInstance.entity_definition_id !== entityDefinitionId) {
        throw new Error(
          `Instance ${id} does not belong to entityDefinition ${entityDefinitionId}`
        );
      }

      // Используем существующий клиентский сервис
      await deleteEntityInstanceFromClient(this.projectId, id);
    } catch (error: any) {
      handleSupabaseError(error);
      throw error;
    }
  }

  /**
   * Вход в систему
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new AuthenticationError(error.message);
      }

      if (!data.session || !data.user) {
        throw new AuthenticationError("Failed to sign in");
      }

      // Получаем профиль пользователя
      const { data: profile } = (await this.supabase
        .from("profiles")
        .select("first_name, last_name, role")
        .eq("id", data.user.id)
        .single()) as {
        data: {
          first_name: string | null;
          last_name: string | null;
          role: string | null;
        } | null;
        error: any;
      };

      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token || "",
        expiresAt: data.session.expires_at || 0,
        expiresIn: data.session.expires_in || 3600,
        user: {
          id: data.user.id,
          email: data.user.email || "",
          firstName: (profile?.first_name ?? undefined) || undefined,
          lastName: (profile?.last_name ?? undefined) || undefined,
          role: profile?.role || "user",
        },
      };
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(error.message || "Failed to sign in");
    }
  }

  /**
   * Регистрация
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      const { data: authData, error } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
          },
        },
      });

      if (error) {
        throw new AuthenticationError(error.message);
      }

      if (!authData.session || !authData.user) {
        throw new AuthenticationError("Failed to sign up");
      }

      // Получаем профиль пользователя
      const { data: profile } = (await this.supabase
        .from("profiles")
        .select("first_name, last_name, role")
        .eq("id", authData.user.id)
        .single()) as {
        data: {
          first_name: string | null;
          last_name: string | null;
          role: string | null;
        } | null;
        error: any;
      };

      return {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token || "",
        expiresAt: authData.session.expires_at || 0,
        expiresIn: authData.session.expires_in || 3600,
        user: {
          id: authData.user.id,
          email: authData.user.email || "",
          firstName: (profile?.first_name ?? undefined) || data.firstName,
          lastName: (profile?.last_name ?? undefined) || data.lastName,
          role: profile?.role || "user",
        },
      };
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(error.message || "Failed to sign up");
    }
  }

  /**
   * Выход из системы
   */
  async signOut(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        throw new AuthenticationError(error.message);
      }
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(error.message || "Failed to sign out");
    }
  }

  /**
   * Получить текущего пользователя
   */
  async getCurrentUser(): Promise<AuthResult["user"] | null> {
    try {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      // Получаем профиль пользователя
      const { data: profile } = (await this.supabase
        .from("profiles")
        .select("first_name, last_name, role")
        .eq("id", user.id)
        .single()) as {
        data: {
          first_name: string | null;
          last_name: string | null;
          role: string | null;
        } | null;
        error: any;
      };

      return {
        id: user.id,
        email: user.email || "",
        firstName: (profile?.first_name ?? undefined) || undefined,
        lastName: (profile?.last_name ?? undefined) || undefined,
        role: profile?.role || "user",
      };
    } catch (error: any) {
      return null;
    }
  }
}
