/**
 * Страница создания автора
 */

import { AuthorForm } from "@/components/forms/AuthorForm";
import { createAuthorAction } from "../actions";

export default function NewAuthorPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Author</h1>
        <p className="text-muted-foreground">Add a new content author</p>
      </div>

      <AuthorForm onSubmit={createAuthorAction} />
    </div>
  );
}

