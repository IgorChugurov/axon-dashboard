"use client";

import { useEffect } from "react";
import { useProjects } from "./ProjectsProvider";

/**
 * Компонент-слушатель событий для обновления проектов
 * Слушает событие "reloadProjects" и обновляет контекст
 */
export function ProjectsEventListener() {
  const { updateProjects } = useProjects();

  useEffect(() => {
    const handleReloadProjects = () => {
      console.log("[ProjectsEventListener] Received reloadProjects event");
      updateProjects();
    };

    // Слушаем событие reloadProjects
    window.addEventListener("reloadProjects", handleReloadProjects);

    return () => {
      window.removeEventListener("reloadProjects", handleReloadProjects);
    };
  }, [updateProjects]);

  // Этот компонент не рендерит ничего
  return null;
}

