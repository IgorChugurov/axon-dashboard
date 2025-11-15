/**
 * Форма создания/редактирования автора
 */

"use client";

import { EntityForm } from "./EntityForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Author, CreateAuthorData, UpdateAuthorData } from "@/lib/entities/authors/types";

interface AuthorFormProps {
  initialData?: Author;
  onSubmit: (data: Partial<Author>) => Promise<{
    success: boolean;
    error?: string;
    data?: Author;
  }>;
  isEdit?: boolean;
}

export function AuthorForm({ initialData, onSubmit, isEdit = false }: AuthorFormProps) {
  return (
    <EntityForm<Partial<Author>>
      initialData={
        initialData
          ? {
              name: initialData.name,
              email: initialData.email,
              bio: initialData.bio,
              avatar_url: initialData.avatar_url,
            }
          : { name: "", email: "", bio: "", avatar_url: "" }
      }
      onSubmit={onSubmit}
      entityName="Author"
      entityPath="/authors"
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
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              value={formData.bio || ""}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Short biography..."
              className="w-full min-h-[100px] px-3 py-2 border rounded-md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar_url">Avatar URL</Label>
            <Input
              id="avatar_url"
              type="url"
              value={formData.avatar_url || ""}
              onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>
        </>
      )}
    </EntityForm>
  );
}

