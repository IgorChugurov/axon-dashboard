/**
 * Компонент выбора тегов (множественный выбор)
 */

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import type { Tag } from "@/lib/entities/tags/types";

interface TagsSelectProps {
  value: string[];
  onChange: (tagIds: string[]) => void;
}

export function TagsSelect({ value, onChange }: TagsSelectProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("name");

    if (!error && data) {
      setAllTags(data as Tag[]);
    }
    setLoading(false);
  };

  const selectedTags = allTags.filter((tag) => value.includes(tag.id));
  const availableTags = allTags.filter((tag) => !value.includes(tag.id));

  const handleAdd = (tagId: string) => {
    onChange([...value, tagId]);
  };

  const handleRemove = (tagId: string) => {
    onChange(value.filter((id) => id !== tagId));
  };

  return (
    <div className="space-y-3">
      <Label>Tags</Label>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-sm"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
              }}
            >
              <span>{tag.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(tag.id)}
                className="hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Available Tags */}
      {availableTags.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Click to add tags:
          </p>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleAdd(tag.id)}
                className="px-3 py-1 rounded-full text-sm border hover:opacity-70 transition"
                style={{
                  borderColor: tag.color,
                  color: tag.color,
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading tags...</p>}
      
      {!loading && allTags.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No tags available. Create some tags first.
        </p>
      )}
    </div>
  );
}

