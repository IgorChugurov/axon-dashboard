/**
 * EntityFormWithSections - NEW Implementation
 * Uses the form-generation library with automatic sections support
 * This is a parallel implementation alongside EntityFormClient
 */

"use client";

import { useRouter } from "next/navigation";
import type { EntityDefinition, Field } from "@/lib/universal-entity/types";
import { FormWithSections } from "@/lib/form-generation";
import { useEntityDefinitions } from "@/components/providers/EntityDefinitionsProvider";
import { createEntityInstance, updateEntityInstance } from "./actions";
import { useState } from "react";

interface EntityFormWithSectionsProps {
  entityDefinition: EntityDefinition;
  fields: Field[];
  mode: "create" | "edit";
  initialData?: Record<string, any>;
  instanceId?: string;
}

export function EntityFormWithSections({
  entityDefinition,
  fields,
  mode,
  initialData = {},
  instanceId,
}: EntityFormWithSectionsProps) {
  const { projectId } = useEntityDefinitions();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: Record<string, any>) => {
    setError(null);

    try {
      // Separate data and relations
      const relations: Record<string, string[]> = {};
      const data: Record<string, any> = {};

      for (const [key, value] of Object.entries(formData)) {
        const field = fields.find((f) => f.name === key);
        if (
          field &&
          (field.dbType === "manyToMany" ||
            field.dbType === "manyToOne" ||
            field.dbType === "oneToMany" ||
            field.dbType === "oneToOne")
        ) {
          // Relation field
          relations[key] = Array.isArray(value) ? value : value ? [value] : [];
        } else {
          // Regular field
          data[key] = value;
        }
      }

      let result;
      if (mode === "create") {
        result = await createEntityInstance(
          projectId,
          entityDefinition.id,
          data,
          Object.keys(relations).length > 0 ? relations : undefined
        );
      } else if (instanceId) {
        result = await updateEntityInstance(
          projectId,
          entityDefinition.id,
          instanceId,
          data,
          Object.keys(relations).length > 0 ? relations : undefined
        );
      } else {
        throw new Error("Instance ID is required for update");
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to save");
      }

      // Success - navigate to list
      router.push(`/${projectId}/entities/${entityDefinition.id}`);
      router.refresh();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save. Please try again.";
      setError(errorMessage);
      throw err; // Re-throw so FormWithSections can handle it
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <FormWithSections
        entityDefinition={entityDefinition}
        fields={fields}
        mode={mode}
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}

