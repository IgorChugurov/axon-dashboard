/**
 * Yup схема для валидации UI конфигурации
 *
 * Используется для:
 * - Валидации uiConfig JSONB поля при сохранении в БД
 * - Проверки структуры config/*.json файлов
 * - Валидации данных из API
 */

import * as Yup from "yup";

/**
 * Схема для ActionConfig
 */
const actionConfigSchema = Yup.object({
  action: Yup.string()
    .oneOf(["edit", "delete", "view", "clone", "copy"])
    .required(),
  icon: Yup.string().optional(),
  link: Yup.boolean().optional(),
  additionalUrl: Yup.string().optional(),
});

/**
 * Схема для ColumnConfig
 */
const columnConfigSchema = Yup.object({
  field: Yup.string().required(),
  headerName: Yup.string().required(),
  width: Yup.number().min(1).optional(),
  flex: Yup.number().min(1).optional(),
  type: Yup.string()
    .oneOf([
      "text",
      "date",
      "number",
      "boolean",
      "naigateToDetails",
      "openEditPage",
      "actions",
    ])
    .optional(),
  sortable: Yup.boolean().optional(),
  actions: Yup.array().of(actionConfigSchema).optional(),
  additionalUrl: Yup.string().optional(),
});

/**
 * Схема для ListPageConfig
 */
const listPageConfigSchema = Yup.object({
  pageTitle: Yup.string().required(),
  searchPlaceholder: Yup.string().optional(),
  emptyStateTitle: Yup.string().required(),
  emptyStateMessages: Yup.array().of(Yup.string().required()).min(1).required(),
  showCreateButton: Yup.boolean().required(),
  createButtonText: Yup.string().required(),
  showSearch: Yup.boolean().required(),
  enablePagination: Yup.boolean().required(),
  pageSize: Yup.number().min(1).max(100).optional(),
  enableFilters: Yup.boolean().required(),
  searchableFields: Yup.array().of(Yup.string()).optional(),
  columns: Yup.array().of(columnConfigSchema).min(1).required(),
});

/**
 * Схема для FormPageConfig
 */
const formPageConfigSchema = Yup.object({
  createPageTitle: Yup.string().required(),
  editPageTitle: Yup.string().required(),
  pageHeader: Yup.string().optional(),
  createButtonLabel: Yup.string().required(),
  updateButtonLabel: Yup.string().required(),
  cancelButtonLabel: Yup.string().optional(),
});

/**
 * Схема для MessagesConfig
 */
const messagesConfigSchema = Yup.object({
  afterCreate: Yup.string().required(),
  afterUpdate: Yup.string().required(),
  afterDelete: Yup.string().required(),
  errorCreate: Yup.string().optional(),
  errorUpdate: Yup.string().optional(),
  deleteModalTitle: Yup.string().required(),
  deleteModalText: Yup.string().required(),
  deleteModalConfirmWord: Yup.string().optional(),
  deleteModalConfirmText: Yup.string().optional(),
  deleteModalButtonText: Yup.string().required(),
  reloadEvents: Yup.object({
    create: Yup.string().required(),
    update: Yup.string().required(),
    delete: Yup.string().required(),
  }).required(),
});

/**
 * Полная схема для EntityUIConfig
 */
export const entityUIConfigSchema = Yup.object({
  list: listPageConfigSchema.required(),
  form: formPageConfigSchema.required(),
  messages: messagesConfigSchema.required(),
  apiUrl: Yup.string().required(),
  apiUrlAll: Yup.string().optional(),
});

/**
 * Partial схема для uiConfig JSONB поля
 * Все поля опциональны, так как это override defaults
 */
export const partialUIConfigSchema = Yup.object({
  list: Yup.object({
    pageTitle: Yup.string().optional(),
    searchPlaceholder: Yup.string().optional(),
    emptyStateTitle: Yup.string().optional(),
    emptyStateMessages: Yup.array().of(Yup.string()).optional(),
    showCreateButton: Yup.boolean().optional(),
    createButtonText: Yup.string().optional(),
    showSearch: Yup.boolean().optional(),
    enablePagination: Yup.boolean().optional(),
    pageSize: Yup.number().min(1).max(100).optional(),
    enableFilters: Yup.boolean().optional(),
    searchableFields: Yup.array().of(Yup.string()).optional(),
    columns: Yup.array().of(columnConfigSchema).optional(),
  }).optional(),
  form: Yup.object({
    createPageTitle: Yup.string().optional(),
    editPageTitle: Yup.string().optional(),
    pageHeader: Yup.string().optional(),
    createButtonLabel: Yup.string().optional(),
    updateButtonLabel: Yup.string().optional(),
    cancelButtonLabel: Yup.string().optional(),
  }).optional(),
  messages: Yup.object({
    afterCreate: Yup.string().optional(),
    afterUpdate: Yup.string().optional(),
    afterDelete: Yup.string().optional(),
    errorCreate: Yup.string().optional(),
    errorUpdate: Yup.string().optional(),
    deleteModalTitle: Yup.string().optional(),
    deleteModalText: Yup.string().optional(),
    deleteModalConfirmWord: Yup.string().optional(),
    deleteModalConfirmText: Yup.string().optional(),
    deleteModalButtonText: Yup.string().optional(),
    reloadEvents: Yup.object({
      create: Yup.string().optional(),
      update: Yup.string().optional(),
      delete: Yup.string().optional(),
    }).optional(),
  }).optional(),
  apiUrl: Yup.string().optional(),
  apiUrlAll: Yup.string().optional(),
}).optional();

/**
 * Валидация UI конфига
 */
export async function validateUIConfig(
  config: unknown
): Promise<{ valid: boolean; errors?: string[] }> {
  try {
    await entityUIConfigSchema.validate(config, { abortEarly: false });
    return { valid: true };
  } catch (error) {
    if (error instanceof Yup.ValidationError) {
      return {
        valid: false,
        errors: error.errors,
      };
    }
    return {
      valid: false,
      errors: ["Unknown validation error"],
    };
  }
}

/**
 * Валидация partial UI конфига (для uiConfig JSONB поля)
 */
export async function validatePartialUIConfig(
  config: unknown
): Promise<{ valid: boolean; errors?: string[] }> {
  try {
    await partialUIConfigSchema.validate(config, { abortEarly: false });
    return { valid: true };
  } catch (error) {
    if (error instanceof Yup.ValidationError) {
      return {
        valid: false,
        errors: error.errors,
      };
    }
    return {
      valid: false,
      errors: ["Unknown validation error"],
    };
  }
}
