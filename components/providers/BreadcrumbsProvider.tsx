"use client";

import React, { createContext, useContext, useCallback, useMemo, useSyncExternalStore } from "react";

export interface BreadcrumbsContextData {
  // Project context
  projectId?: string;
  projectName?: string;
  // Entity Definition context
  entityDefinitionId?: string;
  entityDefinitionName?: string;
  // Instance context (only ID needed, name not shown in breadcrumbs)
  instanceId?: string;
  // Field context
  fieldId?: string;
  fieldName?: string;
  // Environment context
  environmentId?: string;
  environmentName?: string;
}

interface BreadcrumbsContextValue {
  data: BreadcrumbsContextData;
  setBreadcrumbsContext: (context: Partial<BreadcrumbsContextData>) => void;
  clearBreadcrumbsContext: () => void;
}

const BreadcrumbsContext = createContext<BreadcrumbsContextValue | undefined>(
  undefined
);

// Global store that persists across navigations and hydration
// This prevents data loss during SSR -> client hydration
let globalBreadcrumbsData: BreadcrumbsContextData = {};
const listeners: Set<() => void> = new Set();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): BreadcrumbsContextData {
  return globalBreadcrumbsData;
}

function getServerSnapshot(): BreadcrumbsContextData {
  return {};
}

function setGlobalData(newData: Partial<BreadcrumbsContextData>) {
  // Only update if values actually changed
  const hasChanges = Object.keys(newData).some(
    (key) => globalBreadcrumbsData[key as keyof BreadcrumbsContextData] !== newData[key as keyof BreadcrumbsContextData]
  );
  
  if (!hasChanges) return;
  
  globalBreadcrumbsData = { ...globalBreadcrumbsData, ...newData };
  // Notify all subscribers
  listeners.forEach((listener) => listener());
}

function clearGlobalData() {
  globalBreadcrumbsData = {};
  listeners.forEach((listener) => listener());
}

interface BreadcrumbsProviderProps {
  children: React.ReactNode;
}

export function BreadcrumbsProvider({ children }: BreadcrumbsProviderProps) {
  // Use useSyncExternalStore for synchronous access to global data
  // This ensures data persists across navigations and hydration
  const contextData = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setBreadcrumbsContext = useCallback(
    (context: Partial<BreadcrumbsContextData>) => {
      setGlobalData(context);
    },
    []
  );

  const clearBreadcrumbsContext = useCallback(() => {
    clearGlobalData();
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      data: contextData,
      setBreadcrumbsContext,
      clearBreadcrumbsContext,
    }),
    [contextData, setBreadcrumbsContext, clearBreadcrumbsContext]
  );

  return (
    <BreadcrumbsContext.Provider value={value}>
      {children}
    </BreadcrumbsContext.Provider>
  );
}

export function useBreadcrumbsContext() {
  const context = useContext(BreadcrumbsContext);
  if (context === undefined) {
    throw new Error(
      "useBreadcrumbsContext must be used within BreadcrumbsProvider"
    );
  }
  return context;
}

/**
 * Safe hook that returns undefined if used outside provider
 * Useful for components that might render outside the provider
 */
export function useBreadcrumbsContextSafe() {
  return useContext(BreadcrumbsContext);
}
