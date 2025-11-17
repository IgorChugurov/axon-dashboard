/**
 * Экспорты универсальной системы сущностей
 */

// Типы
export * from "./types";

// Сервисы
export * from "./config-service";
export * from "./instance-service";
export * from "./relation-service";

// Экспорт сервисов для удобства
export { instanceService } from "./instance-service";
export { relationService } from "./relation-service";
