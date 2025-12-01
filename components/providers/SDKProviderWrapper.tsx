"use client";

import { type ReactNode } from "react";
import { SDKProvider } from "./SDKProvider";

interface SDKProviderWrapperProps {
  children: ReactNode;
  projectId: string;
  enableCache?: boolean;
  cacheTTL?: number;
}

/**
 * Client Component обертка для SDKProvider
 * Используется в Server Component layouts для передачи projectId
 *
 * @param projectId - ID проекта из URL params
 * @param enableCache - Включить кеширование (по умолчанию: true)
 * @param cacheTTL - Время жизни кеша в миллисекундах
 */
export function SDKProviderWrapper({
  children,
  projectId,
  enableCache = true,
  cacheTTL,
}: SDKProviderWrapperProps) {
  return (
    <SDKProvider
      projectId={projectId}
      enableCache={enableCache}
      cacheTTL={cacheTTL}
    >
      {children}
    </SDKProvider>
  );
}
