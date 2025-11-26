"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Slash, MoreHorizontal } from "lucide-react";
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
import { useBreadcrumbsData } from "@/lib/breadcrumbs";
import { useIsMobile } from "@/hooks/use-mobile";
import * as React from "react";

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
}

/**
 * URL-driven Breadcrumbs component
 * 
 * Автоматически строит breadcrumbs на основе текущего URL.
 * Имена сущностей получает из:
 * - ProjectsProvider (для projectName)
 * - Breadcrumbs cache (для entityDefinitionName, fieldName, environmentName)
 * 
 * Можно также передать готовые items для полного контроля.
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const pathname = usePathname();
  const { getProjectName } = useProjects();
  const isMobile = useIsMobile();

  // Определяем, является ли экран планшетом или меньше (меньше 1024px)
  const [isTabletOrMobile, setIsTabletOrMobile] = React.useState<boolean>(false);

  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsTabletOrMobile(window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Извлекаем IDs из pathname
  const projectIdMatch = pathname.match(/^\/projects\/([^/]+)/);
  const projectId = projectIdMatch ? projectIdMatch[1] : undefined;

  // EntityDefinition ID (из /entity-definition/ или /entity-instances/)
  const entityDefinitionIdMatch =
    pathname.match(/\/entity-definition\/([^/]+)/) ||
    pathname.match(/\/entity-instances\/([^/]+)/);
  const entityDefinitionIdRaw = entityDefinitionIdMatch
    ? entityDefinitionIdMatch[1]
    : undefined;
  const entityDefinitionId =
    entityDefinitionIdRaw && !["new", "edit", "fields"].includes(entityDefinitionIdRaw)
      ? entityDefinitionIdRaw
      : undefined;

  // Field ID
  const fieldIdMatch = pathname.match(/\/fields\/([^/]+)/);
  const fieldIdRaw = fieldIdMatch ? fieldIdMatch[1] : undefined;
  const fieldId =
    fieldIdRaw && !["new", "edit"].includes(fieldIdRaw)
      ? fieldIdRaw
      : undefined;

  // Environment ID
  const environmentIdMatch = pathname.match(/\/environments\/([^/]+)/);
  const environmentIdRaw = environmentIdMatch ? environmentIdMatch[1] : undefined;
  const environmentId =
    environmentIdRaw && !["new", "edit"].includes(environmentIdRaw)
      ? environmentIdRaw
      : undefined;

  // Instance ID (для entity-instances)
  const instanceIdMatch = pathname.match(/\/entity-instances\/[^/]+\/([^/]+)/);
  const instanceIdRaw = instanceIdMatch ? instanceIdMatch[1] : undefined;
  const instanceId =
    instanceIdRaw && !["new", "edit"].includes(instanceIdRaw)
      ? instanceIdRaw
      : undefined;

  // Получаем имена из кеша
  const { entityDefinitionName, fieldName, environmentName } = useBreadcrumbsData({
    entityDefinitionId,
    fieldId,
    environmentId,
  });

  // Имя проекта из ProjectsProvider (всегда доступно)
  const projectName = projectId ? getProjectName(projectId) : undefined;

  // Если переданы items, используем их
  if (items) {
    return renderBreadcrumbs(items, isMobile, isTabletOrMobile);
  }

  // Автоматическое построение из pathname
  const breadcrumbItems: BreadcrumbItemData[] = [];

  // Home
  if (pathname === "/") {
    breadcrumbItems.push({ label: "Home" });
    return renderBreadcrumbs(breadcrumbItems, isMobile, isTabletOrMobile);
  }

  // Projects
  breadcrumbItems.push({
    label: "Home",
    href: "/",
  });

  if (pathname === "/projects") {
    breadcrumbItems.push({ label: "Projects" });
    return renderBreadcrumbs(breadcrumbItems, isMobile, isTabletOrMobile);
  }

  // Project routes
  if (pathname.startsWith("/projects/") && projectId) {
    breadcrumbItems.push({
      label: "Projects",
      href: "/projects",
    });

    // Project page (main - entity definitions list)
    if (pathname === `/projects/${projectId}`) {
      breadcrumbItems.push({
        label: projectName || "Project",
      });
      return renderBreadcrumbs(breadcrumbItems, isMobile, isTabletOrMobile);
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

    // Settings dropdown
    const settingsDropdown: BreadcrumbItemData = {
      label: "Settings",
      dropdown: {
        items: [
          {
            label: "Project Settings",
            href: `/projects/${projectId}/settings`,
          },
          {
            label: "Environments",
            href: `/projects/${projectId}/settings/environments`,
          },
        ],
      },
    };

    // Settings page
    if (pathname === `/projects/${projectId}/settings`) {
      breadcrumbItems.push(projectDropdown);
      breadcrumbItems.push(settingsDropdown);
      breadcrumbItems.push({ label: "Project Settings" });
      return renderBreadcrumbs(breadcrumbItems, isMobile, isTabletOrMobile);
    }

    // Environments routes
    if (pathname.includes("/settings/environments")) {
      breadcrumbItems.push(projectDropdown);
      breadcrumbItems.push(settingsDropdown);

      // Environments list page
      if (pathname === `/projects/${projectId}/settings/environments`) {
        breadcrumbItems.push({ label: "Environments" });
        return renderBreadcrumbs(breadcrumbItems, isMobile, isTabletOrMobile);
      }

      // New Environment
      if (pathname === `/projects/${projectId}/settings/environments/new`) {
        breadcrumbItems.push({
          label: "Environments",
          href: `/projects/${projectId}/settings/environments`,
        });
        breadcrumbItems.push({ label: "New" });
        return renderBreadcrumbs(breadcrumbItems, isMobile, isTabletOrMobile);
      }

      // Edit Environment
      const environmentMatch = pathname.match(
        /\/settings\/environments\/([^/]+)$/
      );
      if (environmentMatch) {
        breadcrumbItems.push({
          label: "Environments",
          href: `/projects/${projectId}/settings/environments`,
        });
        breadcrumbItems.push({ label: environmentName || "Edit" });
        return renderBreadcrumbs(breadcrumbItems, isMobile, isTabletOrMobile);
      }
    }

    // Entity Definition routes
    if (pathname.includes("/entity-definition/")) {
      breadcrumbItems.push(projectDropdown);

      // New Entity Definition
      if (pathname === `/projects/${projectId}/entity-definition/new`) {
        breadcrumbItems.push({ label: "New Entity Definition" });
        return renderBreadcrumbs(breadcrumbItems, isMobile, isTabletOrMobile);
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
        if (
          pathname ===
          `/projects/${projectId}/entity-definition/${entityDefinitionId}/edit`
        ) {
          breadcrumbItems.push(entityDefinitionDropdown);
          breadcrumbItems.push({ label: "Edit" });
          return renderBreadcrumbs(breadcrumbItems, isMobile, isTabletOrMobile);
        }

        // Fields
        if (pathname.includes("/fields")) {
          breadcrumbItems.push(entityDefinitionDropdown);

          // Fields list
          if (
            pathname ===
            `/projects/${projectId}/entity-definition/${entityDefinitionId}/fields`
          ) {
            breadcrumbItems.push({ label: "Fields" });
            return renderBreadcrumbs(breadcrumbItems, isMobile, isTabletOrMobile);
          }

          // New Field
          if (
            pathname ===
            `/projects/${projectId}/entity-definition/${entityDefinitionId}/fields/new`
          ) {
            breadcrumbItems.push({
              label: "Fields",
              href: `/projects/${projectId}/entity-definition/${entityDefinitionId}/fields`,
            });
            breadcrumbItems.push({ label: "New" });
            return renderBreadcrumbs(breadcrumbItems, isMobile, isTabletOrMobile);
          }

          // Edit Field
          if (fieldId && pathname.includes(`/fields/${fieldId}/edit`)) {
            breadcrumbItems.push({
              label: "Fields",
              href: `/projects/${projectId}/entity-definition/${entityDefinitionId}/fields`,
            });
            breadcrumbItems.push({ label: fieldName || "Edit" });
            return renderBreadcrumbs(breadcrumbItems, isMobile, isTabletOrMobile);
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
      if (
        pathname === `/projects/${projectId}/entity-instances/${entityDefinitionId}`
      ) {
        breadcrumbItems.push(entityDefinitionDropdown);
        breadcrumbItems.push({ label: "Instances" });
        return renderBreadcrumbs(breadcrumbItems, isMobile, isTabletOrMobile);
      }

      // New Instance
      if (
        pathname ===
        `/projects/${projectId}/entity-instances/${entityDefinitionId}/new`
      ) {
        breadcrumbItems.push(entityDefinitionDropdown);
        breadcrumbItems.push({
          label: "Instances",
          href: `/projects/${projectId}/entity-instances/${entityDefinitionId}`,
        });
        breadcrumbItems.push({ label: "New" });
        return renderBreadcrumbs(breadcrumbItems, isMobile, isTabletOrMobile);
      }

      // Edit Instance
      if (
        instanceId &&
        pathname ===
          `/projects/${projectId}/entity-instances/${entityDefinitionId}/${instanceId}/edit`
      ) {
        breadcrumbItems.push(entityDefinitionDropdown);
        breadcrumbItems.push({
          label: "Instances",
          href: `/projects/${projectId}/entity-instances/${entityDefinitionId}`,
        });
        breadcrumbItems.push({ label: "Edit" });
        return renderBreadcrumbs(breadcrumbItems, isMobile, isTabletOrMobile);
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

  return renderBreadcrumbs(fallbackItems, isMobile, isTabletOrMobile);
}

function renderBreadcrumbs(
  items: BreadcrumbItemData[],
  isMobile: boolean,
  isTabletOrMobile: boolean
) {
  // Если элементов больше 3 И экран планшет или меньше, показываем только первый и последний, промежуточные в dropdown
  if (items.length > 3 && isTabletOrMobile) {
    const firstItem = items[0];
    const middleItems = items.slice(1, -1);
    const lastItem = items[items.length - 1];

    return (
      <Breadcrumb>
        <BreadcrumbList>
          {/* Первый элемент */}
          <div className="flex items-center">
            <BreadcrumbItem>
              {firstItem.dropdown ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5">
                    {firstItem.label}
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {firstItem.dropdown.items.map((dropdownItem, idx) => (
                      <DropdownMenuItem key={idx} asChild>
                        <Link href={dropdownItem.href}>{dropdownItem.label}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : firstItem.href ? (
                <BreadcrumbLink asChild>
                  <Link href={firstItem.href}>{firstItem.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{firstItem.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </div>

          {/* Separator */}
          <BreadcrumbSeparator>
            <Slash className="h-4 w-4" />
          </BreadcrumbSeparator>

          {/* Dropdown для промежуточных элементов */}
          <div className="flex items-center">
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 [&_svg]:pointer-events-none [&_svg]:shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-w-xs">
                  {middleItems.flatMap((item, idx) => {
                    // Если у элемента есть dropdown, показываем все его элементы
                    if (item.dropdown) {
                      return item.dropdown.items.map((dropdownItem, dropdownIdx) => (
                        <DropdownMenuItem key={`${idx}-${dropdownIdx}`} asChild>
                          <Link href={dropdownItem.href} className="block">
                            {dropdownItem.label}
                          </Link>
                        </DropdownMenuItem>
                      ));
                    }
                    // Если у элемента есть href, показываем как ссылку
                    if (item.href) {
                      return (
                        <DropdownMenuItem key={idx} asChild>
                          <Link href={item.href} className="block">
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    }
                    // Иначе просто текст
                    return (
                      <DropdownMenuItem key={idx} disabled>
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
          </div>

          {/* Separator */}
          <BreadcrumbSeparator>
            <Slash className="h-4 w-4" />
          </BreadcrumbSeparator>

          {/* Последний элемент */}
          <div className="flex items-center">
            <BreadcrumbItem>
              {lastItem.dropdown ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5">
                    {lastItem.label}
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {lastItem.dropdown.items.map((dropdownItem, idx) => (
                      <DropdownMenuItem key={idx} asChild>
                        <Link href={dropdownItem.href}>{dropdownItem.label}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : lastItem.href ? (
                <BreadcrumbLink asChild>
                  <Link href={lastItem.href}>{lastItem.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{lastItem.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </div>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Если элементов 3 или меньше, показываем все как обычно
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
                        <Link href={dropdownItem.href}>{dropdownItem.label}</Link>
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
