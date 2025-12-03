/**
 * Типы для Admins
 * Администраторы системы с ролями
 * Все админы хранятся в project_admins:
 * - superAdmin имеет project_id = NULL (глобальный доступ)
 * - projectSuperAdmin и projectAdmin имеют project_id = конкретный проект
 */

export type AdminRoleName = "superAdmin" | "projectSuperAdmin" | "projectAdmin";

/**
 * Роль администратора
 */
export interface AdminRole {
  id: string;
  name: AdminRoleName;
  description: string | null;
  createdAt: string;
}

/**
 * Профиль пользователя (из таблицы profiles)
 */
export interface UserProfile {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

/**
 * Администратор с развернутыми данными (JOIN с profiles и admin_roles)
 * Хранится в project_admins:
 * - superAdmin: projectId = null (глобальный доступ)
 * - projectSuperAdmin/projectAdmin: projectId = конкретный проект
 */
export interface Admin {
  id: string;
  userId: string;
  roleId: string;
  projectId: string | null; // NULL для superAdmin, UUID для проектных ролей
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  // Данные из JOIN
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  roleName: AdminRoleName;
  roleDescription: string | null;
}

/**
 * Данные для создания администратора
 */
export interface CreateAdminData {
  email: string;
  roleName: AdminRoleName;
  projectId?: string | null; // Обязательно null для superAdmin, UUID для проектных ролей
}

/**
 * Данные для обновления администратора
 */
export interface UpdateAdminData {
  roleId?: string;
}

/**
 * Ответ API со списком администраторов
 */
export interface AdminsResponse {
  data: Admin[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
