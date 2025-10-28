// Серверный провайдер для проектов

import { ServerDataProvider } from "@/lib/server-data/base";
import { ServerDataParams } from "@/lib/server-data/types";
import { Project, CreateProjectData } from "./types";

export class ProjectsServerProvider extends ServerDataProvider<Project> {
  constructor() {
    super("/api/projects", "@/config/projects.json");
  }

  /**
   * Получение проектов с сервера
   */
  async getProjects(params: ServerDataParams = {}) {
    return this.getData(params);
  }

  /**
   * Создание нового проекта
   */
  async createProject(data: CreateProjectData): Promise<Project> {
    return this.createData(data);
  }
}

// Экспортируем готовый экземпляр
export const projectsServerProvider = new ProjectsServerProvider();
