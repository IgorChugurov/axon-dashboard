/**
 * Страница создания тега
 */

import { TagForm } from "@/components/forms/TagForm";
import { createTagAction } from "../actions";

export default function NewTagPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Tag</h1>
        <p className="text-muted-foreground">Add a new content tag</p>
      </div>

      <TagForm onSubmit={createTagAction} />
    </div>
  );
}

