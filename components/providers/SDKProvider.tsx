"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createClientSDK, type PublicAPIClient } from "@/lib/sdk/public-api";
import type { SDKOptions } from "@/lib/sdk/public-api/types";

interface SDKContextType {
  sdk: PublicAPIClient;
  projectId: string;
}

const SDKContext = createContext<SDKContextType | undefined>(undefined);

interface SDKProviderProps {
  children: ReactNode;
  projectId: string;
  enableCache?: boolean;
  cacheTTL?: number;
}

/**
 * SDK Provider для Client Components
 * Создает SDK клиент один раз и предоставляет его через контекст
 *
 * @param projectId - ID проекта
 * @param enableCache - Включить кеширование entityDefinition и полей (по умолчанию: true)
 * @param cacheTTL - Время жизни кеша в миллисекундах (по умолчанию: 5 минут)
 */
export function SDKProvider({
  children,
  projectId,
  enableCache = true,
  cacheTTL,
}: SDKProviderProps) {
  // Создаем SDK клиент один раз при монтировании или изменении projectId/enableCache
  const sdk = useMemo(() => {
    const options: SDKOptions = {
      enableCache,
      ...(cacheTTL !== undefined && { cacheTTL }),
    };

    return createClientSDK(
      projectId,
      {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      options
    );
  }, [projectId, enableCache, cacheTTL]);

  const value = useMemo(
    () => ({
      sdk,
      projectId,
    }),
    [sdk, projectId]
  );

  return <SDKContext.Provider value={value}>{children}</SDKContext.Provider>;
}

/**
 * Хук для получения SDK клиента из контекста
 *
 * @throws {Error} Если используется вне SDKProvider
 * @returns SDK клиент и projectId
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { sdk, projectId } = useSDK();
 *
 *   const loadData = async () => {
 *     const { data } = await sdk.getInstances(entityDefinitionId, {
 *       page: 1,
 *       limit: 20,
 *     });
 *     return data;
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useSDK(): SDKContextType {
  const context = useContext(SDKContext);
  if (context === undefined) {
    throw new Error("useSDK must be used within a SDKProvider");
  }
  return context;
}
