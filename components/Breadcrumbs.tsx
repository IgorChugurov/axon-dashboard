"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Slash } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjects } from "@/components/providers/ProjectsProvider";

export interface BreadcrumbItemData {
  label: string;
  href?: string;
  dropdown?: {
    items: Array<{
      label: string;
      href: string;
    }>;
  };
}

interface BreadcrumbsProps {
  items?: BreadcrumbItemData[];
  // Автоматическое определение из pathname
  pathname?: string;
  // Данные для автоматического построения
  projectId?: string;
  projectName?: string;
  entityDefinitionId?: string;
  entityDefinitionName?: string;
  instanceId?: string;
  instanceName?: string;
  fieldId?: string;
  fieldName?: string;
}

export function Breadcrumbs({
  items,
  pathname: pathnameProp,
  projectId,
  projectName: projectNameProp,
  entityDefinitionId,
  entityDefinitionName,
  instanceId,
  instanceName,
  fieldId,
  fieldName,
}: BreadcrumbsProps) {
  const pathnameFromRouter = usePathname();
  const pathname = pathnameProp || pathnameFromRouter;
  const { getProjectName } = useProjects();

  // Получаем имя проекта из контекста, если не передано явно
  const projectName = projectNameProp || (projectId ? getProjectName(projectId) : undefined);

  // Если переданы items, используем их
  if (items) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          {items.map((item, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && (
                <BreadcrumbSeparator>
                  <Slash className="h-4 w-4" />
                </BreadcrumbSeparator>
              )}
              <BreadcrumbItem>
                {item.dropdown ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5">
                      {item.label}
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {item.dropdown.items.map((dropdownItem, idx) => (
                        <DropdownMenuItem key={idx} asChild>
                          <Link href={dropdownItem.href}>
                            {dropdownItem.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : item.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Автоматическое построение из pathname
  const breadcrumbItems: BreadcrumbItemData[] = [];

  // Home
  if (pathname === "/") {
    breadcrumbItems.push({ label: "Home" });
    return renderBreadcrumbs(breadcrumbItems);
  }

  // Projects
  breadcrumbItems.push({
    label: "Home",
    href: "/",
  });

  if (pathname === "/projects") {
    breadcrumbItems.push({ label: "Projects" });
    return renderBreadcrumbs(breadcrumbItems);
  }

  // Project
  if (pathname.startsWith("/projects/") && projectId) {
    breadcrumbItems.push({
      label: "Projects",
      href: "/projects",
    });

    // Project page
    if (pathname === `/projects/${projectId}`) {
      breadcrumbItems.push({
        label: projectName || "Project",
      });
      return renderBreadcrumbs(breadcrumbItems);
    }

    // Project with dropdown
    const projectDropdown: BreadcrumbItemData = {
      label: projectName || "Project",
      dropdown: {
        items: [
          {
            label: "Entity Definitions",
            href: `/projects/${projectId}`,
          },
          {
            label: "Settings",
            href: `/projects/${projectId}/settings`,
          },
        ],
      },
    };

    // Settings
    if (pathname === `/projects/${projectId}/settings`) {
      breadcrumbItems.push(projectDropdown);
      breadcrumbItems.push({ label: "Settings" });
      return renderBreadcrumbs(breadcrumbItems);
    }

    // Environment routes
    if (pathname.includes("/settings/environment/")) {
      breadcrumbItems.push(projectDropdown);
      breadcrumbItems.push({
        label: "Settings",
        href: `/projects/${projectId}/settings`,
      });

      // New Environment
      if (pathname === `/projects/${projectId}/settings/environment/new`) {
        breadcrumbItems.push({ label: "New Environment" });
        return renderBreadcrumbs(breadcrumbItems);
      }

      // Edit Environment
      const environmentMatch = pathname.match(
        /\/settings\/environment\/([^/]+)$/
      );
      if (environmentMatch) {
        const environmentId = environmentMatch[1];
        breadcrumbItems.push({
          label: "Environments",
          href: `/projects/${projectId}/settings?tab=environments`,
        });
        breadcrumbItems.push({ label: "Edit Environment" });
        return renderBreadcrumbs(breadcrumbItems);
      }
    }

    // Entity Definition routes
    if (pathname.includes("/entity-definition/")) {
      breadcrumbItems.push(projectDropdown);

      // New Entity Definition
      if (pathname === `/projects/${projectId}/entity-definition/new`) {
        breadcrumbItems.push({ label: "New Entity Definition" });
        return renderBreadcrumbs(breadcrumbItems);
      }

      // Entity Definition with ID
      if (entityDefinitionId) {
        const entityDefinitionDropdown: BreadcrumbItemData = {
          label: entityDefinitionName || "Entity Definition",
          dropdown: {
            items: [
              {
                label: "View Instances",
                href: `/projects/${projectId}/entity-instances/${entityDefinitionId}`,
              },
              {
                label: "Edit Definition",
                href: `/projects/${projectId}/entity-definition/${entityDefinitionId}/edit`,
              },
              {
                label: "Manage Fields",
                href: `/projects/${projectId}/entity-definition/${entityDefinitionId}/fields`,
              },
            ],
          },
        };

        // Edit Entity Definition
        if (pathname === `/projects/${projectId}/entity-definition/${entityDefinitionId}/edit`) {
          breadcrumbItems.push(entityDefinitionDropdown);
          breadcrumbItems.push({ label: "Edit" });
          return renderBreadcrumbs(breadcrumbItems);
        }

        // Fields
        if (pathname.includes("/fields")) {
          breadcrumbItems.push(entityDefinitionDropdown);

          // Fields list
          if (pathname === `/projects/${projectId}/entity-definition/${entityDefinitionId}/fields`) {
            breadcrumbItems.push({ label: "Fields" });
            return renderBreadcrumbs(breadcrumbItems);
          }

          // New Field
          if (pathname === `/projects/${projectId}/entity-definition/${entityDefinitionId}/fields/new`) {
            breadcrumbItems.push({ label: "Fields", href: `/projects/${projectId}/entity-definition/${entityDefinitionId}/fields` });
            breadcrumbItems.push({ label: "New Field" });
            return renderBreadcrumbs(breadcrumbItems);
          }

          // Edit Field
          if (fieldId && pathname.includes(`/fields/${fieldId}/edit`)) {
            breadcrumbItems.push({ label: "Fields", href: `/projects/${projectId}/entity-definition/${entityDefinitionId}/fields` });
            breadcrumbItems.push({ label: fieldName || "Edit Field" });
            return renderBreadcrumbs(breadcrumbItems);
          }
        }
      }
    }

    // Entity Instances routes
    if (pathname.includes("/entity-instances/") && entityDefinitionId) {
      breadcrumbItems.push(projectDropdown);

      const entityDefinitionDropdown: BreadcrumbItemData = {
        label: entityDefinitionName || "Entity Definition",
        dropdown: {
          items: [
            {
              label: "View Instances",
              href: `/projects/${projectId}/entity-instances/${entityDefinitionId}`,
            },
            {
              label: "Edit Definition",
              href: `/projects/${projectId}/entity-definition/${entityDefinitionId}/edit`,
            },
            {
              label: "Manage Fields",
              href: `/projects/${projectId}/entity-definition/${entityDefinitionId}/fields`,
            },
          ],
        },
      };

      // Instances list
      if (pathname === `/projects/${projectId}/entity-instances/${entityDefinitionId}`) {
        breadcrumbItems.push(entityDefinitionDropdown);
        breadcrumbItems.push({ label: "Instances" });
        return renderBreadcrumbs(breadcrumbItems);
      }

      // New Instance
      if (pathname === `/projects/${projectId}/entity-instances/${entityDefinitionId}/new`) {
        breadcrumbItems.push(entityDefinitionDropdown);
        breadcrumbItems.push({ 
          label: "Instances", 
          href: `/projects/${projectId}/entity-instances/${entityDefinitionId}` 
        });
        breadcrumbItems.push({ label: "New" });
        return renderBreadcrumbs(breadcrumbItems);
      }

      // Instance detail/edit
      if (instanceId) {
        breadcrumbItems.push(entityDefinitionDropdown);
        breadcrumbItems.push({ 
          label: "Instances", 
          href: `/projects/${projectId}/entity-instances/${entityDefinitionId}` 
        });

        // Edit Instance (view роут удален, только edit)
        if (pathname === `/projects/${projectId}/entity-instances/${entityDefinitionId}/${instanceId}/edit`) {
          breadcrumbItems.push({ 
            label: instanceName || "Instance"
          });
          breadcrumbItems.push({ label: "Edit" });
          return renderBreadcrumbs(breadcrumbItems);
        }
      }
    }
  }

  // Fallback - просто показываем путь
  const parts = pathname.split("/").filter(Boolean);
  const fallbackItems: BreadcrumbItemData[] = [
    { label: "Home", href: "/" },
    ...parts.map((part, index) => {
      const href = "/" + parts.slice(0, index + 1).join("/");
      return {
        label: part.charAt(0).toUpperCase() + part.slice(1),
        href: index < parts.length - 1 ? href : undefined,
      };
    }),
  ];

  return renderBreadcrumbs(fallbackItems);
}

function renderBreadcrumbs(items: BreadcrumbItemData[]) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <BreadcrumbSeparator>
                <Slash className="h-4 w-4" />
              </BreadcrumbSeparator>
            )}
            <BreadcrumbItem>
              {item.dropdown ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5">
                    {item.label}
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {item.dropdown.items.map((dropdownItem, idx) => (
                      <DropdownMenuItem key={idx} asChild>
                        <Link href={dropdownItem.href}>
                          {dropdownItem.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : item.href ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

