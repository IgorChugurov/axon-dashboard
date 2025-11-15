/**
 * Клиентский компонент для редактирования тега
 */

"use client";

import { TagForm } from "@/components/forms/TagForm";
import { updateTagAction } from "../../actions";
import type { Tag } from "@/lib/entities/tags/types";

interface EditTagClientProps {
  tag: Tag;
}

export function EditTagClient({ tag }: EditTagClientProps) {
  const handleSubmit = async (data: Partial<Tag>) => {
    return await updateTagAction(tag.id, data);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Tag</h1>
        <p className="text-muted-foreground">Update tag information</p>
      </div>

      <TagForm initialData={tag} onSubmit={handleSubmit} isEdit />
    </div>
  );
}

