"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { subscribeToGlobalLoader } from "@/lib/global-loader/store";

export function GlobalLoader() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    return subscribeToGlobalLoader(setCount);
  }, []);

  if (count === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-lg border bg-card px-6 py-4 shadow-lg">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm font-medium text-muted-foreground">
          Processing...
        </span>
      </div>
    </div>
  );
}

