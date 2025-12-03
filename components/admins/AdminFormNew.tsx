/**
 * Форма создания нового администратора
 *
 * Особенности:
 * - Одно поле email для поиска существующего пользователя
 * - Выбор роли (admin/superAdmin)
 * - Проверка существования пользователя перед созданием
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  findUserByEmail,
  isUserAlreadyAdmin,
  createAdminFromClient,
} from "@/lib/admins/client-service";
import { Loader2, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";

interface AdminFormNewProps {
  projectId: string;
}

type FormState =
  | "idle"
  | "checking"
  | "found"
  | "not_found"
  | "already_admin"
  | "creating"
  | "success"
  | "error";

export function AdminFormNew({ projectId }: AdminFormNewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"projectAdmin" | "projectSuperAdmin">("projectAdmin");
  const [formState, setFormState] = useState<FormState>("idle");
  const [foundUser, setFoundUser] = useState<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectUrl = `/projects/${projectId}/admins`;

  // Мутация для создания админа
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!foundUser) throw new Error("User not found");
      // Создаем админа проекта с указанным projectId
      return createAdminFromClient(foundUser.id, role, projectId);
    },
    onSuccess: (createdAdmin) => {
      // Инвалидируем все запросы списка админов (с любыми параметрами)
      queryClient.invalidateQueries({ 
        queryKey: ["list", projectId, "admin"],
        exact: false, // Инвалидируем все запросы с этим префиксом
      });
      
      setFormState("success");

      // Редирект после небольшой задержки
      setTimeout(() => {
        router.push(redirectUrl);
      }, 1500);
    },
    onError: (error) => {
      setFormState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create administrator"
      );
    },
  });

  // Проверка пользователя по email
  const handleCheckUser = async () => {
    if (!email.trim()) {
      setErrorMessage("Please enter an email address");
      return;
    }

    setFormState("checking");
    setErrorMessage(null);
    setFoundUser(null);

    try {
      // Шаг 1: Ищем пользователя по email
      const user = await findUserByEmail(email);

      if (!user) {
        setFormState("not_found");
        setErrorMessage(
          "User not found. The user must register first before being added as an administrator."
        );
        return;
      }

      // Шаг 2: Проверяем, не является ли уже админом в этом проекте
      const alreadyAdmin = await isUserAlreadyAdmin(user.id, projectId);

      if (alreadyAdmin) {
        setFormState("already_admin");
        setErrorMessage("This user is already an administrator.");
        return;
      }

      // Пользователь найден и не является админом
      setFoundUser(user);
      setFormState("found");
    } catch (error) {
      setFormState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An error occurred while checking the user"
      );
    }
  };

  // Создание админа
  const handleCreateAdmin = () => {
    setFormState("creating");
    createMutation.mutate();
  };

  // Сброс формы
  const handleReset = () => {
    setEmail("");
    setRole("projectAdmin");
    setFormState("idle");
    setFoundUser(null);
    setErrorMessage(null);
  };

  // Отмена и возврат к списку
  const handleCancel = () => {
    router.push(redirectUrl);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Administrator
          </CardTitle>
          <CardDescription>
            Enter the email address of an existing user to add them as a project administrator.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formState !== "idle") {
                    setFormState("idle");
                    setFoundUser(null);
                    setErrorMessage(null);
                  }
                }}
                disabled={
                  formState === "checking" ||
                  formState === "creating" ||
                  formState === "success"
                }
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleCheckUser}
                disabled={
                  formState === "checking" ||
                  formState === "creating" ||
                  formState === "success" ||
                  !email.trim()
                }
              >
                {formState === "checking" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Check User"
                )}
              </Button>
            </div>
          </div>

          {/* Status Messages */}
          {formState === "not_found" && (
            <div className="flex items-start gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">User Not Found</p>
                <p className="text-sm opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}

          {formState === "already_admin" && (
            <div className="flex items-start gap-2 p-4 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 rounded-lg">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Already an Administrator</p>
                <p className="text-sm opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}

          {formState === "error" && (
            <div className="flex items-start gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}

          {formState === "success" && (
            <div className="flex items-start gap-2 p-4 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg">
              <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Administrator Added!</p>
                <p className="text-sm opacity-90">
                  Redirecting to administrators list...
                </p>
              </div>
            </div>
          )}

          {/* Found User Info */}
          {formState === "found" && foundUser && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-4 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg">
                <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">User Found</p>
                  <p className="text-sm opacity-90">
                    {foundUser.firstName || foundUser.lastName
                      ? `${foundUser.firstName || ""} ${
                          foundUser.lastName || ""
                        }`.trim()
                      : foundUser.email}
                  </p>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">Administrator Role</Label>
                <Select
                  value={role}
                  onValueChange={(value) =>
                    setRole(value as "projectAdmin" | "projectSuperAdmin")
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="projectAdmin">Project Admin</SelectItem>
                    <SelectItem value="projectSuperAdmin">Project Super Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {role === "projectAdmin"
                    ? "Project administrator with limited access to universal entities (read-only structure, can edit data)."
                    : "Project super administrator with full access and ability to manage other project administrators."}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {formState === "found" ? (
              <>
                <Button type="button" variant="outline" onClick={handleReset}>
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateAdmin}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Add Administrator
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
