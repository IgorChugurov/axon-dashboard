"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useRole } from "@/hooks/use-role";
import { useProjectsWithRoles } from "@/hooks/use-projects-with-roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function formatRole(role: string | null | undefined): string {
  if (!role) return "No role";

  const roleMap: Record<string, string> = {
    superAdmin: "Super Admin",
    projectSuperAdmin: "Project Super Admin",
    projectAdmin: "Project Admin",
    user: "User",
  };

  return roleMap[role] || role;
}

export default function ProfilePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { displayRole, isLoading: isRoleLoading, globalRole } = useRole();
  const { projects, isLoading: isProjectsLoading } = useProjectsWithRoles();

  if (isAuthLoading || isRoleLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleToDisplay = displayRole || "user";
  const projectsWithRoles = projects.filter((p) => p.role);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div
              id="email"
              className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs md:text-sm items-center"
            >
              {user.email || "—"}
            </div>
          </div>

          {globalRole === "superAdmin" && (
            <div className="space-y-2">
              <Label htmlFor="globalRole" className="text-sm font-medium">
                Global Role
              </Label>
              <div
                id="globalRole"
                className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs md:text-sm items-center"
              >
                {formatRole(globalRole)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {globalRole !== "superAdmin" && (
        <Card>
          <CardHeader>
            <CardTitle>Project Roles</CardTitle>
          </CardHeader>
          <CardContent>
            {isProjectsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : projectsWithRoles.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                You don&apos;t have any project roles assigned.
              </p>
            ) : (
              <div className="space-y-3">
                {projectsWithRoles.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between rounded-md border border-input bg-background p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {project.name}
                      </div>
                      {project.description && (
                        <div className="text-xs text-muted-foreground truncate mt-1">
                          {project.description}
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {formatRole(project.role)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
