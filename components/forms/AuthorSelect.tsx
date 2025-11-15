/**
 * Компонент выбора автора
 */

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import type { Author } from "@/lib/entities/authors/types";

interface AuthorSelectProps {
  value: string;
  onChange: (authorId: string) => void;
  required?: boolean;
}

export function AuthorSelect({ value, onChange, required = false }: AuthorSelectProps) {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuthors();
  }, []);

  const loadAuthors = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("authors")
      .select("id, name, email")
      .order("name");

    if (!error && data) {
      setAuthors(data as Author[]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="author">
        Author {required && <span className="text-destructive">*</span>}
      </Label>
      <select
        id="author"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={loading}
        className="w-full px-3 py-2 border rounded-md bg-background"
      >
        <option value="">Select author...</option>
        {authors.map((author) => (
          <option key={author.id} value={author.id}>
            {author.name} {author.email && `(${author.email})`}
          </option>
        ))}
      </select>
    </div>
  );
}

