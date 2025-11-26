"use client";

import Link from "next/link";
import { Tag } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  useEntityDefinitions,
  EntityDefinitionsContext,
} from "@/components/providers/EntityDefinitionsProvider";
import { usePathname } from "next/navigation";
import { useContext } from "react";
import type { EntityDefinition } from "@/lib/universal-entity/types";

export function EntitiesSidebarSection() {
  const { entityDefinitions, projectId } = useEntityDefinitions();
  const pathname = usePathname();

  if (entityDefinitions.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Entities</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {entityDefinitions.map((entity) => {
            const href = `/projects/${projectId}/${entity.id}`;
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <SidebarMenuItem key={entity.id}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link href={href}>
                    <Tag />
                    <span>{entity.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// Wrapper компонент, который проверяет доступность Context
export function EntitiesSidebarSectionWrapper({
  entities,
}: {
  entities: EntityDefinition[];
}) {
  const context = useContext(EntityDefinitionsContext);

  // Если Context доступен, используем его
  if (context) {
    return <EntitiesSidebarSection />;
  }

  // Иначе используем props
  if (entities.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Entities</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {entities.map((entity) => (
            <SidebarMenuItem key={entity.id}>
              <SidebarMenuButton asChild>
                <Link href={`/${entity.id}`}>
                  <Tag />
                  <span>{entity.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

