/**
 * Форма создания/редактирования тега
 */

"use client";

import { EntityForm } from "./EntityForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tag, CreateTagData, UpdateTagData } from "@/lib/entities/tags/types";

interface TagFormProps {
  initialData?: Tag;
  onSubmit: (data: Partial<Tag>) => Promise<{
    success: boolean;
    error?: string;
    data?: Tag;
  }>;
  isEdit?: boolean;
}

export function TagForm({ initialData, onSubmit, isEdit = false }: TagFormProps) {
  return (
    <EntityForm<Partial<Tag>>
      initialData={
        initialData
          ? {
              name: initialData.name,
              slug: initialData.slug,
              color: initialData.color,
            }
          : { name: "", slug: "", color: "#3b82f6" }
      }
      onSubmit={onSubmit}
      entityName="Tag"
      entityPath="/tags"
      isEdit={isEdit}
    >
      {(formData, setFormData) => (
        <>
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                const slug = name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-+|-+$/g, "");
                setFormData({ ...formData, name, slug });
              }}
              placeholder="JavaScript"
              required
            />
            <p className="text-sm text-muted-foreground">
              Tag name (slug will be auto-generated)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">
              Slug <span className="text-destructive">*</span>
            </Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="javascript"
              required
            />
            <p className="text-sm text-muted-foreground">
              URL-friendly identifier (auto-filled from name)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                value={formData.color || "#3b82f6"}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={formData.color || "#3b82f6"}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#3b82f6"
                className="flex-1"
              />
            </div>
          </div>
        </>
      )}
    </EntityForm>
  );
}

