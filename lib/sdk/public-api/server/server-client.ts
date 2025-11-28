/**
 * Server SDK для публичного API
 * Используется в Server Components и Server Actions
 */

import { createClient } from "@/lib/supabase/server";
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
  getInstances,
  getInstanceById,
  createInstance,
  updateInstance,
  deleteInstance,
} from "@/lib/universal-entity/instance-service";
import { handleSupabaseError, AuthenticationError } from "../errors";

export class ServerPublicAPIClient extends BasePublicAPIClient {
  private static instances: Map<string, ServerPublicAPIClient> = new Map();

  private constructor(projectId: string, options: SDKOptions = {}) {
    // Создаем server client (async, но конструктор не может быть async)
    // Поэтому используем фабрику create()
    super(null as any, projectId, options);
  }

  /**
   * Создать Server SDK клиент
   */
  static async create(
    projectId: string,
    options: SDKOptions = {}
  ): Promise<ServerPublicAPIClient> {
    const cacheKey = `server-${projectId}-${JSON.stringify(options)}`;

    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    const supabase = await createClient(); // Server client
    const client = new ServerPublicAPIClient(projectId, options);
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
      const page = params?.page || 1;
      const limit = params?.limit || 20;
      const offset = (page - 1) * limit;

      // Получаем общее количество для пагинации
      const supabase = await createClient();
      const { count } = await supabase
        .from("entity_instance")
        .select("*", { count: "exact", head: true })
        .eq("entity_definition_id", entityDefinitionId)
        .eq("project_id", this.projectId);

      // Используем существующий сервис для получения данных
      const instances = await getInstances(entityDefinitionId, this.projectId, {
        includeRelations: params?.includeRelations,
        relationsAsIds: params?.relationsAsIds ?? false,
        filters: params?.filters,
        limit,
        offset,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
      });

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: instances,
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
    params?: { relationsAsIds?: boolean }
  ): Promise<EntityInstanceWithFields> {
    try {
      // Загружаем полные Field из config-service (они могут быть в кэше)
      const { getFields } = await import(
        "@/lib/universal-entity/config-service"
      );
      const fullFields = await getFields(entityDefinitionId);

      // Используем существующий сервис
      // getInstanceById автоматически определит все relations из fields
      const instance = await getInstanceById(id, {
        relationsAsIds: params?.relationsAsIds ?? false,
        fields: fullFields,
        entityDefinitionId, // для проверки принадлежности
      });

      return instance;
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
      // Используем существующий сервис
      const instance = await createInstance(
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
      const currentInstance = await getInstanceById(id);
      if (currentInstance.entityDefinitionId !== entityDefinitionId) {
        throw new Error(
          `Instance ${id} does not belong to entityDefinition ${entityDefinitionId}`
        );
      }

      // Используем существующий сервис
      const instance = await updateInstance(
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
      const currentInstance = await getInstanceById(id);
      if (currentInstance.entityDefinitionId !== entityDefinitionId) {
        throw new Error(
          `Instance ${id} does not belong to entityDefinition ${entityDefinitionId}`
        );
      }

      // Используем существующий сервис
      await deleteInstance(id);
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
          firstName: profile?.first_name || undefined,
          lastName: profile?.last_name || undefined,
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
          firstName: profile?.first_name || data.firstName,
          lastName: profile?.last_name || data.lastName,
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
        firstName: profile?.first_name || undefined,
        lastName: profile?.last_name || undefined,
        role: profile?.role || "user",
      };
    } catch (error: any) {
      return null;
    }
  }
}
