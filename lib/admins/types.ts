/**
 * Типы для Admins
 * Администраторы системы с ролями
 */

export type AdminRoleName = "admin" | "superAdmin";

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
 */
export interface Admin {
  id: string;
  userId: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;
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
  roleId: string;
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

