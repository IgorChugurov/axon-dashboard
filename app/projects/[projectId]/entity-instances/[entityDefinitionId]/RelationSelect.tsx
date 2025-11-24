"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface Option {
  id: string;
  title: string;
}

interface RelationSelectProps {
  fieldId: string;
  relatedEntityDefinitionId: string;
  value: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
}

export function RelationSelect({
  fieldId,
  relatedEntityDefinitionId,
  value,
  onChange,
  multiple = false,
  required = false,
  disabled = false,
}: RelationSelectProps) {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [titleField, setTitleField] = useState<string>("id");

  useEffect(() => {
    loadOptions();
  }, [relatedEntityDefinitionId]);

  const loadOptions = async () => {
    try {
      setLoading(true);

      // Загружаем опции через API
      const response = await fetch(
        `/api/entities/${relatedEntityDefinitionId}/options`
      );

      if (!response.ok) {
        throw new Error("Failed to load options");
      }

      const data = await response.json();
      setOptions(data.options || []);
      setTitleField(data.titleField || "id");
    } catch (error) {
      console.error("[RelationSelect] Error loading options:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    if (multiple) {
      const newValue = value.includes(id)
        ? value.filter((v) => v !== id)
        : [...value, id];
      onChange(newValue);
    } else {
      onChange(value.includes(id) ? [] : [id]);
    }
  };

  const selectedOptions = options.filter((opt) => value.includes(opt.id));

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading options...</div>
    );
  }

  return (
    <div className="space-y-2">
      {multiple ? (
        // Множественный выбор
        <div className="space-y-2">
          {/* Выбранные элементы */}
          {selectedOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedOptions.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-md text-sm"
                >
                  <span>{option.title}</span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleToggle(option.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Список опций */}
          <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
            {options.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">
                No options available
              </div>
            ) : (
              <div className="space-y-1">
                {options.map((option) => {
                  const isSelected = value.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => !disabled && handleToggle(option.id)}
                      disabled={disabled}
                      className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {option.title}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Одиночный выбор
        <select
          value={value[0] || ""}
          onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
          required={required}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select...</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
