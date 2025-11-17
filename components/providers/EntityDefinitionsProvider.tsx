"use client";

import React, { createContext, useContext } from "react";
import type { EntityDefinition, Field } from "@/lib/universal-entity/types";

interface EntityDefinitionsContextValue {
  entityDefinitions: EntityDefinition[];
  fields: Field[];
  projectId: string;
}

export const EntityDefinitionsContext = createContext<
  EntityDefinitionsContextValue | undefined
>(undefined);

interface EntityDefinitionsProviderProps {
  children: React.ReactNode;
  entityDefinitions: EntityDefinition[];
  fields: Field[];
  projectId: string;
}

export function EntityDefinitionsProvider({
  children,
  entityDefinitions,
  fields,
  projectId,
}: EntityDefinitionsProviderProps) {
  return (
    <EntityDefinitionsContext.Provider
      value={{ entityDefinitions, fields, projectId }}
    >
      {children}
    </EntityDefinitionsContext.Provider>
  );
}

export function useEntityDefinitions() {
  const context = useContext(EntityDefinitionsContext);
  if (context === undefined) {
    throw new Error(
      "useEntityDefinitions must be used within EntityDefinitionsProvider"
    );
  }
  return context;
}

/**
 * Хелпер для получения entityDefinition по ID
 */
export function useEntityDefinition(entityDefinitionId: string) {
  const { entityDefinitions, fields } = useEntityDefinitions();
  const entityDefinition = entityDefinitions.find((e) => e.id === entityDefinitionId);
  const entityFields = fields.filter(
    (f) => f.entityDefinitionId === entityDefinitionId
  );

  return {
    entityDefinition: entityDefinition || null,
    fields: entityFields,
  };
}

