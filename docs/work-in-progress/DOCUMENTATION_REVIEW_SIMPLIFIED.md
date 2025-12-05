# Ревизия документации - Упрощенная классификация

**Дата:** 2025-01-30  
**Статус:** 🔄 Пересмотрено - только важные документы

---

## 🎯 Принцип: Оставить только то, что нужно разработчикам

**Оставить:**
- ✅ Гайды (GUIDE) - как что-то делать
- ✅ Архитектура (ARCHITECTURE, FLOW) - как работает система
- ✅ Структуры (STRUCTURE) - описание структур
- ✅ Финальные документы (FINAL) - актуальные финальные документы
- ✅ Важные миграции (только актуальные инструкции)
- ✅ Roadmap (только актуальный)
- ✅ Компоненты (описание UI компонентов)

**Архивировать/удалить:**
- ❌ Все PLANS (кроме roadmap)
- ❌ Все REPORTS (временные отчеты)
- ❌ Все SUMMARIES (временные сводки)
- ❌ Все ANALYSES (временные анализы)
- ❌ Все STATUS (временные статусы, кроме актуального PROJECT_STATUS)
- ❌ Все FIX (временные исправления)
- ❌ Старые MIGRATION документы (кроме актуальных инструкций)

---

## ✅ Важные документы (оставить) - ~25-30 файлов

### 🚀 Getting Started (3 файла)
| Файл | Текущая локация | Новая локация |
|------|----------------|---------------|
| `QUICK_START.md` | `guides/` | `getting-started/QUICK_START.md` |
| `QUICK_START_ENTITY.md` | `implementation/` | `getting-started/QUICK_START_ENTITY.md` |
| `SUPABASE_SETUP_GUIDE.md` | `implementation/` | `getting-started/SUPABASE_SETUP.md` |

### 🏗️ Архитектура (5 файлов)
| Файл | Текущая локация | Новая локация |
|------|----------------|---------------|
| `CURRENT_AUTH_FLOW.md` | `architecture/` | `architecture/auth/CURRENT_AUTH_FLOW.md` |
| `DEVELOPMENT_GUIDE.md` | `architecture/` | `architecture/DEVELOPMENT_GUIDE.md` |
| `HYBRID_ARCHITECTURE_GUIDE.md` | `implementation/` | `architecture/HYBRID_ARCHITECTURE.md` |
| `ROLES_AND_PERMISSIONS.md` | `docs/` | `architecture/auth/ROLES_AND_PERMISSIONS.md` |
| `MIDDLEWARE_EXPLANATION.md` | `implementation/` | `architecture/MIDDLEWARE.md` |

### 📐 Структуры (5 файлов)
| Файл | Текущая локация | Новая локация |
|------|----------------|---------------|
| `CONFIG_FILE_STRUCTURE.md` | `docs/` | `structure/CONFIG_FILES.md` |
| `FORMS_STRUCTURE.md` | `docs/` | `structure/FORMS_STRUCTURE.md` |
| `LISTS_STRUCTURE.md` | `docs/` | `structure/LISTS_STRUCTURE.md` |
| `NAVIGATION_EXPLANATION.md` | `docs/` | `structure/NAVIGATION.md` |
| `ROUTING_ANALYSIS.md` + `ROUTING_RESTRUCTURE.md` | `docs/` | `structure/ROUTING.md` (объединить) |

### 🔄 Flows (4 файла)
| Файл | Текущая локация | Новая локация |
|------|----------------|---------------|
| `TOKEN_FLOW_SUMMARY.md` + `TOKEN_REFRESH_FLOW.md` | `flows/`, `implementation/` | `flows/TOKEN_FLOW.md` (объединить) |
| `REQUEST_FLOW_EXPLANATION.md` | `flows/` | `flows/REQUEST_FLOW.md` |
| `FLOW_DIAGRAM.md` | `flows/` | `flows/DATA_FLOW.md` |
| `PASSWORD_RESET_FLOW.md` | `implementation/` | `flows/PASSWORD_RESET_FLOW.md` |

### 📖 Guides (7 файлов)
| Файл | Текущая локация | Новая локация |
|------|----------------|---------------|
| `UNIVERSAL_FORMS_GUIDE.md` | `guides/` | `guides/forms/UNIVERSAL_FORMS.md` |
| `UNIVERSAL_LISTS_GUIDE.md` | `guides/` | `guides/lists/UNIVERSAL_LISTS.md` |
| `VERCEL_DEPLOYMENT.md` | `deployment/` | `guides/deployment/VERCEL_DEPLOYMENT.md` |
| `VERCEL_VS_OWN_SERVER.md` | `deployment/` | `guides/deployment/VERCEL_VS_OWN_SERVER.md` |
| `ROLES_DEBUG_GUIDE.md` | `docs/` | `guides/debugging/ROLES_DEBUG.md` |
| `TESTING_GUIDE.md` | `guides/` | `guides/testing/TESTING_GUIDE.md` |
| `DEBUG_TIPS.md` | `guides/` | `guides/debugging/DEBUG_TIPS.md` |

### 🔧 Implementation - Features (3 файла)
| Файл | Текущая локация | Новая локация |
|------|----------------|---------------|
| `ENTITY_SERVICE_FINAL.md` | `implementation/` | `implementation/features/ENTITY_SERVICE.md` |
| `UNIVERSAL_ENTITY_FINAL_ARCHITECTURE.md` | `implementation/` | `implementation/features/UNIVERSAL_ENTITY.md` |
| `FORM_GENERATION_USAGE.md` | `implementation/` | `implementation/features/FORM_GENERATION.md` |

### 🔧 Implementation - Migrations (только актуальные инструкции)
| Файл | Текущая локация | Новая локация |
|------|----------------|---------------|
| `MIGRATIONS_INSTRUCTIONS.md` | `implementation/` | `implementation/migrations/MIGRATIONS_INSTRUCTIONS.md` |
| `universal-entity-phases/HOW_TO_RUN_MIGRATION.md` | `implementation/` | `implementation/migrations/HOW_TO_RUN.md` |
| Все `*.sql` файлы | `implementation/` | `implementation/migrations/SQL/` |

### 🧩 Components (1 файл)
| Файл | Текущая локация | Новая локация |
|------|----------------|---------------|
| `CONFIRMATION_DIALOG.md` | `components/` | `components/CONFIRMATION_DIALOG.md` |

### 🎨 Design System (1 файл)
| Файл | Текущая локация | Новая локация |
|------|----------------|---------------|
| `SPACING_GUIDE.md` | `design-system/` | `design-system/SPACING_GUIDE.md` |

### 🗺️ Roadmap (1 файл)
| Файл | Текущая локация | Новая локация |
|------|----------------|---------------|
| `ROADMAP.md` | `roadmap/` | `roadmap/ROADMAP.md` |

### 📊 Reports (только актуальный статус)
| Файл | Текущая локация | Новая локация |
|------|----------------|---------------|
| `PROJECT_STATUS_2025_11_15.md` | `implementation/` | `implementation/PROJECT_STATUS.md` |

---

## ❌ В архив (все остальное) - ~100+ файлов

### Планы (PLAN) - все в архив
- `BREADCRUMBS_PLAN.md`
- `ROLES_AND_PERMISSIONS_PLAN.md`
- `PUBLIC_API_IMPLEMENTATION_PLAN.md`
- `TANSTACK_TABLE_MIGRATION_PLAN.md`
- `MIGRATION_TO_NUQS_PLAN.md`
- `REFACTORING_PLAN.md`
- И все остальные *PLAN.md

### Отчеты (REPORT) - все в архив
- `BREADCRUMBS_IMPLEMENTATION_REPORT.md`
- `FORM_GENERATION_IMPLEMENTATION_REPORT.md`
- `UI_CONFIG_SYSTEM_REPORT.md`
- `SDK_IMPLEMENTATION_REPORT.md`
- `AUTH_CLEANUP_REPORT.md`
- `CLEANUP_REPORT_2025_01_30.md`
- `ORGANIZATION_REPORT.md`
- И все остальные *REPORT.md

### Сводки (SUMMARY) - все в архив
- `SUPABASE_MIGRATION_SUMMARY.md`
- `SUPABASE_MIGRATION_COMPLETE.md`
- `MIGRATION_SUMMARY.md`
- `WORK_SUMMARY_2025_11_15.md`
- `SIMPLIFICATION_SUMMARY.md`
- `PAGE_SIZE_FIX_SUMMARY.md`
- `DOCUMENTATION_UPDATE_SUMMARY.md`
- И все остальные *SUMMARY.md

### Анализы (ANALYSIS) - все в архив
- `QUERY_OPTIMIZATION_ANALYSIS.md`
- `UNIVERSAL_ENTITY_ANALYSIS.md`
- `SDK_ARCHITECTURE_ANALYSIS.md`
- `ROUTES_ANALYSIS.md`
- `LIB_FOLDER_ANALYSIS.md`
- `USAGE_ANALYSIS.md`
- `PUBLIC_FILES_ANALYSIS.md`
- `UNUSED_FILES_ANALYSIS.md`
- `AUTH_OPTIMIZATION_ANALYSIS.md`
- `DEEP_ANALYSIS.md`
- `FINAL_ANALYSIS_AND_PLAN.md`
- `PAGE_SIZE_ISSUE_ANALYSIS.md`
- `SYSTEM_ANALYSIS.md`
- И все остальные *ANALYSIS.md

### Статусы (STATUS) - все в архив, кроме PROJECT_STATUS
- `IMPLEMENTATION_STATUS.md`
- `IMPLEMENTATION_COMPLETE.md`
- `STATUS.md`
- И все остальные *STATUS.md

### Исправления (FIX) - все в архив
- `AUTH_REDIRECT_FIX.md`
- `COOKIES_PROBLEM_SOLUTION.md`
- `TOKEN_REFRESH_FIX.md`
- `RELATION_SELECT_FIX.md`
- `PAGE_SIZE_FIX_SUMMARY.md`
- И все остальные *FIX.md

### Старые документы - все в архив
- `UNIVERSAL_ENTITY_SYSTEM.md` (class approach)
- `AUTH_ARCHITECTURE_SPEC.md` (устаревший)
- `FINAL_IMPLEMENTATION_SUMMARY.md` (старая архитектура)
- `ARCHITECTURE_IMPLEMENTATION_SUMMARY.md`
- `IMPLEMENTATION_STATUS.md`
- Все файлы из `lists/` (14 файлов)
- Все файлы из `universal-entity-phases/` (кроме HOW_TO_RUN_MIGRATION.md)
- И все остальные устаревшие документы

---

## 📊 Итоговая статистика

- **Важных документов (оставить):** ~25-30
- **В архив:** ~100+
- **Всего:** 139

---

## ✅ Следующие шаги

1. Создать новую структуру папок
2. Переместить только важные документы (~25-30)
3. Переместить все остальное в `archive/`
4. Обновить ссылки в документах
5. Обновить INDEX.md и README.md

