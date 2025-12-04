/**
 * Компонент для переключения между старой и новой формой полей
 * Позволяет тестировать новую форму без полной замены старой
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FieldFormSwitcherProps {
  useUniversal: boolean;
  projectId: string;
  entityDefId: string;
  fieldId?: string;
  mode: "create" | "edit";
}

export function FieldFormSwitcher({
  useUniversal,
  projectId,
  entityDefId,
  fieldId,
  mode,
}: FieldFormSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const toggleForm = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (useUniversal) {
      params.delete("useUniversal");
    } else {
      params.set("useUniversal", "true");
    }

    // Build URL based on mode
    let url = `/projects/${projectId}/${entityDefId}/fields`;
    if (mode === "edit" && fieldId) {
      url += `/${fieldId}`;
    } else if (mode === "create") {
      url += "/new";
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    router.push(url);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Form Version:</span>
        <Badge variant={useUniversal ? "default" : "secondary"}>
          {useUniversal ? "Universal (New)" : "Legacy (Old)"}
        </Badge>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={toggleForm}
        className="text-xs"
      >
        Switch to {useUniversal ? "Legacy" : "Universal"} Form
      </Button>
    </div>
  );
}
