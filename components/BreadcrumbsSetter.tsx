"use client";

import { useLayoutEffect } from "react";
import {
  useBreadcrumbsContextSafe,
  type BreadcrumbsContextData,
} from "@/components/providers/BreadcrumbsProvider";

type BreadcrumbsSetterProps = BreadcrumbsContextData;

/**
 * Component that sets breadcrumbs context on mount.
 * Use this in page components to provide context data for Breadcrumbs.
 *
 * Uses useLayoutEffect to set context synchronously before browser paint,
 * preventing flash of default values during navigation.
 *
 * Only defined values are passed to context - undefined values don't overwrite
 * existing context data. This preserves names during navigation.
 *
 * @example
 * // In a page component:
 * <BreadcrumbsSetter
 *   projectId={projectId}
 *   projectName={project.name}
 *   entityDefinitionId={entityDefinitionId}
 *   entityDefinitionName={entityDefinition.name}
 * />
 */
export function BreadcrumbsSetter({
  projectId,
  projectName,
  entityDefinitionId,
  entityDefinitionName,
  instanceId,
  fieldId,
  fieldName,
  environmentId,
  environmentName,
}: BreadcrumbsSetterProps) {
  const context = useBreadcrumbsContextSafe();

  // Create a stable string key to detect actual changes
  const dataKey = JSON.stringify({
    projectId,
    projectName,
    entityDefinitionId,
    entityDefinitionName,
    instanceId,
    fieldId,
    fieldName,
    environmentId,
    environmentName,
  });

  // useLayoutEffect runs synchronously before browser paint
  // This prevents flash of default values during navigation
  useLayoutEffect(() => {
    if (!context) return;

    // Build context object with only defined values
    // This prevents overwriting existing context data with undefined
    const newContext: Partial<BreadcrumbsContextData> = {};

    if (projectId !== undefined) newContext.projectId = projectId;
    if (projectName !== undefined) newContext.projectName = projectName;
    if (entityDefinitionId !== undefined)
      newContext.entityDefinitionId = entityDefinitionId;
    if (entityDefinitionName !== undefined)
      newContext.entityDefinitionName = entityDefinitionName;
    if (instanceId !== undefined) newContext.instanceId = instanceId;
    if (fieldId !== undefined) newContext.fieldId = fieldId;
    if (fieldName !== undefined) newContext.fieldName = fieldName;
    if (environmentId !== undefined) newContext.environmentId = environmentId;
    if (environmentName !== undefined)
      newContext.environmentName = environmentName;

    context.setBreadcrumbsContext(newContext);
  }, [dataKey, context?.setBreadcrumbsContext]); // eslint-disable-line react-hooks/exhaustive-deps

  // This component doesn't render anything
  return null;
}
