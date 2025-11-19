import React from "react";
import { notFound } from "next/navigation";
import {
  getEntityDefinitionById,
  getFields,
} from "@/lib/universal-entity/config-service";
import type { EntityDefinition, Field } from "@/lib/universal-entity/types";

interface EntityDefinitionServerWrapperProps {
  projectId: string;
  entityDefinitionId: string;
  children: (data: {
    entityDefinition: EntityDefinition;
    fields: Field[];
  }) => Promise<React.ReactNode> | React.ReactNode;
}

/**
 * Server component wrapper для получения entityDefinition и fields
 * Использует кеш, который был заполнен в layout
 */
export async function EntityDefinitionServerWrapper({
  projectId,
  entityDefinitionId,
  children,
}: EntityDefinitionServerWrapperProps) {
  // Загружаем данные (используют кеш из layout)
  const entityDefinition = await getEntityDefinitionById(entityDefinitionId);
  if (!entityDefinition) {
    notFound();
  }

  // Проверяем, что entityDefinition принадлежит проекту
  if (entityDefinition.projectId !== projectId) {
    notFound();
  }

  // Загружаем поля (используют кеш из layout)
  const fields = await getFields(entityDefinitionId);

  // Вызываем children с данными
  const content = await children({ entityDefinition, fields });
  return <>{content}</>;
}

