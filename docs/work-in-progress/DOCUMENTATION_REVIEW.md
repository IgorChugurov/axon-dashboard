# Ревизия документации - Классификация документов

**Дата:** 2025-01-30  
**Статус:** 🔄 В процессе

---

## 📊 Статистика

- **Всего документов:** 139 MD файлов
- **Требуют проверки:** 139
- **Проверено:** ~50 (ключевые документы)

---

## 🔍 Классификация документов

### ✅ Актуальные документы (оставить и обновить)

#### Архитектура
| Файл | Текущая локация | Новая локация | Действие |
|------|----------------|---------------|----------|
| `CURRENT_AUTH_FLOW.md` | `architecture/` | `architecture/auth/CURRENT_AUTH_FLOW.md` | Переместить |
| `DEVELOPMENT_GUIDE.md` | `architecture/` | `architecture/design-decisions/DEVELOPMENT_GUIDE.md` | Переместить |
| `HYBRID_ARCHITECTURE_GUIDE.md` | `implementation/` | `architecture/data-flow/HYBRID_ARCHITECTURE.md` | Переместить + переименовать |

#### Структуры
| Файл | Текущая локация | Новая локация | Действие |
|------|----------------|---------------|----------|
| `CONFIG_FILE_STRUCTURE.md` | `docs/` | `structure/CONFIG_FILES.md` | Переместить + переименовать |
| `FORMS_STRUCTURE.md` | `docs/` | `structure/FORMS_STRUCTURE.md` | Переместить |
| `LISTS_STRUCTURE.md` | `docs/` | `structure/LISTS_STRUCTURE.md` | Переместить |
| `NAVIGATION_EXPLANATION.md` | `docs/` | `structure/NAVIGATION.md` | Переместить + переименовать |
| `ROUTING_ANALYSIS.md` + `ROUTING_RESTRUCTURE.md` | `docs/` | `structure/ROUTING.md` | Объединить в один файл |

#### Флоу
| Файл | Текущая локация | Новая локация | Действие |
|------|----------------|---------------|----------|
| `TOKEN_FLOW_SUMMARY.md` | `flows/` | `flows/TOKEN_FLOW.md` | Переместить + переименовать |
| `REQUEST_FLOW_EXPLANATION.md` | `flows/` | `flows/REQUEST_FLOW.md` | Переместить + переименовать |
| `FLOW_DIAGRAM.md` | `flows/` | `flows/DATA_FLOW.md` | Переместить + переименовать |
| `TOKEN_REFRESH_FLOW.md` | `implementation/` | `flows/TOKEN_FLOW.md` | Объединить с TOKEN_FLOW_SUMMARY |
| `PASSWORD_RESET_FLOW.md` | `implementation/` | `flows/PASSWORD_RESET_FLOW.md` | Переместить |
| `OAUTH_FLOW.md` | `implementation/` | `flows/OAUTH_FLOW.md` | Переместить |

#### Гайды
| Файл | Текущая локация | Новая локация | Действие |
|------|----------------|---------------|----------|
| `QUICK_START.md` | `guides/` | `getting-started/QUICK_START.md` | Переместить |
| `QUICK_START_ENTITY.md` | `implementation/` | `guides/creating-entities/QUICK_START_ENTITY.md` | Переместить |
| `UNIVERSAL_FORMS_GUIDE.md` | `guides/` | `guides/forms/UNIVERSAL_FORMS.md` | Переместить |
| `UNIVERSAL_LISTS_GUIDE.md` | `guides/` | `guides/lists/UNIVERSAL_LISTS.md` | Переместить |
| `VERCEL_DEPLOYMENT.md` | `deployment/` | `guides/deployment/VERCEL_DEPLOYMENT.md` | Переместить |
| `VERCEL_VS_OWN_SERVER.md` | `deployment/` | `guides/deployment/VERCEL_VS_OWN_SERVER.md` | Переместить |
| `ROLES_DEBUG_GUIDE.md` | `docs/` | `guides/debugging/ROLES_DEBUG.md` | Переместить + переименовать |
| `TESTING_GUIDE.md` | `guides/` | `guides/testing/TESTING_GUIDE.md` | Переместить |
| `DEBUG_TIPS.md` | `guides/` | `guides/debugging/DEBUG_TIPS.md` | Переместить |

#### Реализация - Features
| Файл | Текущая локация | Новая локация | Действие |
|------|----------------|---------------|----------|
| `ENTITY_SERVICE_FINAL.md` | `implementation/` | `implementation/features/entity-service/ENTITY_SERVICE_FINAL.md` | Переместить |
| `QUERY_OPTIMIZATION_ANALYSIS.md` | `implementation/` | `implementation/features/entity-service/QUERY_OPTIMIZATION.md` | Переместить + переименовать |
| `UNIVERSAL_ENTITY_FINAL_ARCHITECTURE.md` | `implementation/` | `implementation/features/universal-entity/ARCHITECTURE.md` | Переместить + переименовать |
| `UNIVERSAL_ENTITY_INSTANCE_ARCHITECTURE.md` | `implementation/` | `implementation/features/universal-entity/INSTANCE_ARCHITECTURE.md` | Переместить + переименовать |
| `UNIVERSAL_ENTITY_ANALYSIS.md` | `implementation/` | `implementation/features/universal-entity/OVERVIEW.md` | Переместить + переименовать |
| `FORM_GENERATION_IMPLEMENTATION_REPORT.md` | `implementation/` | `implementation/features/form-generation/OVERVIEW.md` | Переместить + переименовать |
| `FORM_GENERATION_FLOW.md` | `implementation/` | `implementation/features/form-generation/FLOW.md` | Переместить + переименовать |
| `FORM_GENERATION_USAGE.md` | `implementation/` | `implementation/features/form-generation/USAGE.md` | Переместить + переименовать |
| `FORM_GENERATION_DIAGRAMS.md` | `implementation/` | `implementation/features/form-generation/DIAGRAMS.md` | Переместить + переименовать |
| `FORM_WITH_SECTIONS_CONNECTED.md` | `implementation/` | `implementation/features/form-generation/FORM_WITH_SECTIONS.md` | Переместить + переименовать |
| `BREADCRUMBS_IMPLEMENTATION_REPORT.md` | `docs/` | `implementation/features/breadcrumbs/IMPLEMENTATION.md` | Переместить + переименовать |
| `BREADCRUMBS_PLAN.md` | `docs/` | `implementation/features/breadcrumbs/PLAN.md` | Переместить |
| `UI_CONFIG_SYSTEM_REPORT.md` | `implementation/` | `implementation/features/ui-config/SYSTEM_REPORT.md` | Переместить + переименовать |
| `UI_CONFIG_MIGRATION_GUIDE.md` | `implementation/` | `implementation/features/ui-config/MIGRATION_GUIDE.md` | Переместить + переименовать |

#### Реализация - Migrations
| Файл | Текущая локация | Новая локация | Действие |
|------|----------------|---------------|----------|
| `SUPABASE_SETUP_GUIDE.md` | `implementation/` | `implementation/migrations/SUPABASE/SETUP_GUIDE.md` | Переместить + переименовать |
| `SUPABASE_MIGRATION_SUMMARY.md` | `implementation/` | `implementation/migrations/SUPABASE/MIGRATION_SUMMARY.md` | Переместить + переименовать |
| `SUPABASE_MIGRATION_COMPLETE.md` | `implementation/` | `implementation/migrations/SUPABASE/MIGRATION_COMPLETE.md` | Переместить + переименовать |
| `MIGRATION_SUMMARY.md` | `docs/` | `implementation/migrations/SUPABASE/ROLES_MIGRATION.md` | Переместить + переименовать |
| `MIGRATIONS_INSTRUCTIONS.md` | `implementation/` | `implementation/migrations/SUPABASE/MIGRATIONS_INSTRUCTIONS.md` | Переместить |
| `universal-entity-phases/PHASE_1.md` | `implementation/` | `implementation/migrations/UNIVERSAL_ENTITY/PHASE_1.md` | Переместить |
| `universal-entity-phases/PHASE_2.md` | `implementation/` | `implementation/migrations/UNIVERSAL_ENTITY/PHASE_2.md` | Переместить |
| `universal-entity-phases/PHASE_3.md` | `implementation/` | `implementation/migrations/UNIVERSAL_ENTITY/PHASE_3.md` | Переместить |
| `universal-entity-phases/HOW_TO_RUN_MIGRATION.md` | `implementation/` | `implementation/migrations/UNIVERSAL_ENTITY/HOW_TO_RUN.md` | Переместить + переименовать |
| `universal-entity-phases/PERMISSIONS_EXPLANATION.md` | `implementation/` | `implementation/migrations/UNIVERSAL_ENTITY/PERMISSIONS_EXPLANATION.md` | Переместить |
| `universal-entity-phases/ROUTING_PROPOSAL.md` | `implementation/` | `implementation/migrations/UNIVERSAL_ENTITY/ROUTING_PROPOSAL.md` | Переместить |
| Все `*.sql` файлы | `implementation/` | `implementation/migrations/SQL/` | Переместить |

#### Реализация - Fixes
| Файл | Текущая локация | Новая локация | Действие |
|------|----------------|---------------|----------|
| `AUTH_REDIRECT_FIX.md` | `implementation/` | `implementation/fixes/AUTH_REDIRECT_FIX.md` | Переместить |
| `COOKIES_PROBLEM_SOLUTION.md` | `implementation/` | `implementation/fixes/COOKIES_FIX.md` | Переместить + переименовать |
| `TOKEN_REFRESH_FIX.md` | `implementation/` | `implementation/fixes/TOKEN_REFRESH_FIX.md` | Переместить |
| `RACE_CONDITIONS_PROTECTION.md` | `implementation/` | `implementation/fixes/RACE_CONDITIONS.md` | Переместить + переименовать |
| `RELATION_SELECT_FIX.md` | `implementation/` | `implementation/fixes/RELATION_SELECT_FIX.md` | Переместить |
| `PAGE_SIZE_FIX_SUMMARY.md` | `lists/` | `implementation/fixes/PAGE_SIZE_FIX.md` | Переместить + переименовать |

#### Реализация - SDK
| Файл | Текущая локация | Новая локация | Действие |
|------|----------------|---------------|----------|
| `SDK_ARCHITECTURE_ANALYSIS.md` | `implementation/` | `implementation/sdk/AUTH_SDK/ARCHITECTURE.md` | Переместить + переименовать |
| `SDK_IMPLEMENTATION_REPORT.md` | `implementation/` | `implementation/sdk/AUTH_SDK/IMPLEMENTATION.md` | Переместить + переименовать |
| `SDK_USAGE_AUDIT.md` | `implementation/` | `implementation/sdk/AUTH_SDK/USAGE_AUDIT.md` | Переместить + переименовать |
| `SDK_DETAILED_SPECIFICATION.md` | `implementation/` | `implementation/sdk/PUBLIC_API_SDK/SPECIFICATION.md` | Переместить + переименовать |
| `PUBLIC_API_IMPLEMENTATION_PLAN.md` | `implementation/` | `implementation/sdk/PUBLIC_API_SDK/IMPLEMENTATION_PLAN.md` | Переместить |
| `SDK_SHARING_STRATEGY.md` | `implementation/` | `implementation/sdk/PUBLIC_API_SDK/SHARING_STRATEGY.md` | Переместить + переименовать |

#### Реализация - Reports
| Файл | Текущая локация | Новая локация | Действие |
|------|----------------|---------------|----------|
| `PROJECT_STATUS_2025_11_15.md` | `implementation/` | `implementation/reports/PROJECT_STATUS.md` | Переместить + переименовать |
| `WORK_SUMMARY_2025_11_15.md` | `implementation/` | `implementation/reports/WORK_SUMMARY.md` | Переместить + переименовать |

#### Роли и права
| Файл | Текущая локация | Новая локация | Действие |
|------|----------------|---------------|----------|
| `ROLES_AND_PERMISSIONS.md` | `docs/` | `architecture/auth/ROLES_AND_PERMISSIONS.md` | Переместить |
| `ROLES_SUMMARY.md` | `implementation/` | `architecture/auth/ROLES_SUMMARY.md` | Переместить |
| `ROLES_IMPLEMENTATION_STEPS.md` | `implementation/` | `architecture/auth/ROLES_IMPLEMENTATION.md` | Переместить + переименовать |
| `ROLES_AND_PERMISSIONS_PLAN.md` | `implementation/` | `architecture/auth/ROLES_PLAN.md` | Переместить + переименовать |
| `QUICK_START_ROLES.md` | `implementation/` | `guides/debugging/ROLES_QUICK_START.md` | Переместить + переименовать |

#### Компоненты
| Файл | Текущая локация | Новая локация | Действие |
|------|----------------|---------------|----------|
| `CONFIRMATION_DIALOG.md` | `components/` | `components/CONFIRMATION_DIALOG.md` | Оставить на месте |

#### Design System
| Файл | Текущая локация | Новая локация | Действие |
|------|----------------|---------------|----------|
| `SPACING_GUIDE.md` | `design-system/` | `design-system/SPACING_GUIDE.md` | Оставить на месте |

#### Roadmap
| Файл | Текущая локация | Новая локация | Действие |
|------|----------------|---------------|----------|
| `ROADMAP.md` | `roadmap/` | `roadmap/ROADMAP.md` | Оставить на месте |
| `PHASE_2_CONTENT_TYPES_BUILDER.md` | `roadmap/` | `roadmap/PHASE_2_CONTENT_TYPES.md` | Переместить + переименовать |
| `PHASE_2_CONTENT_TYPES_BUILDER_REVIEW.md` | `roadmap/` | `roadmap/PHASE_2_CONTENT_TYPES_REVIEW.md` | Переместить + переименовать |

#### Reports
| Файл | Текущая локация | Новая локация | Действие |
|------|----------------|---------------|----------|
| `AUTH_CLEANUP_REPORT.md` | `reports/` | `reports/cleanup/AUTH_CLEANUP.md` | Переместить + переименовать |
| `CLEANUP_REPORT_2025_01_30.md` | `reports/` | `reports/cleanup/CLEANUP_REPORT.md` | Переместить + переименовать |
| `UNUSED_FILES_ANALYSIS.md` | `reports/` | `reports/cleanup/UNUSED_FILES.md` | Переместить + переименовать |
| `ROUTES_ANALYSIS.md` | `reports/` | `reports/analysis/ROUTES_ANALYSIS.md` | Переместить |
| `LIB_FOLDER_ANALYSIS.md` | `reports/` | `reports/analysis/LIB_FOLDER_ANALYSIS.md` | Переместить |
| `USAGE_ANALYSIS.md` | `reports/` | `reports/analysis/USAGE_ANALYSIS.md` | Переместить |
| `PUBLIC_FILES_ANALYSIS.md` | `reports/` | `reports/analysis/PUBLIC_FILES_ANALYSIS.md` | Переместить |
| `FINAL_AUTH_MIGRATION_REPORT.md` | `reports/` | `reports/migration-reports/AUTH_MIGRATION.md` | Переместить + переименовать |
| `AUTH_SDK_MIGRATION_ANALYSIS.md` | `reports/` | `reports/migration-reports/SDK_MIGRATION.md` | Переместить + переименовать |

---

### ⚠️ Частично устаревшие документы (обновить и переместить)

| Файл | Текущая локация | Новая локация | Действие | Причина |
|------|----------------|---------------|----------|---------|
| `FINAL_IMPLEMENTATION_SUMMARY.md` | `implementation/` | `archive/legacy/FINAL_IMPLEMENTATION_SUMMARY.md` | Архивировать | Описывает старую архитектуру с Backend API |
| `ARCHITECTURE_IMPLEMENTATION_SUMMARY.md` | `implementation/` | `archive/legacy/ARCHITECTURE_IMPLEMENTATION_SUMMARY.md` | Архивировать | Частично устарело |
| `ARCHITECTURE_DISCUSSION_SUMMARY.md` | `implementation/` | `architecture/design-decisions/ARCHITECTURE_DISCUSSION.md` | Переместить | Может содержать полезную информацию |

---

### ❌ Устаревшие документы (архивировать)

| Файл | Текущая локация | Новая локация | Действие | Причина |
|------|----------------|---------------|----------|---------|
| `UNIVERSAL_ENTITY_SYSTEM.md` | `implementation/` | `archive/legacy/UNIVERSAL_ENTITY_SYSTEM.md` | Архивировать | Class-based подход (заменен на функциональный) |
| `AUTH_ARCHITECTURE_SPEC.md` | `architecture/` | `archive/legacy/AUTH_ARCHITECTURE_SPEC.md` | Архивировать | Уже помечен как устаревший, Backend API подход |
| `IMPLEMENTATION_STATUS.md` | `implementation/` | `archive/legacy/IMPLEMENTATION_STATUS.md` | Архивировать | Описывает старую архитектуру с Backend API |
| `FIXES_PLAN.md` | `implementation/` | `archive/legacy/FIXES_PLAN.md` | Архивировать | Старый план исправлений |
| `FIXES_SUMMARY.md` | `implementation/` | `archive/legacy/FIXES_SUMMARY.md` | Архивировать | Старая сводка исправлений |
| `FIX_PLAN.md` | `implementation/` | `archive/legacy/FIX_PLAN.md` | Архивировать | Старый план исправлений |
| `SUPABASE_AUTH_PLAN.md` | `implementation/` | `archive/legacy/SUPABASE_AUTH_PLAN.md` | Архивировать | Старый план миграции |
| `SUPABASE_EXPLANATIONS.md` | `implementation/` | `archive/legacy/SUPABASE_EXPLANATIONS.md` | Архивировать | Устаревшие объяснения |
| `SUPABASE_IMPLEMENTATION_STEPS.md` | `implementation/` | `archive/legacy/SUPABASE_IMPLEMENTATION_STEPS.md` | Архивировать | Старые шаги реализации |
| `SUPABASE_SERVICE_ROLE_KEY.md` | `implementation/` | `archive/legacy/SUPABASE_SERVICE_ROLE_KEY.md` | Архивировать | Устаревшая информация |
| `MIDDLEWARE_OPTIMIZATION_SUMMARY.md` | `implementation/` | `archive/legacy/MIDDLEWARE_OPTIMIZATION_SUMMARY.md` | Архивировать | Старая оптимизация |
| `MIGRATION_ORDER.md` | `implementation/` | `archive/legacy/MIGRATION_ORDER.md` | Архивировать | Старый порядок миграций |
| `SDK_IMPLEMENTATION_PLAN.md` | `implementation/` | `archive/legacy/SDK_IMPLEMENTATION_PLAN.md` | Архивировать | Старый план реализации |
| `SDK_BUG_ANALYSIS.md` | `implementation/` | `archive/legacy/SDK_BUG_ANALYSIS.md` | Архивировать | Старый анализ багов |
| `SDK_CACHING_ANALYSIS.md` | `implementation/` | `archive/legacy/SDK_CACHING_ANALYSIS.md` | Архивировать | Старый анализ кэширования |
| `SDK_DATA_FLOW_EXPLANATION.md` | `implementation/` | `archive/legacy/SDK_DATA_FLOW_EXPLANATION.md` | Архивировать | Устаревшее объяснение |
| `FILTER_FLOW_EXPLANATION.md` | `implementation/` | `archive/legacy/FILTER_FLOW_EXPLANATION.md` | Архивировать | Устаревшее объяснение |
| `ENTITY_RELATIONS_DEEP_DIVE.md` | `implementation/` | `archive/legacy/ENTITY_RELATIONS_DEEP_DIVE.md` | Архивировать | Устаревший анализ |
| `DATA_NORMALIZATION_REPORT.md` | `implementation/` | `archive/legacy/DATA_NORMALIZATION_REPORT.md` | Архивировать | Старый отчет |
| `SECTIONS_MIGRATION_GUIDE.md` | `implementation/` | `archive/legacy/SECTIONS_MIGRATION_GUIDE.md` | Архивировать | Устаревший гайд |
| `PROJECT_ADMINS_IMPLEMENTATION_PLAN.md` | `implementation/` | `archive/legacy/PROJECT_ADMINS_IMPLEMENTATION_PLAN.md` | Архивировать | Старый план |
| `ROLE_CACHE_OPTIMIZATION.md` | `implementation/` | `archive/legacy/ROLE_CACHE_OPTIMIZATION.md` | Архивировать | Старая оптимизация |
| `PASSWORD_RESET_SECURITY.md` | `implementation/` | `archive/legacy/PASSWORD_RESET_SECURITY.md` | Архивировать | Устаревшая информация |
| `TANSTACK_TABLE_MIGRATION_PLAN.md` | `docs/` | `archive/legacy/TANSTACK_TABLE_MIGRATION_PLAN.md` | Архивировать | Старый план миграции |
| `PROMPT_FOR_FORMS_INVENTORY.md` | `docs/` | `archive/legacy/PROMPT_FOR_FORMS_INVENTORY.md` | Архивировать | Устаревший промпт |
| `ORGANIZATION_COMPLETE.md` | `docs/` | `archive/legacy/ORGANIZATION_COMPLETE.md` | Архивировать | Старый отчет об организации |
| `DOCUMENTATION_UPDATE_SUMMARY.md` | `docs/` | `archive/legacy/DOCUMENTATION_UPDATE_SUMMARY.md` | Архивировать | Старая сводка обновлений |
| `LISTS_REFACTORING_PLAN.md` | `docs/` | `archive/lists/REFACTORING_PLAN.md` | Архивировать | Старый план рефакторинга |

---

### 📦 Документы из lists/ (объединить с guides/lists/)

Все 14 файлов из `docs/lists/` → `guides/lists/` (объединить с существующими):

| Файл | Действие |
|------|----------|
| `DEEP_ANALYSIS.md` | Переместить в `guides/lists/` |
| `FINAL_ANALYSIS_AND_PLAN.md` | Переместить в `guides/lists/` |
| `IMPLEMENTATION_COMPLETE.md` | Переместить в `guides/lists/` |
| `MIGRATION_TO_NUQS_PLAN.md` | Переместить в `guides/lists/` |
| `NEXT_STEPS.md` | Переместить в `guides/lists/` |
| `PAGE_SIZE_ISSUE_ANALYSIS.md` | Переместить в `guides/lists/` |
| `REFACTORING_PLAN.md` | Переместить в `guides/lists/` |
| `SIMPLIFICATION_SUMMARY.md` | Переместить в `guides/lists/` |
| `STANDARD_APPROACHES.md` | Переместить в `guides/lists/` |
| `STANDARD_IMPLEMENTATION.md` | Переместить в `guides/lists/` |
| `STATUS.md` | Переместить в `guides/lists/` |
| `SYSTEMATIC_SOLUTION.md` | Переместить в `guides/lists/` |
| `SYSTEM_ANALYSIS.md` | Переместить в `guides/lists/` |

---

### 🔄 Документы для объединения

| Файлы | Действие | Результат |
|-------|----------|-----------|
| `ROUTING_ANALYSIS.md` + `ROUTING_RESTRUCTURE.md` | Объединить | `structure/ROUTING.md` |
| `TOKEN_FLOW_SUMMARY.md` + `TOKEN_REFRESH_FLOW.md` | Объединить | `flows/TOKEN_FLOW.md` |

---

### 📝 Документы для проверки актуальности

| Файл | Текущая локация | Действие | Примечание |
|------|----------------|----------|------------|
| `ARCHITECTURE_EXPLANATION.md` | `architecture/` | Проверить актуальность | Может содержать полезную информацию |
| `AUTH_SPECIFICATION.md` | `architecture/` | Проверить актуальность | Может содержать полезную информацию |
| `AUTH_OPTIMIZATION_ANALYSIS.md` | `architecture/` | Проверить актуальность | Может содержать полезную информацию |
| `AUTH_OPTIMIZATION_PLAN.md` | `architecture/` | Проверить актуальность | Может содержать полезную информацию |
| `NEW_TOKEN_SYSTEM.md` | `architecture/` | Проверить актуальность | Может содержать полезную информацию |
| `NEXTJS_AUTH_ARCHITECTURE.md` | `architecture/` | Проверить актуальность | Может содержать полезную информацию |
| `UNIVERSAL_TOKEN_SYSTEM.md` | `architecture/` | Проверить актуальность | Может содержать полезную информацию |
| `PROJECT_USERS_*.md` (3 файла) | `architecture/` | Проверить актуальность | Могут содержать полезную информацию |
| `MIDDLEWARE_EXPLANATION.md` | `implementation/` | Проверить актуальность | Может быть актуальным |
| `SUPABASE_MIGRATION_SUMMARY.md` | `implementation/` | Проверить актуальность | Может быть актуальным |
| `ENTITY_RELATIONS_DEEP_DIVE.md` | `implementation/` | Проверить актуальность | Может содержать полезную информацию |
| `CLEANUP_RECOMMENDATIONS.md` | `reports/` | Проверить актуальность | Может содержать полезную информацию |
| `ORGANIZATION_REPORT.md` | `reports/` | Проверить актуальность | Может содержать полезную информацию |
| `BACKEND_DATA_FORMAT.md` | `guides/` | Проверить актуальность | Может быть актуальным |
| `CHANGELOG.md` | `guides/` | Проверить актуальность | Может быть актуальным |
| `RECOMMENDATIONS.md` | `guides/` | Проверить актуальность | Может быть актуальным |
| `guides/INDEX.md` | `guides/` | Проверить актуальность | Может быть актуальным |

---

## 📊 Итоговая статистика (пересмотрено)

- **Актуальных документов (важные):** ~25-30
- **Частично устаревших:** ~3
- **Устаревших (в архив):** ~100+ (планы, отчеты, анализы, старые статусы)
- **Для проверки:** ~6
- **Всего:** 139

### 🔍 Анализ: что действительно нужно

**Оставить только:**
- ✅ Гайды (GUIDE) - актуальные руководства
- ✅ Архитектура (ARCHITECTURE, FLOW) - актуальные описания
- ✅ Структуры (STRUCTURE) - описание структур
- ✅ Финальные документы (FINAL) - актуальные финальные документы
- ✅ Важные миграции (только актуальные инструкции)
- ✅ Roadmap (только актуальный)

**Архивировать/удалить:**
- ❌ Все PLANS (кроме roadmap)
- ❌ Все REPORTS (кроме действительно важных)
- ❌ Все SUMMARIES (кроме актуальных)
- ❌ Все ANALYSES (кроме актуальных)
- ❌ Все STATUS (кроме актуального PROJECT_STATUS)
- ❌ Все FIX (кроме действительно важных)
- ❌ Старые MIGRATION документы (кроме актуальных инструкций)

---

## ✅ Следующие шаги

1. Создать новую структуру папок
2. Переместить актуальные документы
3. Архивировать устаревшие документы
4. Обновить ссылки в документах
5. Обновить INDEX.md и README.md

