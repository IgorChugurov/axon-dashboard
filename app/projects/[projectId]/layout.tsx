import React, { type ReactNode } from "react";

import { ProjectCookieSetter } from "@/components/providers/ProjectCookieSetter";
import { SDKProviderWrapper } from "@/components/providers/SDKProviderWrapper";

interface ProjectLayoutProps {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { projectId } = await params;

  // console.log(
  //   `[ProjectLayout] Loaded ${entityDefinitions.length} entity definitions with ${fields.length} fields for project ${projectId}`
  // );

  return (
    <>
      {/* Устанавливаем куку текущего проекта */}
      <ProjectCookieSetter projectId={projectId} />
      {/* SDK Provider для Client Components */}
      <SDKProviderWrapper projectId={projectId} enableCache={true}>
        {children}
      </SDKProviderWrapper>
    </>
  );
}
