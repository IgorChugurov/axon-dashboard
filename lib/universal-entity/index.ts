/**
 * Экспорты универсальной системы сущностей
 */

// Типы теперь экспортируются из @igorchugurov/public-api-sdk
// Для обратной совместимости можно реэкспортировать:
// export type * from "@igorchugurov/public-api-sdk";

// Сервисы
export * from "./config-service";
export * from "./relation-service";

// Экспорт сервисов для удобства
export { relationService } from "./relation-service";
