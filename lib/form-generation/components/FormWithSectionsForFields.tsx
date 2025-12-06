/**
 * FormWithSectionsForFields Component
 * Extended version of FormWithSectionsShadcn with support for:
 * - Dynamic options filtering based on other field values
 * - Automatic type change when dbType changes
 * - Support for exclude configuration in fields
 *
 * This is a specialized clone for Field forms that require complex logic
 */

"use client";

import { useMemo, useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FieldSet,
  FieldLegend,
  FieldGroup,
  FieldError,
} from "@/components/ui/field";
import type {
  Field as FieldType,
  FieldOption,
  FieldValue,
} from "@igorchugurov/public-api-sdk";
import type { EntityUIConfig } from "@/lib/universal-entity/ui-config-types";
import type { FormData } from "../types";
import { createSchema, createInitialFormData } from "../utils/createSchema";
import {
  createFormStructure,
  filterVisibleSections,
} from "../utils/createFormStructure";
import { getItemForEdit } from "../utils/getItemForEdit";
import { GetInputForFieldForFields } from "./GetInputForFieldForFields";
import { DeleteSection } from "./DeleteSection";

// Mapping dbType -> allowed field types (from FieldForm)
const FIELD_TYPE_BY_DB_TYPE: Record<string, string[]> = {
  varchar: ["text", "textarea"],
  float: ["number"],
  boolean: ["boolean"],
  timestamptz: ["date"],
  manyToOne: ["select"],
  oneToMany: ["multipleSelect"],
  manyToMany: ["multipleSelect"],
  oneToOne: ["select"],
  files: ["files", "images"],
};

interface DynamicOptionsProvider {
  (
    fieldName: string,
    formData: Record<string, FieldValue>,
    allFields: FieldType[]
  ): FieldOption[];
}

interface FormWithSectionsForFieldsProps {
  fields: FieldType[];
  mode: "create" | "edit";
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel?: () => void;
  onDelete?: () => Promise<void>;
  submitButtonText?: string;
  cancelButtonText?: string;
  uiConfig?: EntityUIConfig;
  itemName?: string;
  entityInstanceId?: string;
  // Extended props for Fields form
  dynamicOptionsProvider?: DynamicOptionsProvider;
  availableEntities?: Array<{ id: string; name: string }>; // For filtering relatedEntityDefinitionId
  availableFields?: Array<{
    id: string;
    name: string;
    label: string;
    entityDefinitionId: string;
  }>; // For filtering relationFieldId
  parentEntityId?: string; // For excluding from availableEntities
  readOnly?: boolean; // Если true, все поля disabled и скрыты кнопки сохранения/удаления
}

export function FormWithSectionsForFields({
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
  entityInstanceId,
  dynamicOptionsProvider,
  availableEntities = [],
  availableFields = [],
  parentEntityId,
  readOnly = false,
}: FormWithSectionsForFieldsProps) {
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

  const { handleSubmit, watch, setValue, formState } = methods;

  // Watch all form values for conditional field visibility and dynamic options
  const formValues = watch();

  // Auto-adjust type when dbType changes
  useEffect(() => {
    const dbType = formValues.dbType;
    const currentType = formValues.type;

    if (dbType && FIELD_TYPE_BY_DB_TYPE[dbType]) {
      const allowedTypes = FIELD_TYPE_BY_DB_TYPE[dbType];
      if (currentType && !allowedTypes.includes(currentType)) {
        // Auto-change type to first allowed type
        setValue("type", allowedTypes[0] as any, { shouldValidate: false });
      }
    }
  }, [formValues.dbType, formValues.type, setValue]);

  // Filter sections to only show visible fields
  const visibleSections = useMemo(() => {
    return filterVisibleSections(formStructure, formValues);
  }, [formStructure, formValues]);

  const deleteSection = useMemo(() => {
    return formStructure.sections.find(
      (section) => section.action && section.fields.length === 0
    );
  }, [formStructure]);

  // Get dynamic options for a field
  const getDynamicOptions = (field: FieldType): FieldOption[] => {
    // If custom provider is provided, use it
    if (dynamicOptionsProvider) {
      return dynamicOptionsProvider(field.name, formValues, relevantFields);
    }

    // Default logic for specific fields
    if (field.name === "relatedEntityDefinitionId") {
      // Filter out parent entity if exclude is set
      let filtered = availableEntities;
      if (parentEntityId && field.exclude === "parentEntityId") {
        filtered = availableEntities.filter((e) => e.id !== parentEntityId);
      }
      return filtered.map((e) => ({ id: e.id, name: e.name }));
    }

    if (field.name === "relationFieldId") {
      // Filter fields based on selected relatedEntityDefinitionId
      const relatedEntityId = formValues.relatedEntityDefinitionId;
      if (!relatedEntityId) {
        return [];
      }
      const relatedFields = availableFields.filter(
        (f) => f.entityDefinitionId === relatedEntityId
      );
      return relatedFields.map((f) => ({
        id: f.id,
        name: `${f.label} (${f.name})`,
      }));
    }

    // Fallback to static options
    return field.options || [];
  };

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

  return (
    <FormProvider {...methods}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{formTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id="form-shadcn-sections-fields"
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
                          readOnly ||
                          (mode === "edit" && field.forEditPageDisabled);

                        // Get dynamic options for this field
                        const dynamicOptions = getDynamicOptions(field);

                        return (
                          <GetInputForFieldForFields
                            key={field.id}
                            field={field}
                            control={methods.control}
                            disabled={isDisabled}
                            options={dynamicOptions}
                            entityInstanceId={entityInstanceId}
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
          {readOnly ? (
            // В режиме readOnly показываем только кнопку Cancel
            <div className="flex items-center gap-4 w-full justify-end">
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
            </div>
          ) : (
            // В режиме редактирования показываем все кнопки
            <>
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
                  form="form-shadcn-sections-fields"
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
            </>
          )}
        </CardFooter>
      </Card>
    </FormProvider>
  );
}
