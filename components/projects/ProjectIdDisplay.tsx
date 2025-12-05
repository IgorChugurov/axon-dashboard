"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ProjectIdDisplayProps {
  projectId: string;
}

export function ProjectIdDisplay({ projectId }: ProjectIdDisplayProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(projectId);
      setCopied(true);
      toast({
        variant: "success",
        title: "Copied!",
        description: "Project ID has been copied to clipboard",
      });
      // Сбрасываем состояние через 2 секунды
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy project ID to clipboard",
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Project ID:</span>
      <code className="px-2 py-1 text-sm font-mono bg-muted rounded border">
        {projectId}
      </code>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleCopy}
        className="h-7 w-7"
        title="Copy project ID"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

