"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Field } from "@/lib/universal-entity/types";
import { deleteFieldAction } from "./actions";

interface FieldListClientProps {
  projectId: string;
  entityDefinitionId: string;
  fields: Field[];
}

export function FieldListClient({
  projectId,
  entityDefinitionId,
  fields,
}: FieldListClientProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (fieldId: string, fieldName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete field "${fieldName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(fieldId);
    try {
      const result = await deleteFieldAction(
        projectId,
        entityDefinitionId,
        fieldId
      );

      if (result.success) {
        router.refresh();
      } else {
        alert(`Failed to delete field: ${result.error}\n${result.details || ""}`);
      }
    } catch (error) {
      console.error("Error deleting field:", error);
      alert("An unexpected error occurred");
    } finally {
      setDeletingId(null);
    }
  };

  // Сортируем поля по displayIndex
  const sortedFields = [...fields].sort(
    (a, b) => a.displayIndex - b.displayIndex
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Fields</h2>
        <Button asChild>
          <Link
            href={`/projects/${projectId}/${entityDefinitionId}/fields/new`}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Field
          </Link>
        </Button>
      </div>

      {sortedFields.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">
            No fields defined yet. Create your first field to get started.
          </p>
          <Button asChild variant="outline">
            <Link
              href={`/projects/${projectId}/${entityDefinitionId}/fields/new`}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First Field
            </Link>
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Index
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Label
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  DB Type
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium">
                  Required
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium">
                  In Table
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedFields.map((field) => (
                <tr
                  key={field.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {field.displayIndex}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">
                    {field.name}
                  </td>
                  <td className="px-4 py-3 text-sm">{field.label}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10">
                      {field.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center rounded-md bg-gray-50 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10">
                      {field.dbType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {field.required ? (
                      <span className="text-red-500">✓</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {field.displayInTable ? (
                      <span className="text-green-500">✓</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        disabled={deletingId !== null}
                      >
                        <Link
                          href={`/projects/${projectId}/${entityDefinitionId}/fields/${field.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(field.id, field.name)}
                        disabled={deletingId !== null}
                      >
                        {deletingId === field.id ? (
                          <span className="h-4 w-4 animate-spin">⏳</span>
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

