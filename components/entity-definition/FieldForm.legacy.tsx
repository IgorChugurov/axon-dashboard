"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type {
  Field,
  EntityDefinition,
  DbType,
  FieldType,
} from "@igorchugurov/public-api-sdk";

interface FieldFormProps {
  projectId: string;
  entityDefinitionId: string;
  mode: "create" | "edit";
  initialData?: Field;
  availableEntities: EntityDefinition[];
  availableFields: Field[]; // Для relationFieldId
  onSubmit: (
    data: any
  ) => Promise<{ success: boolean; error?: string; data?: any }>;
  onDelete?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const DB_TYPE_OPTIONS: { value: DbType; label: string }[] = [
  { value: "varchar", label: "String (varchar)" },
  { value: "float", label: "Number (float)" },
  { value: "boolean", label: "Boolean" },
  { value: "timestamptz", label: "Date/Time (timestamptz)" },
  { value: "manyToOne", label: "Many to One (relation)" },
  { value: "oneToMany", label: "One to Many (relation)" },
  { value: "manyToMany", label: "Many to Many (relation)" },
  { value: "oneToOne", label: "One to One (relation)" },
  { value: "files", label: "Files (array of file IDs)" },
];

// Mapping dbType -> allowed field types
const FIELD_TYPE_BY_DB_TYPE: Record<DbType, FieldType[]> = {
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

export function FieldForm({
  projectId: _projectId,
  entityDefinitionId,
  mode,
  initialData,
  availableEntities,
  availableFields,
  onSubmit,
  onDelete,
  onCancel,
  isLoading = false,
}: FieldFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Используем isLoading от обёртки или isPending от useTransition
  const isSubmitting = isLoading || isPending;
  const [error, setError] = useState<string | null>(null);
  const [uiConfigOpen, setUiConfigOpen] = useState(false);
  const [relationsOpen, setRelationsOpen] = useState(false);
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [apiConfigOpen, setApiConfigOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    dbType: (initialData?.dbType || "varchar") as DbType,
    type: (initialData?.type || "text") as FieldType,
    label: initialData?.label || "",
    placeholder: initialData?.placeholder || "",
    description: initialData?.description || "",
    forEditPage: initialData?.forEditPage ?? true,
    forCreatePage: initialData?.forCreatePage ?? true,
    required: initialData?.required ?? false,
    requiredText: initialData?.requiredText || "",
    forEditPageDisabled: initialData?.forEditPageDisabled ?? false,
    displayIndex: initialData?.displayIndex ?? 0,
    displayInTable: initialData?.displayInTable ?? true,
    sectionIndex: initialData?.sectionIndex ?? 0,
    isOptionTitleField: initialData?.isOptionTitleField ?? false,
    searchable: initialData?.searchable ?? false,
    filterableInList: initialData?.filterableInList ?? false,
    relatedEntityDefinitionId: initialData?.relatedEntityDefinitionId || "",
    relationFieldId: initialData?.relationFieldId || "",
    isRelationSource: initialData?.isRelationSource ?? false,
    selectorRelationId: initialData?.selectorRelationId || "",
    relationFieldName: initialData?.relationFieldName || "",
    relationFieldLabel: initialData?.relationFieldLabel || "",
    relationFieldRequired: initialData?.relationFieldRequired ?? false,
    relationFieldRequiredText: initialData?.relationFieldRequiredText || "",
    defaultStringValue: initialData?.defaultStringValue || "",
    defaultNumberValue: initialData?.defaultNumberValue ?? 0,
    defaultBooleanValue: initialData?.defaultBooleanValue ?? false,
    defaultDateValue: initialData?.defaultDateValue || "",
    autoPopulate: initialData?.autoPopulate ?? false,
    includeInSinglePma: initialData?.includeInSinglePma ?? true,
    includeInListPma: initialData?.includeInListPma ?? true,
    includeInSingleSa: initialData?.includeInSingleSa ?? true,
    includeInListSa: initialData?.includeInListSa ?? true,
  });

  // Auto-adjust type when dbType changes
  useEffect(() => {
    const allowedTypes = FIELD_TYPE_BY_DB_TYPE[formData.dbType];
    if (allowedTypes && !allowedTypes.includes(formData.type)) {
      setFormData((prev) => ({ ...prev, type: allowedTypes[0] }));
    }
    // Auto-open Relations section when relation type is selected
    if (isRelationType(formData.dbType) && mode === "create") {
      setRelationsOpen(true);
    }
  }, [formData.dbType, formData.type, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        // Подготовка данных для отправки
        const submitData: any = {
          name: formData.name,
          dbType: formData.dbType,
          type: formData.type,
          label: formData.label,
          placeholder: formData.placeholder || null,
          description: formData.description || null,
          forEditPage: formData.forEditPage,
          forCreatePage: formData.forCreatePage,
          required: formData.required,
          requiredText: formData.requiredText || null,
          forEditPageDisabled: formData.forEditPageDisabled,
          displayIndex: formData.displayIndex,
          displayInTable: formData.displayInTable,
          sectionIndex: formData.sectionIndex,
          isOptionTitleField: formData.isOptionTitleField,
          searchable: formData.searchable,
          filterableInList: formData.filterableInList,
          autoPopulate: formData.autoPopulate,
          includeInSinglePma: formData.includeInSinglePma,
          includeInListPma: formData.includeInListPma,
          includeInSingleSa: formData.includeInSingleSa,
          includeInListSa: formData.includeInListSa,
        };

        // Relations
        if (isRelationType(formData.dbType)) {
          submitData.relatedEntityDefinitionId =
            formData.relatedEntityDefinitionId || null;
          submitData.relationFieldId = formData.relationFieldId || null;
          submitData.isRelationSource = formData.isRelationSource;
          submitData.selectorRelationId = formData.selectorRelationId || null;

          // Fields for creating related field (only on create)
          if (mode === "create") {
            submitData.relationFieldName = formData.relationFieldName || null;
            submitData.relationFieldLabel = formData.relationFieldLabel || null;
            submitData.relationFieldRequired = formData.relationFieldRequired;
            submitData.relationFieldRequiredText =
              formData.relationFieldRequiredText || null;
          }
        }

        // Defaults
        if (formData.dbType === "varchar") {
          submitData.defaultStringValue = formData.defaultStringValue || null;
        } else if (formData.dbType === "float") {
          submitData.defaultNumberValue = formData.defaultNumberValue;
        } else if (formData.dbType === "boolean") {
          submitData.defaultBooleanValue = formData.defaultBooleanValue;
        } else if (formData.dbType === "timestamptz") {
          submitData.defaultDateValue = formData.defaultDateValue || null;
        }

        const result = await onSubmit(submitData);

        // Навигация управляется обёрткой (FieldFormNew)
        if (!result.success && result.error) {
          setError(result.error);
        }
      } catch (err) {
        console.error("Error saving field:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to save. Please try again."
        );
      }
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isRelationType = (dbType: DbType) =>
    ["manyToOne", "oneToMany", "manyToMany", "oneToOne"].includes(dbType);

  const allowedFieldTypes = FIELD_TYPE_BY_DB_TYPE[formData.dbType] || ["text"];

  // Filter available entities - exclude current entity (can't relate to itself)
  const filteredAvailableEntities = availableEntities.filter(
    (entity) => entity.id !== entityDefinitionId
  );

  // Filter available fields for relationFieldId (only from related entity)
  const relatedFields = availableFields.filter(
    (f) => f.entityDefinitionId === formData.relatedEntityDefinitionId
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <div className="space-y-2">
          <Label htmlFor="name">
            Field Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="myFieldName"
            required
            pattern="^[a-zA-Z_][a-zA-Z0-9_]*$"
          />
          <p className="text-sm text-muted-foreground">
            camelCase, letters, numbers, underscores (e.g., myFieldName)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dbType">
            Database Type <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.dbType}
            onValueChange={(value) => handleChange("dbType", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DB_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">
            Field Type <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.type}
            onValueChange={(value) => handleChange("type", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedFieldTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Available types based on database type
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="label">
            Label <span className="text-red-500">*</span>
          </Label>
          <Input
            id="label"
            value={formData.label}
            onChange={(e) => handleChange("label", e.target.value)}
            placeholder="My Field"
            required
          />
          <p className="text-sm text-muted-foreground">
            Display label for the field
          </p>
        </div>
      </div>

      {/* UI Configuration */}
      <Collapsible open={uiConfigOpen} onOpenChange={setUiConfigOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-accent">
          <h3 className="text-lg font-semibold">UI Configuration</h3>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              uiConfigOpen ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="placeholder">Placeholder</Label>
            <Input
              id="placeholder"
              value={formData.placeholder}
              onChange={(e) => handleChange("placeholder", e.target.value)}
              placeholder="Enter value..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Field description..."
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="forEditPage"
                checked={formData.forEditPage}
                onChange={(e) => handleChange("forEditPage", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="forEditPage">Show on Edit Page</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="forCreatePage"
                checked={formData.forCreatePage}
                onChange={(e) =>
                  handleChange("forCreatePage", e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="forCreatePage">Show on Create Page</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="required"
                checked={formData.required}
                onChange={(e) => handleChange("required", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="required">Required</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="forEditPageDisabled"
                checked={formData.forEditPageDisabled}
                onChange={(e) =>
                  handleChange("forEditPageDisabled", e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="forEditPageDisabled">Disabled on Edit</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="displayInTable"
                checked={formData.displayInTable}
                onChange={(e) =>
                  handleChange("displayInTable", e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="displayInTable">Display in Table</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isOptionTitleField"
                checked={formData.isOptionTitleField}
                onChange={(e) =>
                  handleChange("isOptionTitleField", e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isOptionTitleField">Is Title Field</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="searchable"
                checked={formData.searchable}
                onChange={(e) => handleChange("searchable", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="searchable">Searchable</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="filterableInList"
                checked={formData.filterableInList}
                onChange={(e) =>
                  handleChange("filterableInList", e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="filterableInList">Filterable in List</Label>
            </div>
          </div>

          {formData.required && (
            <div className="space-y-2">
              <Label htmlFor="requiredText">Required Error Text</Label>
              <Input
                id="requiredText"
                value={formData.requiredText}
                onChange={(e) => handleChange("requiredText", e.target.value)}
                placeholder="This field is required"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayIndex">Display Index</Label>
            <Input
              id="displayIndex"
              type="number"
              value={formData.displayIndex}
              onChange={(e) =>
                handleChange("displayIndex", parseInt(e.target.value) || 0)
              }
            />
            <p className="text-sm text-muted-foreground">
              Order of the field in forms and tables
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sectionIndex">Section Index</Label>
            <Input
              id="sectionIndex"
              type="number"
              min="0"
              max="3"
              value={formData.sectionIndex}
              onChange={(e) =>
                handleChange("sectionIndex", parseInt(e.target.value) || 0)
              }
            />
            <p className="text-sm text-muted-foreground">
              Section number (0-3) for grouping fields in forms
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Relations (only for relation types) */}
      {isRelationType(formData.dbType) && (
        <Collapsible open={relationsOpen} onOpenChange={setRelationsOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-accent">
            <h3 className="text-lg font-semibold">Relations</h3>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                relationsOpen ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="relatedEntityDefinitionId">
                Related Entity <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.relatedEntityDefinitionId || undefined}
                onValueChange={(value) =>
                  handleChange("relatedEntityDefinitionId", value)
                }
                disabled={mode === "edit"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredAvailableEntities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fields for creating related field in the other entity (only on create) */}
            {mode === "create" && formData.relatedEntityDefinitionId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="relationFieldName">
                    Related Field Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="relationFieldName"
                    value={formData.relationFieldName}
                    onChange={(e) =>
                      handleChange("relationFieldName", e.target.value)
                    }
                    placeholder="relatedFieldName"
                    required
                    pattern="^[a-zA-Z_][a-zA-Z0-9_]*$"
                  />
                  <p className="text-sm text-muted-foreground">
                    Name of the field to create in the related entity
                    (camelCase)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationFieldLabel">
                    Related Field Label <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="relationFieldLabel"
                    value={formData.relationFieldLabel}
                    onChange={(e) =>
                      handleChange("relationFieldLabel", e.target.value)
                    }
                    placeholder="Related Field"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Display label for the field in the related entity
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="relationFieldRequired"
                    checked={formData.relationFieldRequired}
                    onChange={(e) =>
                      handleChange("relationFieldRequired", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="relationFieldRequired">
                    Related Field Required
                  </Label>
                </div>

                {formData.relationFieldRequired && (
                  <div className="space-y-2">
                    <Label htmlFor="relationFieldRequiredText">
                      Related Field Required Error Text
                    </Label>
                    <Input
                      id="relationFieldRequiredText"
                      value={formData.relationFieldRequiredText}
                      onChange={(e) =>
                        handleChange(
                          "relationFieldRequiredText",
                          e.target.value
                        )
                      }
                      placeholder="This field is required"
                    />
                  </div>
                )}
              </>
            )}

            {formData.relatedEntityDefinitionId && (
              <div className="space-y-2">
                <Label htmlFor="relationFieldId">
                  Reverse Field (Optional)
                </Label>
                <Select
                  value={formData.relationFieldId || "__none__"}
                  onValueChange={(value) =>
                    handleChange(
                      "relationFieldId",
                      value === "__none__" ? "" : value
                    )
                  }
                  disabled={mode === "edit"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {relatedFields.map((field) => (
                      <SelectItem key={field.id} value={field.id}>
                        {field.label} ({field.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  The opposite field in the related entity (for bidirectional
                  relations)
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isRelationSource"
                checked={formData.isRelationSource}
                onChange={(e) =>
                  handleChange("isRelationSource", e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isRelationSource">Is Relation Source</Label>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Default Values (only for non-relation types) */}
      {!isRelationType(formData.dbType) && (
        <Collapsible open={defaultsOpen} onOpenChange={setDefaultsOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-accent">
            <h3 className="text-lg font-semibold">Default Values</h3>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                defaultsOpen ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {formData.dbType === "varchar" && (
              <div className="space-y-2">
                <Label htmlFor="defaultStringValue">Default String Value</Label>
                <Input
                  id="defaultStringValue"
                  value={formData.defaultStringValue}
                  onChange={(e) =>
                    handleChange("defaultStringValue", e.target.value)
                  }
                />
              </div>
            )}

            {formData.dbType === "float" && (
              <div className="space-y-2">
                <Label htmlFor="defaultNumberValue">Default Number Value</Label>
                <Input
                  id="defaultNumberValue"
                  type="number"
                  step="any"
                  value={formData.defaultNumberValue}
                  onChange={(e) =>
                    handleChange(
                      "defaultNumberValue",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
            )}

            {formData.dbType === "boolean" && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="defaultBooleanValue"
                  checked={formData.defaultBooleanValue}
                  onChange={(e) =>
                    handleChange("defaultBooleanValue", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="defaultBooleanValue">
                  Default Boolean Value
                </Label>
              </div>
            )}

            {formData.dbType === "timestamptz" && (
              <div className="space-y-2">
                <Label htmlFor="defaultDateValue">Default Date Value</Label>
                <Input
                  id="defaultDateValue"
                  type="datetime-local"
                  value={formData.defaultDateValue}
                  onChange={(e) =>
                    handleChange("defaultDateValue", e.target.value)
                  }
                />
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* API Configuration */}
      <Collapsible open={apiConfigOpen} onOpenChange={setApiConfigOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-accent">
          <h3 className="text-lg font-semibold">API Configuration</h3>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              apiConfigOpen ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoPopulate"
                checked={formData.autoPopulate}
                onChange={(e) => handleChange("autoPopulate", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="autoPopulate">Auto Populate</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeInSinglePma"
                checked={formData.includeInSinglePma}
                onChange={(e) =>
                  handleChange("includeInSinglePma", e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="includeInSinglePma">Include in Single PMA</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeInListPma"
                checked={formData.includeInListPma}
                onChange={(e) =>
                  handleChange("includeInListPma", e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="includeInListPma">Include in List PMA</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeInSingleSa"
                checked={formData.includeInSingleSa}
                onChange={(e) =>
                  handleChange("includeInSingleSa", e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="includeInSingleSa">Include in Single SA</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeInListSa"
                checked={formData.includeInListSa}
                onChange={(e) =>
                  handleChange("includeInListSa", e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="includeInListSa">Include in List SA</Label>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : mode === "create" ? "Create" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => (onCancel ? onCancel() : router.back())}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        {mode === "edit" && onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={isSubmitting}
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
