"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEntityDefinitions } from "@/components/providers/EntityDefinitionsProvider";
import type {
  EntityDefinition,
  Field,
  EntityInstanceWithFields,
} from "@/lib/universal-entity/types";
import {
  buildTableColumns,
  formatCellValue,
} from "@/lib/universal-entity/table-utils";

interface EntityListClientProps {
  entityDefinition: EntityDefinition;
  fields: Field[];
  initialInstances: EntityInstanceWithFields[];
  initialPage: number;
  initialSearch: string;
}

export function EntityListClient({
  entityDefinition,
  fields,
  initialInstances,
  initialPage,
  initialSearch,
}: EntityListClientProps) {
  const { projectId } = useEntityDefinitions();
  const [instances] = useState(initialInstances);
  const [page] = useState(initialPage);
  const [search] = useState(initialSearch);

  // Конфигурируем столбцы таблицы на основе полей
  const tableColumns = useMemo(() => buildTableColumns(fields), [fields]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* TODO: Добавить поиск */}
        </div>
        <Button asChild>
          <Link href={`/${projectId}/entities/${entityDefinition.id}/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Create {entityDefinition.name}
          </Link>
        </Button>
      </div>

      {instances.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No {entityDefinition.name.toLowerCase()} found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href={`/${projectId}/entities/${entityDefinition.id}/new`}>
              Create first {entityDefinition.name.toLowerCase()}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {tableColumns.map((column) => (
                  <th
                    key={column.id}
                    className="h-12 px-4 text-left align-middle font-medium"
                  >
                    {column.label}
                  </th>
                ))}
                <th className="h-12 px-4 text-left align-middle font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {instances.map((instance) => (
                <tr key={instance.id} className="border-b">
                  {tableColumns.map((column) => {
                    const displayValue = formatCellValue(instance, column);

                    return (
                      <td key={column.id} className="p-4">
                        {displayValue}
                      </td>
                    );
                  })}
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/${projectId}/entities/${entityDefinition.id}/${instance.id}`}
                        >
                          View
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/${projectId}/entities/${entityDefinition.id}/${instance.id}/edit`}
                        >
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TODO: Добавить пагинацию */}
    </div>
  );
}
