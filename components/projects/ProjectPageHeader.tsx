"use client";

import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import Link from "next/link";

interface ProjectPageHeaderProps {
  projectId: string;
}

export function ProjectPageHeader({ projectId }: ProjectPageHeaderProps) {
  return (
    <div className="mb-4 flex justify-end">
      <Button asChild variant="outline">
        <Link href={`/projects/${projectId}/admins`}>
          <Users className="mr-2 h-4 w-4" />
          Administrators
        </Link>
      </Button>
    </div>
  );
}

