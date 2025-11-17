"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntityDefinitions } from "@/components/providers/EntityDefinitionsProvider";
import type { EntityDefinition, Field } from "@/lib/universal-entity/types";
import { createEntityInstance, updateEntityInstance } from "./actions";
import { RelationSelect } from "./RelationSelect";

interface EntityFormClientProps {
  entityDefinition: EntityDefinition;
  fields: Field[];
  mode: "create" | "edit";
  initialData?: Record<string, any>;
  instanceId?: string;
}

export function EntityFormClient({
  entityDefinition,
  fields,
  mode,
  initialData = {},
  instanceId,
}: EntityFormClientProps) {
  const { projectId } = useEntityDefinitions();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [error, setError] = useState<string | null>(null);

  // Фильтруем поля для формы
  const formFields = fields.filter(
    (f) =>
      (mode === "create" && f.forCreatePage) ||
      (mode === "edit" && f.forEditPage)
  );

  // Отладка: логируем поля
  console.log("[EntityFormClient] Mode:", mode);
  console.log("[EntityFormClient] All fields:", fields.length);
  console.log("[EntityFormClient] Filtered fields:", formFields.length);
  console.log(
    "[EntityFormClient] Fields:",
    fields.map((f) => ({
      name: f.name,
      forCreatePage: f.forCreatePage,
      forEditPage: f.forEditPage,
    }))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        console.log("[EntityFormClient] handleSubmit - START:");
        console.log("  - mode:", mode);
        console.log("  - formData:", formData);

        // Разделяем данные и связи
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
            // Это поле связи
            relations[key] = Array.isArray(value)
              ? value
              : value
              ? [value]
              : [];
            console.log(`  - relation field "${key}":`, relations[key]);
          } else {
            // Обычное поле
            data[key] = value;
          }
        }

        console.log("  - extracted data:", data);
        console.log("  - extracted relations:", relations);

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
          setError("Instance ID is required for update");
          return;
        }

        if (!result.success) {
          setError(
            result.error + (result.details ? `: ${result.details}` : "")
          );
          return;
        }

        // Успешно - перенаправляем на список
        router.push(`/${projectId}/entities/${entityDefinition.id}`);
        router.refresh();
      } catch (error) {
        console.error("Error saving:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to save. Please try again."
        );
      }
    });
  };

  const handleChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formFields.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>
            No fields available for {mode === "create" ? "creation" : "editing"}
            .
          </p>
          <p className="text-sm mt-2">
            Total fields: {fields.length} | Fields with forCreatePage:{" "}
            {fields.filter((f) => f.forCreatePage).length} | Fields with
            forEditPage: {fields.filter((f) => f.forEditPage).length}
          </p>
        </div>
      ) : (
        formFields.map((field) => {
          const value =
            formData[field.name] ??
            field.defaultStringValue ??
            field.defaultNumberValue ??
            field.defaultBooleanValue ??
            "";

          // Определяем, является ли поле связью
          const isRelationField =
            field.dbType === "manyToMany" ||
            field.dbType === "manyToOne" ||
            field.dbType === "oneToMany" ||
            field.dbType === "oneToOne";

          // Для полей связей используем массив ID
          const relationValue = isRelationField
            ? Array.isArray(value)
              ? value
              : value
              ? [value]
              : []
            : [];

          return (
            <div key={field.id} className="space-y-2">
              {isRelationField && field.relatedEntityDefinitionId ? (
                // Поле связи - используем RelationSelect
                <RelationSelect
                  fieldId={field.id}
                  relatedEntityDefinitionId={field.relatedEntityDefinitionId}
                  value={relationValue}
                  onChange={(ids) => handleChange(field.name, ids)}
                  multiple={
                    field.type === "multipleSelect" ||
                    field.dbType === "manyToMany" ||
                    field.dbType === "oneToMany"
                  }
                  required={field.required}
                  disabled={mode === "edit" && field.forEditPageDisabled}
                  label={field.label}
                />
              ) : field.type === "textarea" ? (
                // Текстовое поле
                <>
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  <textarea
                    id={field.name}
                    value={value}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder || ""}
                    required={field.required}
                    disabled={mode === "edit" && field.forEditPageDisabled}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </>
              ) : (
                // Обычное поле ввода
                <>
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id={field.name}
                    type={field.type === "number" ? "number" : "text"}
                    value={value}
                    onChange={(e) =>
                      handleChange(
                        field.name,
                        field.type === "number"
                          ? parseFloat(e.target.value) || 0
                          : e.target.value
                      )
                    }
                    placeholder={field.placeholder || ""}
                    required={field.required}
                    disabled={mode === "edit" && field.forEditPageDisabled}
                  />
                </>
              )}
              {field.description && (
                <p className="text-sm text-muted-foreground">
                  {field.description}
                </p>
              )}
            </div>
          );
        })
      )}

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : mode === "create" ? "Create" : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
