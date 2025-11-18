/**
 * FormWithSections Component
 * Automatically generates a form with sections based on entity definition and fields
 */

"use client";

import { useMemo, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button } from "@/components/ui/button";
import type { EntityDefinition, Field } from "@/lib/universal-entity/types";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type { FormData } from "../types";
import { createSchema, createInitialFormData } from "../utils/createSchema";
import { createFormStructure, filterVisibleSections } from "../utils/createFormStructure";
import { getItemForEdit } from "../utils/getItemForEdit";
import { GetInputForField } from "./GetInputForField";
import { DeleteSection } from "./DeleteSection";

interface FormWithSectionsProps {
  entityDefinition: EntityDefinition;
  fields: Field[];
  mode: "create" | "edit";
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel?: () => void;
  onDelete?: () => Promise<void>;
  submitButtonText?: string;
  cancelButtonText?: string;
  uiConfig?: EntityUIConfig;
  itemName?: string; // For delete confirmation modal
}

export function FormWithSections({
  entityDefinition,
  fields,
  mode,
  initialData = {},
  onSubmit,
  onCancel,
  onDelete,
  submitButtonText,
  cancelButtonText,
  uiConfig,
  itemName,
}: FormWithSectionsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Filter fields for current mode
  const relevantFields = useMemo(() => {
    return fields.filter((field) => {
      if (mode === "create") return field.forCreatePage;
      if (mode === "edit") return field.forEditPage;
      return false;
    });
  }, [fields, mode]);

  // Create form structure with sections
  const formStructure = useMemo(() => {
    return createFormStructure(entityDefinition, fields, mode, uiConfig);
  }, [entityDefinition, fields, mode, uiConfig]);

  // Prepare initial form data
  const preparedInitialData = useMemo(() => {
    if (mode === "edit" && Object.keys(initialData).length > 0) {
      return getItemForEdit(relevantFields, initialData);
    }
    return createInitialFormData(relevantFields, initialData);
  }, [mode, relevantFields, initialData]);

  // Create validation schema
  const validationSchema = useMemo(() => {
    return createSchema(relevantFields);
  }, [relevantFields]);

  // Initialize react-hook-form
  const methods = useForm({
    mode: "onTouched",
    resolver: yupResolver(validationSchema),
    defaultValues: preparedInitialData,
  });

  const {
    handleSubmit,
    watch,
  } = methods;

  // Watch all form values for conditional field visibility
  const formValues = watch();

  // Filter sections to only show visible fields
  const visibleSections = useMemo(() => {
    return filterVisibleSections(formStructure, formValues);
  }, [formStructure, formValues]);

  // Handle form submission
  const onFormSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Form submission error:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to save. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={onFormSubmit} className="space-y-8" noValidate>
        {/* Global error message */}
        {submitError && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">
              {submitError}
            </p>
          </div>
        )}

        {/* Render sections */}
        {visibleSections.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No fields available for {mode === "create" ? "creation" : "editing"}.</p>
          </div>
        ) : (
          visibleSections.map((section, sectionIdx) => {
            // Check if this is a delete section (has action and no fields)
            if (section.action && section.fields.length === 0) {
              if (!onDelete) {
                return null;
              }
              return (
                <DeleteSection
                  key={section.sectionIndex}
                  action={section.action}
                  onDelete={onDelete}
                  itemName={itemName}
                />
              );
            }

            // Regular section with fields
            return (
              <div
                key={section.sectionIndex}
                className={`space-y-6 ${
                  sectionIdx > 0 ? "pt-6 border-t border-border" : ""
                }`}
              >
                {/* Section Title */}
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold tracking-tight">
                    {section.title}
                  </h3>
                  <div className="h-1 w-12 bg-primary rounded-full" />
                </div>

                {/* Section Fields */}
                <div className="space-y-6">
                  {section.fields.map((field) => {
                    const isDisabled =
                      mode === "edit" && field.forEditPageDisabled;

                    return (
                      <div key={field.id}>
                        <GetInputForField
                          field={field}
                          control={methods.control}
                          disabled={isDisabled}
                          options={[]} // Options will be loaded by InputSelect/InputRelation
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* Form Actions */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : submitButtonText || (mode === "create" ? "Create" : "Save")}
          </Button>

          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {cancelButtonText || "Cancel"}
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}

