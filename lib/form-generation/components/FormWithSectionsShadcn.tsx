/**
 * FormWithSectionsShadcn Component
 * Shadcn UI version with Field components
 * Automatically generates a form with sections based on entity definition and fields
 * Uses Field, FieldSet, FieldLegend, FieldGroup components from shadcn/ui
 */

"use client";

import { useMemo, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldSet,
  FieldLegend,
  FieldGroup,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import type { Field as FieldType } from "@/lib/universal-entity/types";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type { FormData } from "../types";
import { createSchema, createInitialFormData } from "../utils/createSchema";
import {
  createFormStructure,
  filterVisibleSections,
} from "../utils/createFormStructure";
import { getItemForEdit } from "../utils/getItemForEdit";
import { GetInputForFieldShadcn } from "./GetInputForFieldShadcn";
import { DeleteSection } from "./DeleteSection";

interface FormWithSectionsShadcnProps {
  fields: FieldType[];
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

export function FormWithSectionsShadcn({
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
}: FormWithSectionsShadcnProps) {
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
    return createFormStructure(fields, mode, uiConfig);
  }, [fields, mode, uiConfig]);

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

  const { handleSubmit, watch, formState } = methods;

  // Watch all form values for conditional field visibility
  const formValues = watch();

  // Filter sections to only show visible fields
  const visibleSections = useMemo(() => {
    return filterVisibleSections(formStructure, formValues);
  }, [formStructure, formValues]);
  const deleteSection = useMemo(() => {
    return formStructure.sections.find(
      (section) => section.action && section.fields.length === 0
    );
  }, [formStructure]);

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

  // Form title and description
  const formTitle =
    mode === "create"
      ? uiConfig?.form?.createPageTitle || "Create"
      : uiConfig?.form?.editPageTitle || "Edit";

  //const formDescription = uiConfig?.form?.pageHeader;

  return (
    <FormProvider {...methods}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{formTitle}</CardTitle>
          {/* {formDescription && (
            <CardDescription>{formDescription}</CardDescription>
          )} */}
        </CardHeader>
        <CardContent>
          <form
            id="form-shadcn-sections"
            onSubmit={onFormSubmit}
            className="space-y-8"
            noValidate
          >
            {/* Global error message */}
            {submitError && (
              <div className="rounded-md bg-destructive/10 dark:bg-destructive/20 p-4">
                <p className="text-sm text-destructive font-medium">
                  {submitError}
                </p>
              </div>
            )}

            {/* Render sections */}
            {visibleSections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>
                  No fields available for{" "}
                  {mode === "create" ? "creation" : "editing"}.
                </p>
              </div>
            ) : (
              visibleSections.map((section, sectionIdx) => {
                // Check if this is a delete section (has action and no fields)
                if (section.action && section.fields.length === 0) {
                  return null;
                  // if (!onDelete) {
                  //   return null;
                  // }
                  // return (
                  //   <DeleteSection
                  //     key={section.sectionIndex}
                  //     action={section.action}
                  //     onDelete={onDelete}
                  //     itemName={itemName}
                  //   />
                  // );
                }

                // Regular section with fields
                return (
                  <FieldSet
                    key={section.sectionIndex}
                    className={`space-y-4 ${sectionIdx > 0 ? "pt-6" : ""}`}
                  >
                    {sectionIdx > 0 && (
                      <div className="border-t border-border -mt-6 mb-6" />
                    )}
                    <FieldLegend variant="legend">{section.title}</FieldLegend>

                    <FieldGroup className="gap-4">
                      {section.fields.map((field) => {
                        const isDisabled =
                          mode === "edit" && field.forEditPageDisabled;

                        return (
                          <GetInputForFieldShadcn
                            key={field.id}
                            field={field}
                            control={methods.control}
                            disabled={isDisabled}
                            options={field.options ?? []}
                          />
                        );
                      })}
                    </FieldGroup>

                    {/* Section-level errors (if any) */}
                    {formState.errors[section.sectionIndex]?.root && (
                      <FieldError
                        errors={[formState.errors[section.sectionIndex]?.root]}
                      />
                    )}
                  </FieldSet>
                );
              })
            )}
          </form>
        </CardContent>
        <CardFooter className="border-t flex justify-between items-center w-full">
          {onDelete && deleteSection && (
            <DeleteSection
              onlyButton={true}
              action={
                deleteSection?.action || {
                  action: "delete",
                  title: "Delete",
                  options: {
                    modalText: "Are you sure you want to delete this item?",
                    modalTitle: "Confirm deletion",
                  },
                }
              }
              onDelete={onDelete}
              itemName={itemName}
            />
          )}
          <div className="flex items-center gap-4 ">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {cancelButtonText ||
                  uiConfig?.form?.cancelButtonLabel ||
                  "Cancel"}
              </Button>
            )}
            <Button
              type="submit"
              form="form-shadcn-sections"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : submitButtonText ||
                  (mode === "create"
                    ? uiConfig?.form?.createButtonLabel || "Create"
                    : uiConfig?.form?.updateButtonLabel || "Save")}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </FormProvider>
  );
}
