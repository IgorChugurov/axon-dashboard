/**
 * Универсальный компонент формы
 * Основа для всех форм создания/редактирования
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface EntityFormProps<T> {
  initialData?: T;
  onSubmit: (data: T) => Promise<{ success: boolean; error?: string; data?: any }>;
  entityName: string;
  entityPath: string;
  children: (formData: T, setFormData: (data: T) => void) => React.ReactNode;
  isEdit?: boolean;
}

export function EntityForm<T extends Record<string, any>>({
  initialData,
  onSubmit,
  entityName,
  entityPath,
  children,
  isEdit = false,
}: EntityFormProps<T>) {
  const router = useRouter();
  const [formData, setFormData] = useState<T>(initialData || ({} as T));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await onSubmit(formData);

      if (result.success) {
        router.push(entityPath);
      } else {
        setError(result.error || "An error occurred");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      {children(formData, setFormData)}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Update" : "Create"} {entityName}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(entityPath)}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

