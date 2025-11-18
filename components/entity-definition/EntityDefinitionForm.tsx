"use client";

import { useState, useTransition } from "react";
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
import type { EntityDefinition } from "@/lib/universal-entity/types";

interface EntityDefinitionFormProps {
  projectId: string;
  mode: "create" | "edit";
  initialData?: EntityDefinition;
  onSubmit: (data: any) => Promise<{ success: boolean; error?: string; data?: any }>;
}

const PERMISSION_OPTIONS = [
  { value: "ALL", label: "All (including anonymous)" },
  { value: "User", label: "Registered users only" },
  { value: "Admin", label: "Administrators only" },
  { value: "Admin|User", label: "Admins and Users" },
];

const TYPE_OPTIONS = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "tertiary", label: "Tertiary" },
];

export function EntityDefinitionForm({
  projectId,
  mode,
  initialData,
  onSubmit,
}: EntityDefinitionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    url: initialData?.url || "",
    description: initialData?.description || "",
    tableName: initialData?.tableName || "",
    type: initialData?.type || "secondary",
    createPermission: initialData?.createPermission || "Admin",
    readPermission: initialData?.readPermission || "ALL",
    updatePermission: initialData?.updatePermission || "Admin",
    deletePermission: initialData?.deletePermission || "Admin",
    titleSection0: initialData?.titleSection0 || "",
    titleSection1: initialData?.titleSection1 || "",
    titleSection2: initialData?.titleSection2 || "",
    titleSection3: initialData?.titleSection3 || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const result = await onSubmit(formData);

        if (result.success) {
          router.push(`/${projectId}`);
          router.refresh();
        } else {
          setError(result.error || "An error occurred");
        }
      } catch (err) {
        console.error("Error saving entity definition:", err);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Tags, Posts, etc."
            required
            minLength={2}
            maxLength={50}
          />
          <p className="text-sm text-muted-foreground">
            Display name for this entity (min 2, max 50 characters)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">
            API URL <span className="text-red-500">*</span>
          </Label>
          <Input
            id="url"
            value={formData.url}
            onChange={(e) => handleChange("url", e.target.value)}
            placeholder="/api/tags"
            required
            pattern="^/api/.*"
          />
          <p className="text-sm text-muted-foreground">
            API endpoint URL (must start with /api/)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="A brief description of this entity..."
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tableName">
            Table Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="tableName"
            value={formData.tableName}
            onChange={(e) => handleChange("tableName", e.target.value)}
            placeholder="tags"
            required
            pattern="^[a-z_]+$"
            disabled={mode === "edit"}
          />
          <p className="text-sm text-muted-foreground">
            {mode === "edit"
              ? "Table name cannot be changed after creation"
              : "Database table name (lowercase with underscores only, e.g., my_table)"}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">
            Type <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.type}
            onValueChange={(value) => handleChange("type", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Section Titles */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Form Sections</h3>
        <p className="text-sm text-muted-foreground">
          Define custom titles for form sections (0-3). Leave empty to use default titles.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="titleSection0">Section 0 Title</Label>
            <Input
              id="titleSection0"
              value={formData.titleSection0}
              onChange={(e) => handleChange("titleSection0", e.target.value)}
              placeholder="General Information"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="titleSection1">Section 1 Title</Label>
            <Input
              id="titleSection1"
              value={formData.titleSection1}
              onChange={(e) => handleChange("titleSection1", e.target.value)}
              placeholder="Section 1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="titleSection2">Section 2 Title</Label>
            <Input
              id="titleSection2"
              value={formData.titleSection2}
              onChange={(e) => handleChange("titleSection2", e.target.value)}
              placeholder="Section 2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="titleSection3">Section 3 Title</Label>
            <Input
              id="titleSection3"
              value={formData.titleSection3}
              onChange={(e) => handleChange("titleSection3", e.target.value)}
              placeholder="Section 3"
            />
          </div>
        </div>
      </div>

      {/* Permissions */}
      <Collapsible open={permissionsOpen} onOpenChange={setPermissionsOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-accent">
          <h3 className="text-lg font-semibold">Permissions</h3>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              permissionsOpen ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="createPermission">Create Permission</Label>
            <Select
              value={formData.createPermission}
              onValueChange={(value) => handleChange("createPermission", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERMISSION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="readPermission">Read Permission</Label>
            <Select
              value={formData.readPermission}
              onValueChange={(value) => handleChange("readPermission", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERMISSION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="updatePermission">Update Permission</Label>
            <Select
              value={formData.updatePermission}
              onValueChange={(value) => handleChange("updatePermission", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERMISSION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deletePermission">Delete Permission</Label>
            <Select
              value={formData.deletePermission}
              onValueChange={(value) => handleChange("deletePermission", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERMISSION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : mode === "create" ? "Create" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

