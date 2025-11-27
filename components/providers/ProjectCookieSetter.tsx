/**
 * Клиентский компонент для установки куки текущего проекта
 * Используется в ProjectLayout для запоминания последнего посещённого проекта
 */

"use client";

import { useEffect } from "react";
import { setCurrentProjectCookie } from "@/lib/projects/cookies";

interface ProjectCookieSetterProps {
  projectId: string;
}

export function ProjectCookieSetter({ projectId }: ProjectCookieSetterProps) {
  useEffect(() => {
    // Устанавливаем куку при монтировании (заходе на страницу проекта)
    setCurrentProjectCookie(projectId);
  }, [projectId]);

  // Не рендерит ничего в DOM
  return null;
}

