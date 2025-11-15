/**
 * Клиентский компонент для редактирования автора
 */

"use client";

import { AuthorForm } from "@/components/forms/AuthorForm";
import { updateAuthorAction } from "../../actions";
import type { Author } from "@/lib/entities/authors/types";

interface EditAuthorClientProps {
  author: Author;
}

export function EditAuthorClient({ author }: EditAuthorClientProps) {
  const handleSubmit = async (data: Partial<Author>) => {
    return await updateAuthorAction(author.id, data);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Author</h1>
        <p className="text-muted-foreground">Update author information</p>
      </div>

      <AuthorForm initialData={author} onSubmit={handleSubmit} isEdit />
    </div>
  );
}

