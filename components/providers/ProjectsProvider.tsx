"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { Project } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/client";

interface ProjectsContextType {
  projects: Project[];
  getProjectById: (id: string) => Project | undefined;
  getProjectName: (id: string) => string | undefined;
  updateProjects: () => Promise<void>;
  isLoading: boolean;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(
  undefined
);

interface ProjectsProviderProps {
  children: ReactNode;
  initialProjects: Project[];
}

export function ProjectsProvider({
  children,
  initialProjects,
}: ProjectsProviderProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [isLoading, setIsLoading] = useState(false);

  // Получить проект по ID
  const getProjectById = useCallback(
    (id: string): Project | undefined => {
      return projects.find((p) => p.id === id);
    },
    [projects]
  );

  // Получить имя проекта по ID
  const getProjectName = useCallback(
    (id: string): string | undefined => {
      const project = getProjectById(id);
      return project?.name;
    },
    [getProjectById]
  );

  // Обновить список проектов из БД
  const updateProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        throw error;
      }

      setProjects((data as Project[]) || []);
    } catch (error) {
      console.error("[ProjectsProvider] Error updating projects:", error);
      // Не выбрасываем ошибку, чтобы не сломать UI
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        getProjectById,
        getProjectName,
        updateProjects,
        isLoading,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
}

