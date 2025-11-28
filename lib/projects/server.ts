// Серверный провайдер для проектов
// Работает напрямую с Supabase

import { ServerDataParams } from "@/lib/server-data/types";
import { Project, CreateProjectData } from "./types";
import {
  getProjectsFromSupabase,
  createProjectInSupabase,
  updateProjectInSupabase,
  deleteProjectFromSupabase,
} from "./supabase";

export class ProjectsServerProvider {
  /**
   * Получение проектов из Supabase с пагинацией и поиском
   */
  async getProjects(params: ServerDataParams = {}) {
    try {
      console.log(
        "[ProjectsServerProvider] Getting projects with params:",
        params
      );
      const result = await getProjectsFromSupabase(params);
      console.log("[ProjectsServerProvider] Successfully got projects");
      return {
        data: result.data,
        pagination: result.pagination,
        config: null, // Можно добавить конфиг позже если нужно
      };
    } catch (error) {
      console.error("[ProjectsServerProvider] Error:", error);
      throw error;
    }
  }

  /**
   * Создание нового проекта
   */
  async createProject(data: CreateProjectData): Promise<Project> {
    return createProjectInSupabase(data);
  }

  /**
   * Обновление проекта
   */
  async updateProject(
    id: string,
    data: Partial<
      Pick<
        Project,
        "name" | "description" | "status" | "enableSignIn" | "enableSignUp"
      >
    >
  ): Promise<Project> {
    return updateProjectInSupabase(id, data);
  }

  /**
   * Удаление проекта
   */
  async deleteProject(id: string): Promise<void> {
    return deleteProjectFromSupabase(id);
  }
}

// Экспортируем готовый экземпляр
export const projectsServerProvider = new ProjectsServerProvider();
