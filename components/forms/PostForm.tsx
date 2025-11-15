/**
 * Форма создания/редактирования поста
 */

"use client";

import { EntityForm } from "./EntityForm";
import { AuthorSelect } from "./AuthorSelect";
import { TagsSelect } from "./TagsSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Post, CreatePostData, UpdatePostData } from "@/lib/entities/posts/types";

interface PostFormProps {
  initialData?: Post;
  onSubmit: (data: Partial<Post>) => Promise<{
    success: boolean;
    error?: string;
    data?: Post;
  }>;
  isEdit?: boolean;
}

export function PostForm({ initialData, onSubmit, isEdit = false }: PostFormProps) {
  return (
    <EntityForm<Partial<Post>>
      initialData={
        initialData
          ? {
              title: initialData.title,
              slug: initialData.slug,
              content: initialData.content,
              excerpt: initialData.excerpt,
              status: initialData.status,
              author_id: initialData.author_id || "",
              published_at: initialData.published_at,
            }
          : {
              title: "",
              slug: "",
              content: "",
              excerpt: "",
              status: "draft",
              author_id: "",
              published_at: null,
            }
      }
      onSubmit={onSubmit}
      entityName="Post"
      entityPath="/posts"
      isEdit={isEdit}
    >
      {(formData, setFormData) => (
        <>
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => {
                const title = e.target.value;
                const slug = title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-+|-+$/g, "");
                setFormData({ ...formData, title, slug });
              }}
              placeholder="Getting Started with Next.js"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">
              Slug <span className="text-destructive">*</span>
            </Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="getting-started-nextjs"
              required
            />
            <p className="text-sm text-muted-foreground">
              URL-friendly identifier (auto-filled from title)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <textarea
              id="excerpt"
              value={formData.excerpt || ""}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              placeholder="Short summary of the post..."
              className="w-full min-h-[80px] px-3 py-2 border rounded-md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <textarea
              id="content"
              value={formData.content || ""}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your post content here..."
              className="w-full min-h-[300px] px-3 py-2 border rounded-md font-mono text-sm"
            />
          </div>

          {/* Author Select */}
          <AuthorSelect
            value={formData.author_id || ""}
            onChange={(authorId) => setFormData({ ...formData, author_id: authorId })}
            required
          />

          {/* Tags Select - временно комментируем, так как tag_ids не в типе Post */}
          {/* <TagsSelect
            value={formData.tag_ids || []}
            onChange={(tagIds) => setFormData({ ...formData, tag_ids: tagIds })}
          /> */}

          <div className="space-y-2">
            <Label htmlFor="status">
              Status <span className="text-destructive">*</span>
            </Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as "draft" | "published" | "archived",
                })
              }
              required
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {formData.status === "published" && (
            <div className="space-y-2">
              <Label htmlFor="published_at">Publish Date</Label>
              <Input
                id="published_at"
                type="datetime-local"
                value={
                  formData.published_at
                    ? new Date(formData.published_at).toISOString().slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    published_at: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Leave empty to use current date/time
              </p>
            </div>
          )}
        </>
      )}
    </EntityForm>
  );
}

