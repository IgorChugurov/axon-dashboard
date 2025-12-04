/**
 * Типы для UI конфигурации сущностей
 * Единый источник истины для UI типов в SDK
 *
 * Эти типы используются для автоматической генерации:
 * - Страниц списков (list pages)
 * - Страниц редактирования/создания (form pages)
 * - UI элементов (кнопки, сообщения, модалки)
 */

// =====================================================
// UI Configuration для страницы списка
// =====================================================

export interface ListPageConfig {
  // Заголовки и текст
  pageTitle: string; // "Projects", "Blocks"
  searchPlaceholder?: string; // "Search for projects..."
  emptyStateTitle: string; // "You have no projects"
  emptyStateMessages: string[]; // ["Projects you create...", "Add a project..."]

  // Кнопки
  showCreateButton: boolean; // Показывать кнопку создания
  createButtonText: string; // "New project", "Create block"

  // Функциональность
  showSearch: boolean; // Показывать поиск
  enablePagination: boolean; // Пагинация или все данные сразу
  pageSize?: number; // Размер страницы (default: 20)

  // Фильтры (структура для будущей реализации)
  enableFilters: boolean; // Показывать фильтры

  // Поиск
  searchableFields?: string[]; // Поля для поиска (автоматически генерируется из полей с searchable: true)

  // Колонки таблицы
  columns: ColumnConfig[];
}

export interface ColumnConfig {
  field: string; // Имя поля
  headerName: string; // Заголовок колонки
  width?: number; // Фиксированная ширина
  flex?: number; // Flex ширина
  type?:
    | "text"
    | "date"
    | "number"
    | "boolean"
    | "naigateToDetails"
    | "openEditPage"
    | "actions"
    | "relation"; // Для полей-связей
  sortable?: boolean; // Сортировка (для будущей реализации)

  // Для relation колонок - тип связи
  relationDbType?: "manyToOne" | "oneToOne" | "manyToMany" | "oneToMany";

  // Для actions колонки
  actions?: ActionConfig[];

  // Дополнительный URL для навигации
  additionalUrl?: string; // "/fields", "/entities"
}

export interface ActionConfig {
  action: "edit" | "delete" | "view" | "clone" | "copy" | "link";
  icon?: string; // "settings", "trash", "list", "edit", etc.
  link?: boolean; // Использовать Link вместо модалки
  additionalUrl?: string; // Дополнительный URL (/fields)
  label?: string; // Label for the action

  /**
   * Условие для скрытия action на основе данных строки
   * Если значение поля `field` равно `value`, action скрывается
   */
  hideIf?: {
    field: string; // Имя поля в данных строки
    value: string | number | boolean; // Значение при котором action скрывается
  };
}

// =====================================================
// UI Configuration для страницы редактирования
// =====================================================

export interface FormPageConfig {
  // Заголовки
  createPageTitle: string; // "Create new project"
  editPageTitle: string; // "Edit project"
  pageHeader?: string; // Дополнительный заголовок

  // Кнопки
  createButtonLabel: string; // "Create", "Save"
  updateButtonLabel: string; // "Update", "Save changes"
  cancelButtonLabel?: string; // "Cancel"

  // Заголовки секций формы (0-3)
  sectionTitles?: {
    0?: string; // "General Information" (default)
    1?: string; // "Section 1" (default)
    2?: string; // "Section 2" (default)
    3?: string; // "Section 3" (default)
  };
}

// =====================================================
// Сообщения и уведомления
// =====================================================

export interface MessagesConfig {
  // Успешные действия
  afterCreate: string; // "Project created successfully!"
  afterUpdate: string; // "Project updated!"
  afterDelete: string; // "Project deleted!"

  // Ошибки
  errorCreate?: string; // "Failed to create project"
  errorUpdate?: string; // "Failed to update project"

  // Модалка удаления
  deleteModalTitle: string; // "Confirm deleting project"
  deleteModalText: string; // "Are you sure you want to delete {itemName}?" - supports {itemName} placeholder
  deleteModalConfirmWord?: string; // "DELETE" - word user must type to confirm
  deleteModalConfirmText?: string; // "Type DELETE to confirm" - label for confirm input
  deleteModalButtonText: string; // "Delete"

  // События для перезагрузки данных
  reloadEvents: {
    create: string; // "reloadProjects"
    update: string; // "reloadProjects"
    delete: string; // "reloadProjects"
  };
}

// =====================================================
// Полная UI конфигурация сущности
// =====================================================

export interface EntityUIConfig {
  list: ListPageConfig;
  form: FormPageConfig;
  messages: MessagesConfig;

  // Метаданные для API
  apiUrl: string; // "/api/projects" (генерируется автоматически из tableName)
  apiUrlAll?: string; // "/api/projects/all" для получения всех данных
}

// =====================================================
// Partial типы для переопределения defaults
// =====================================================

/**
 * Partial UI конфиг для хранения в БД (uiConfig JSONB поле)
 * Позволяет переопределить только нужные значения
 */
export type PartialUIConfig = {
  list?: Partial<Omit<ListPageConfig, "columns">> & {
    columns?: Partial<ColumnConfig>[];
  };
  form?: Partial<FormPageConfig>;
  messages?: Partial<MessagesConfig>;
  apiUrl?: string;
  apiUrlAll?: string;
};
