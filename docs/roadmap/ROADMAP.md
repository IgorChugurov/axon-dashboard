# 🗺️ Дорожная карта развития проекта

**Дата создания:** 2025-01-XX  
**Версия:** 1.0  
**Статус:** 🟡 В разработке

---

## 📋 Содержание

1. [Текущее состояние](#текущее-состояние)
2. [Приоритеты и фазы](#приоритеты-и-фазы)
3. [Детальные планы](#детальные-планы)
   - [Фаза 1: Файлы и Storage](#фаза-1-файлы-и-storage)
   - [Фаза 2: Content Types Builder](#фаза-2-content-types-builder)
   - [Фаза 3: Публичный API](#фаза-3-публичный-api)
   - [Фаза 4: API Документация](#фаза-4-api-документация)
   - [Фаза 5: Webhooks](#фаза-5-webhooks)
   - [Фаза 6: Генерация клиентского кода](#фаза-6-генерация-клиентского-кода)

---

## 📊 Текущее состояние

### ✅ Что уже реализовано

- ✅ Универсальная система сущностей (`lib/universal-entity/`)
- ✅ Конфигурация в БД (`entity_definition`, `field`)
- ✅ Автогенерация форм (`lib/form-generation/`)
- ✅ Универсальные списки (`components/universal-entity-list/`)
- ✅ RLS безопасность (права доступа на уровне БД)
- ✅ Внутренние API routes для админ-панели
- ✅ Система ролей (admin, superAdmin, user)

### ❌ Что отсутствует

- ❌ Поддержка файлов (file upload)
- ❌ Визуальный Content Types Builder
- ❌ Публичный API для клиентских приложений
- ❌ API документация (OpenAPI/Swagger)
- ❌ Webhooks система
- ❌ Генерация клиентского кода

---

## 🎯 Приоритеты и фазы

### Фаза 1: Файлы и Storage (Критично)

**Время:** 3-4 дня  
**Приоритет:** 🔴 Высокий  
**Зависимости:** Нет

### Фаза 2: Content Types Builder (Критично)

**Время:** 5-7 дней  
**Приоритет:** 🔴 Высокий  
**Зависимости:** Фаза 1 (для файловых полей)

### Фаза 3: Публичный API (Критично)

**Время:** 4-5 дней  
**Приоритет:** 🔴 Высокий  
**Зависимости:** Фаза 1, Фаза 2

### Фаза 4: API Документация (Важно)

**Время:** 2-3 дня  
**Приоритет:** 🟡 Средний  
**Зависимости:** Фаза 3

### Фаза 5: Webhooks (Полезно)

**Время:** 2-3 дня  
**Приоритет:** 🟢 Низкий  
**Зависимости:** Фаза 3

### Фаза 6: Генерация клиентского кода (Важно)

**Время:** 5-7 дней  
**Приоритет:** 🟡 Средний  
**Зависимости:** Фаза 3, Фаза 4

---

## 📝 Детальные планы

---

## Фаза 1: Файлы и Storage

### 🎯 Цель

Добавить поддержку полей типа `file` и `files` для загрузки одного или нескольких файлов с хранением в Supabase Storage.

### 📋 Задачи

#### 1.1. Расширение типов полей

**Файл:** `lib/universal-entity/types.ts`

**Изменения:**

```typescript
export type FieldType =
  | "select"
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "boolean"
  | "radio"
  | "multipleSelect"
  | "array"
  | "dynamicValue"
  | "file" // ← НОВОЕ: один файл
  | "files"; // ← НОВОЕ: несколько файлов

export type DbType =
  | "varchar"
  | "float"
  | "boolean"
  | "timestamptz"
  | "manyToOne"
  | "oneToMany"
  | "manyToMany"
  | "oneToOne"
  | "file" // ← НОВОЕ: для одного файла (хранит URL)
  | "files"; // ← НОВОЕ: для нескольких файлов (хранит массив URL)
```

**Добавить в `Field` интерфейс:**

```typescript
export interface Field {
  // ... существующие поля

  // File upload configuration
  acceptFileTypes?: string | null; // "image/*", "application/pdf", etc.
  maxFileSize?: number | null; // в байтах (например, 5242880 = 5MB)
  maxFiles?: number | null; // для типа "files" (максимум файлов)
  storageBucket?: string | null; // имя bucket в Supabase Storage (default: "files")
}
```

**Оценка:** 30 минут

---

#### 1.2. SQL миграция для полей файлов

**Файл:** `supabase/migrations/YYYYMMDD_add_file_fields.sql`

**Содержимое:**

```sql
-- Добавляем новые типы в CHECK constraint для field.type
ALTER TABLE field
  DROP CONSTRAINT IF EXISTS field_type_check;

ALTER TABLE field
  ADD CONSTRAINT field_type_check
  CHECK (type IN (
    'select', 'text', 'textarea', 'number', 'date',
    'boolean', 'radio', 'multipleSelect', 'array',
    'dynamicValue', 'file', 'files'
  ));

-- Добавляем новые типы в CHECK constraint для field.db_type
ALTER TABLE field
  DROP CONSTRAINT IF EXISTS field_db_type_check;

ALTER TABLE field
  ADD CONSTRAINT field_db_type_check
  CHECK (db_type IN (
    'varchar', 'float', 'boolean', 'timestamptz',
    'manyToOne', 'oneToMany', 'manyToMany', 'oneToOne',
    'file', 'files'
  ));

-- Добавляем поля для конфигурации файлов
ALTER TABLE field
  ADD COLUMN IF NOT EXISTS accept_file_types TEXT,
  ADD COLUMN IF NOT EXISTS max_file_size BIGINT,
  ADD COLUMN IF NOT EXISTS max_files INTEGER,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'files';

-- Комментарии
COMMENT ON COLUMN field.accept_file_types IS 'MIME types, например: image/*, application/pdf';
COMMENT ON COLUMN field.max_file_size IS 'Максимальный размер файла в байтах';
COMMENT ON COLUMN field.max_files IS 'Максимум файлов для типа files';
COMMENT ON COLUMN field.storage_bucket IS 'Имя bucket в Supabase Storage';
```

**Оценка:** 15 минут

---

#### 1.3. Создание Supabase Storage bucket

**Файл:** `supabase/migrations/YYYYMMDD_create_storage_bucket.sql`

**Содержимое:**

```sql
-- Создаем bucket для файлов (если не существует)
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- RLS политики для bucket
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'files');

CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'files'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'files'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'files'
    AND auth.role() = 'authenticated'
  );
```

**Оценка:** 20 минут

---

#### 1.4. Сервис для работы с файлами

**Файл:** `lib/storage/file-service.ts`

**Содержимое:**

```typescript
import { createClient } from "@/lib/supabase/server";
import { createBrowserClient } from "@supabase/ssr";

export interface FileUploadOptions {
  bucket?: string;
  folder?: string; // подпапка в bucket (например, "avatars", "documents")
  maxSize?: number;
  acceptTypes?: string[];
}

export interface UploadedFile {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

/**
 * Загрузка файла на сервере (Server Action)
 */
export async function uploadFile(
  file: File,
  options: FileUploadOptions = {}
): Promise<UploadedFile> {
  const supabase = await createClient();
  const bucket = options.bucket || "files";
  const folder = options.folder || "";

  // Валидация размера
  if (options.maxSize && file.size > options.maxSize) {
    throw new Error(`File size exceeds ${options.maxSize} bytes`);
  }

  // Валидация типа
  if (
    options.acceptTypes &&
    !options.acceptTypes.some((type) => {
      if (type.endsWith("/*")) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    })
  ) {
    throw new Error(`File type ${file.type} not allowed`);
  }

  // Генерируем уникальное имя файла
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = file.name.split(".").pop();
  const fileName = `${timestamp}-${random}.${extension}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  // Конвертируем File в ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Получаем публичный URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return {
    url: publicUrl,
    path: filePath,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

/**
 * Загрузка нескольких файлов
 */
export async function uploadFiles(
  files: File[],
  options: FileUploadOptions = {}
): Promise<UploadedFile[]> {
  return Promise.all(files.map((file) => uploadFile(file, options)));
}

/**
 * Удаление файла
 */
export async function deleteFile(
  path: string,
  bucket: string = "files"
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Удаление нескольких файлов
 */
export async function deleteFiles(
  paths: string[],
  bucket: string = "files"
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(bucket).remove(paths);

  if (error) {
    throw new Error(`Failed to delete files: ${error.message}`);
  }
}
```

**Оценка:** 1-2 часа

---

#### 1.5. API route для загрузки файлов

**Файл:** `app/api/storage/upload/route.ts`

**Содержимое:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { uploadFile, uploadFiles } from "@/lib/storage/file-service";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const bucket = formData.get("bucket") as string | null;
    const folder = formData.get("folder") as string | null;
    const maxSize = formData.get("maxSize")
      ? parseInt(formData.get("maxSize") as string)
      : undefined;
    const acceptTypes = formData.get("acceptTypes")
      ? (formData.get("acceptTypes") as string).split(",")
      : undefined;

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const options = {
      bucket: bucket || undefined,
      folder: folder || undefined,
      maxSize,
      acceptTypes,
    };

    if (files.length === 1) {
      const result = await uploadFile(files[0], options);
      return NextResponse.json(result);
    } else {
      const results = await uploadFiles(files, options);
      return NextResponse.json(results);
    }
  } catch (error) {
    console.error("[Storage Upload] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
```

**Оценка:** 30 минут

---

#### 1.6. Компонент для загрузки файлов

**Файл:** `components/ui/file-upload.tsx`

**Содержимое:**

```typescript
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, File } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileUploadProps {
  value?: string | string[]; // URL или массив URL
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  accept?: string;
  maxSize?: number; // в байтах
  maxFiles?: number;
  bucket?: string;
  folder?: string;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  value,
  onChange,
  multiple = false,
  accept,
  maxSize,
  maxFiles,
  bucket,
  folder,
  disabled,
  className,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setError(null);
      setUploading(true);

      try {
        const formData = new FormData();
        Array.from(files).forEach((file) => {
          formData.append("files", file);
        });
        if (bucket) formData.append("bucket", bucket);
        if (folder) formData.append("folder", folder);
        if (maxSize) formData.append("maxSize", maxSize.toString());
        if (accept) formData.append("acceptTypes", accept);

        const response = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }

        const uploaded = await response.json();

        if (multiple) {
          const current = Array.isArray(value) ? value : [];
          const newUrls = Array.isArray(uploaded)
            ? uploaded.map((f: any) => f.url)
            : [uploaded.url];
          onChange([...current, ...newUrls]);
        } else {
          onChange(Array.isArray(uploaded) ? uploaded[0].url : uploaded.url);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [value, onChange, multiple, accept, maxSize, bucket, folder]
  );

  const handleRemove = useCallback(
    (index?: number) => {
      if (multiple && Array.isArray(value) && index !== undefined) {
        const newValue = [...value];
        newValue.splice(index, 1);
        onChange(newValue);
      } else {
        onChange(multiple ? [] : "");
      }
    },
    [value, onChange, multiple]
  );

  const currentFiles = multiple
    ? Array.isArray(value)
      ? value
      : []
    : value
    ? [value]
    : [];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById("file-input")?.click()}
          disabled={disabled || uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Upload File"}
        </Button>
        <input
          id="file-input"
          type="file"
          className="hidden"
          multiple={multiple}
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled || uploading}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {currentFiles.length > 0 && (
        <div className="space-y-1">
          {currentFiles.map((url, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 border rounded"
            >
              <div className="flex items-center gap-2">
                <File className="h-4 w-4" />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate"
                >
                  {url.split("/").pop()}
                </a>
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Оценка:** 2-3 часа

---

#### 1.7. Интеграция в форму генератор

**Файл:** `lib/form-generation/components/FieldRenderer.tsx`

**Изменения:**
Добавить case для `file` и `files`:

```typescript
case "file":
case "files":
  return (
    <FileUpload
      value={fieldValue}
      onChange={handleChange}
      multiple={field.type === "files"}
      accept={field.acceptFileTypes || undefined}
      maxSize={field.maxFileSize || undefined}
      maxFiles={field.maxFiles || undefined}
      bucket={field.storageBucket || undefined}
      folder={`${entityDefinitionId}/${field.name}`}
      disabled={disabled}
    />
  );
```

**Оценка:** 30 минут

---

#### 1.8. Обновление типов в config-service

**Файл:** `lib/universal-entity/config-service.ts`

**Изменения:**
В функции `transformField` добавить:

```typescript
acceptFileTypes: row.accept_file_types,
maxFileSize: row.max_file_size,
maxFiles: row.max_files,
storageBucket: row.storage_bucket,
```

**Оценка:** 10 минут

---

### ✅ Критерии готовности

- [ ] Типы `file` и `files` добавлены в `FieldType` и `DbType`
- [ ] SQL миграция выполнена
- [ ] Supabase Storage bucket создан
- [ ] Сервис `file-service.ts` реализован
- [ ] API route `/api/storage/upload` работает
- [ ] Компонент `FileUpload` создан и работает
- [ ] Интеграция в форму генератор
- [ ] Тестирование: загрузка одного файла
- [ ] Тестирование: загрузка нескольких файлов
- [ ] Тестирование: валидация размера и типа

---

## Фаза 2: Content Types Builder

### 🎯 Цель

Создать визуальный редактор для создания и редактирования `entity_definition` и `field` в стиле Strapi Content Types Builder.

### 📋 Задачи

#### 2.1. Страница Content Types Builder

**Файл:** `app/projects/[projectId]/entity-definitions/builder/page.tsx`

**Структура:**

- Левая панель: список существующих Entity Definitions
- Центральная панель: редактор выбранной Entity Definition
- Правая панель: список полей (fields) выбранной Entity Definition

**Оценка:** 1 день

---

#### 2.2. Компонент Entity Definition Editor

**Файл:** `components/entity-definition-builder/EntityDefinitionEditor.tsx`

**Функционал:**

- Редактирование базовых свойств (name, description, type)
- Настройка прав доступа (createPermission, readPermission, etc.)
- Настройка UI конфигурации (pageTitle, buttons, etc.)
- Настройка пагинации и фильтров

**Оценка:** 1 день

---

#### 2.3. Компонент Field Editor

**Файл:** `components/entity-definition-builder/FieldEditor.tsx`

**Функционал:**

- Drag & drop для изменения порядка полей
- Редактирование свойств поля (name, type, label, etc.)
- Визуальное создание связей (manyToOne, manyToMany, etc.)
- Настройка валидации (required, maxLength, etc.)
- Настройка файловых полей (acceptTypes, maxSize, etc.)

**Оценка:** 2 дня

---

#### 2.4. Компонент Field Type Selector

**Файл:** `components/entity-definition-builder/FieldTypeSelector.tsx`

**Функционал:**

- Визуальный выбор типа поля
- Иконки для каждого типа
- Описание типов
- Предпросмотр компонента

**Оценка:** 4 часа

---

#### 2.5. Компонент Relation Builder

**Файл:** `components/entity-definition-builder/RelationBuilder.tsx`

**Функционал:**

- Визуальное создание связей между Entity Definitions
- Выбор типа связи (manyToOne, oneToMany, manyToMany, oneToOne)
- Автоматическое создание обратных полей
- Визуализация связей (граф)

**Оценка:** 1 день

---

#### 2.6. Предпросмотр формы

**Файл:** `components/entity-definition-builder/FormPreview.tsx`

**Функционал:**

- Live preview формы на основе текущей конфигурации
- Отображение всех полей с правильными типами
- Валидация в реальном времени

**Оценка:** 4 часа

---

#### 2.7. Server Actions для сохранения

**Файл:** `app/projects/[projectId]/entity-definitions/builder/actions.ts`

**Функционал:**

- `saveEntityDefinitionAction`
- `saveFieldAction`
- `deleteFieldAction`
- `reorderFieldsAction`

**Оценка:** 4 часа

---

### ✅ Критерии готовности

- [ ] Страница Builder создана и доступна
- [ ] Можно создать новую Entity Definition через UI
- [ ] Можно редактировать существующую Entity Definition
- [ ] Можно добавлять поля через UI
- [ ] Можно редактировать поля через UI
- [ ] Можно удалять поля
- [ ] Можно изменять порядок полей (drag & drop)
- [ ] Можно создавать связи между Entity Definitions
- [ ] Предпросмотр формы работает
- [ ] Все изменения сохраняются в БД

---

## Фаза 3: Публичный API

### 🎯 Цель

Создать публичный REST API для работы с `entityInstance` через `entityDefinition`, с поддержкой условной авторизации на основе прав доступа в `entity_definition`.

### 📋 Задачи

#### 3.1. Структура публичного API

**Endpoint pattern:**

```
GET    /api/public/[projectId]/[entityDefinitionId]           - список экземпляров
GET    /api/public/[projectId]/[entityDefinitionId]/[id]     - один экземпляр
POST   /api/public/[projectId]/[entityDefinitionId]          - создать (если разрешено)
PUT    /api/public/[projectId]/[entityDefinitionId]/[id]     - обновить (если разрешено)
DELETE /api/public/[projectId]/[entityDefinitionId]/[id]    - удалить (если разрешено)
```

**Оценка:** 30 минут (планирование)

---

#### 3.2. API Route: GET список экземпляров

**Файл:** `app/api/public/[projectId]/[entityDefinitionId]/route.ts`

**Функционал:**

- Проверка `readPermission` из `entity_definition`
- Если `readPermission = "ALL"` → доступ без авторизации
- Если `readPermission = "User"` → требуется авторизация
- Если `readPermission = "Admin"` → требуется роль admin
- Поддержка фильтрации, пагинации, поиска
- Поддержка `includeRelations` для загрузки связей

**Оценка:** 1 день

---

#### 3.3. API Route: GET один экземпляр

**Файл:** `app/api/public/[projectId]/[entityDefinitionId]/[id]/route.ts`

**Функционал:**

- Те же проверки прав доступа
- Возврат одного экземпляра с полями
- Поддержка `includeRelations`

**Оценка:** 4 часа

---

#### 3.4. API Route: POST создать экземпляр

**Файл:** `app/api/public/[projectId]/[entityDefinitionId]/route.ts` (POST метод)

**Функционал:**

- Проверка `createPermission`
- Валидация данных на основе `field` конфигурации
- Создание экземпляра через `instance-service`
- Обработка файлов (если есть файловые поля)
- Создание связей (если есть relation поля)

**Оценка:** 1 день

---

#### 3.5. API Route: PUT обновить экземпляр

**Файл:** `app/api/public/[projectId]/[entityDefinitionId]/[id]/route.ts` (PUT метод)

**Функционал:**

- Проверка `updatePermission`
- Валидация данных
- Обновление экземпляра
- Обработка файлов (удаление старых, загрузка новых)
- Обновление связей

**Оценка:** 1 день

---

#### 3.6. API Route: DELETE удалить экземпляр

**Файл:** `app/api/public/[projectId]/[entityDefinitionId]/[id]/route.ts` (DELETE метод)

**Функционал:**

- Проверка `deletePermission`
- Удаление экземпляра
- Удаление связанных файлов из Storage
- Удаление связей

**Оценка:** 4 часа

---

#### 3.7. Утилита для проверки прав доступа

**Файл:** `lib/api/public/permission-checker.ts`

**Функционал:**

```typescript
export async function checkPermission(
  entityDefinitionId: string,
  permission: "create" | "read" | "update" | "delete",
  userId?: string,
  userRole?: "admin" | "user"
): Promise<boolean>;
```

**Оценка:** 2 часа

---

#### 3.8. Обработка авторизации в публичном API

**Функционал:**

- Поддержка Bearer token (JWT из Supabase)
- Опциональная авторизация (если `readPermission = "ALL"`)
- Обязательная авторизация (если `readPermission = "User"` или `"Admin"`)

**Оценка:** 4 часа

---

#### 3.9. Документация API endpoints

**Файл:** `docs/api/PUBLIC_API.md`

**Содержимое:**

- Описание всех endpoints
- Примеры запросов и ответов
- Коды ошибок
- Примеры использования

**Оценка:** 2 часа

---

### ✅ Критерии готовности

- [ ] GET список экземпляров работает
- [ ] GET один экземпляр работает
- [ ] POST создание работает (с проверкой прав)
- [ ] PUT обновление работает (с проверкой прав)
- [ ] DELETE удаление работает (с проверкой прав)
- [ ] Фильтрация и пагинация работают
- [ ] Поиск работает
- [ ] Загрузка связей (`includeRelations`) работает
- [ ] Авторизация работает корректно
- [ ] Обработка файлов работает
- [ ] Документация создана

---

## Фаза 4: API Документация

### 🎯 Цель

Автоматическая генерация OpenAPI/Swagger документации на основе `entity_definition` и `field` конфигурации.

### 📋 Задачи

#### 4.1. Генератор OpenAPI схемы

**Файл:** `lib/api-docs/openapi-generator.ts`

**Функционал:**

- Генерация OpenAPI 3.0 схемы
- Автоматическое определение типов на основе `field.dbType`
- Генерация endpoints для каждого `entity_definition`
- Генерация примеров запросов/ответов

**Оценка:** 1 день

---

#### 4.2. API Route для получения OpenAPI схемы

**Файл:** `app/api/docs/openapi.json/route.ts`

**Функционал:**

- Возврат OpenAPI схемы в JSON формате
- Кэширование на 5 минут
- Поддержка фильтрации по `projectId`

**Оценка:** 2 часа

---

#### 4.3. Swagger UI страница

**Файл:** `app/api/docs/page.tsx`

**Функционал:**

- Встроенный Swagger UI
- Выбор проекта для просмотра документации
- Интерактивное тестирование API

**Оценка:** 4 часа

---

#### 4.4. Интеграция в админ-панель

**Файл:** `app/projects/[projectId]/settings/api-docs/page.tsx`

**Функционал:**

- Страница с документацией API для конкретного проекта
- Кнопка "Export OpenAPI schema"
- Кнопка "Copy API URL"

**Оценка:** 2 часа

---

### ✅ Критерии готовности

- [ ] OpenAPI схема генерируется автоматически
- [ ] Endpoint `/api/docs/openapi.json` работает
- [ ] Swagger UI страница доступна
- [ ] Документация обновляется при изменении `entity_definition`
- [ ] Можно экспортировать схему
- [ ] Примеры запросов/ответов корректны

---

## Фаза 5: Webhooks

### 🎯 Цель

Система webhooks для уведомления внешних систем о событиях (create, update, delete) в `entity_instance`.

### 📋 Задачи

#### 5.1. SQL миграция для таблицы webhooks

**Файл:** `supabase/migrations/YYYYMMDD_create_webhooks.sql`

**Содержимое:**

```sql
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_definition_id UUID REFERENCES entity_definition(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL, -- ['create', 'update', 'delete']
  secret TEXT, -- для подписи запросов
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_project_id ON webhooks(project_id);
CREATE INDEX idx_webhooks_entity_definition_id ON webhooks(entity_definition_id);
```

**Оценка:** 15 минут

---

#### 5.2. Сервис для отправки webhooks

**Файл:** `lib/webhooks/webhook-service.ts`

**Функционал:**

- `sendWebhook(url, event, data, secret)` - отправка одного webhook
- `triggerWebhooks(entityDefinitionId, event, data)` - отправка всех webhooks для события
- Подпись запросов через HMAC SHA256
- Retry логика (3 попытки)
- Логирование ошибок

**Оценка:** 1 день

---

#### 5.3. Интеграция в instance-service

**Файл:** `lib/universal-entity/instance-service.ts`

**Изменения:**

- Вызов `triggerWebhooks` после успешного create/update/delete
- Асинхронная отправка (не блокирует основной поток)

**Оценка:** 2 часа

---

#### 5.4. UI для управления webhooks

**Файл:** `app/projects/[projectId]/settings/webhooks/page.tsx`

**Функционал:**

- Список webhooks проекта
- Создание нового webhook
- Редактирование webhook
- Удаление webhook
- Тестирование webhook (отправка тестового запроса)

**Оценка:** 1 день

---

#### 5.5. Логирование webhooks

**Файл:** `supabase/migrations/YYYYMMDD_create_webhook_logs.sql`

**Содержимое:**

```sql
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);
```

**Оценка:** 30 минут

---

### ✅ Критерии готовности

- [ ] Таблица webhooks создана
- [ ] Сервис отправки webhooks работает
- [ ] Webhooks отправляются при create/update/delete
- [ ] UI для управления webhooks создан
- [ ] Логирование webhooks работает
- [ ] Подпись запросов работает
- [ ] Retry логика работает

---

## Фаза 6: Генерация клиентского кода

### 🎯 Цель

Генерация готового клиентского приложения (Next.js/React) с настроенными страницами для всех `entity_definition` проекта, типизированными API клиентами и готовыми компонентами.

### 📋 Задачи

#### 6.1. Структура генерируемого проекта

**Структура:**

```
generated-client/
├── .env.example
├── package.json
├── next.config.js
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── [entityDefinitionId]/
│       ├── page.tsx (список)
│       ├── new/page.tsx (создание)
│       └── [id]/
│           ├── page.tsx (детали)
│           └── edit/page.tsx (редактирование)
├── lib/
│   ├── api/
│   │   └── client.ts (типизированный API клиент)
│   └── types/
│       └── entities.ts (TypeScript типы)
└── components/
    └── entities/
        └── [EntityName]Form.tsx
```

**Оценка:** 30 минут (планирование)

---

#### 6.2. Генератор TypeScript типов

**Файл:** `lib/client-code-generator/types-generator.ts`

**Функционал:**

- Генерация TypeScript интерфейсов на основе `entity_definition` и `field`
- Типизация всех полей
- Типизация связей
- Экспорт в файл `lib/types/entities.ts`

**Оценка:** 1 день

---

#### 6.3. Генератор API клиента

**Файл:** `lib/client-code-generator/api-client-generator.ts`

**Функционал:**

- Генерация типизированных функций для каждого `entity_definition`
- Методы: `getAll`, `getById`, `create`, `update`, `delete`
- Поддержка фильтрации, пагинации, поиска
- Обработка ошибок

**Оценка:** 1 день

---

#### 6.4. Генератор страниц

**Файл:** `lib/client-code-generator/pages-generator.ts`

**Функционал:**

- Генерация страниц списка для каждого `entity_definition`
- Генерация страниц создания
- Генерация страниц редактирования
- Генерация страниц деталей
- Использование универсальных компонентов

**Оценка:** 2 дня

---

#### 6.5. Генератор форм

**Файл:** `lib/client-code-generator/forms-generator.ts`

**Функционал:**

- Генерация форм на основе `field` конфигурации
- Поддержка всех типов полей
- Валидация на основе правил из `field`
- Интеграция с react-hook-form

**Оценка:** 1 день

---

#### 6.6. Генератор package.json и конфигов

**Файл:** `lib/client-code-generator/config-generator.ts`

**Функционал:**

- Генерация `package.json` с зависимостями
- Генерация `.env.example` с переменными окружения
- Генерация `next.config.js`
- Генерация `tsconfig.json`

**Оценка:** 4 часа

---

#### 6.7. API Route для генерации и скачивания

**Файл:** `app/api/projects/[projectId]/generate-client/route.ts`

**Функционал:**

- Генерация всего клиентского кода
- Упаковка в ZIP архив
- Скачивание архива

**Оценка:** 1 день

---

#### 6.8. UI для генерации клиента

**Файл:** `app/projects/[projectId]/settings/generate-client/page.tsx`

**Функционал:**

- Кнопка "Generate Client Application"
- Выбор опций (TypeScript, React, Next.js версия)
- Прогресс генерации
- Скачивание готового проекта

**Оценка:** 4 часа

---

### ✅ Критерии готовности

- [ ] TypeScript типы генерируются корректно
- [ ] API клиент генерируется с правильной типизацией
- [ ] Страницы генерируются для всех `entity_definition`
- [ ] Формы генерируются с правильной валидацией
- [ ] package.json и конфиги генерируются
- [ ] ZIP архив создается и скачивается
- [ ] Сгенерированный проект запускается без ошибок
- [ ] Все CRUD операции работают в сгенерированном проекте

---

## 📊 Итоговая оценка времени

| Фаза                               | Время          | Приоритет  |
| ---------------------------------- | -------------- | ---------- |
| Фаза 1: Файлы и Storage            | 3-4 дня        | 🔴 Высокий |
| Фаза 2: Content Types Builder      | 5-7 дней       | 🔴 Высокий |
| Фаза 3: Публичный API              | 4-5 дней       | 🔴 Высокий |
| Фаза 4: API Документация           | 2-3 дня        | 🟡 Средний |
| Фаза 5: Webhooks                   | 2-3 дня        | 🟢 Низкий  |
| Фаза 6: Генерация клиентского кода | 5-7 дней       | 🟡 Средний |
| **ИТОГО**                          | **21-29 дней** |            |

---

## 🚀 Как использовать эту дорожную карту

1. **Выберите фазу** из списка выше
2. **Скопируйте весь раздел фазы** (например, "Фаза 1: Файлы и Storage")
3. **Вставьте в чат** и начните работу
4. **Следуйте задачам по порядку**
5. **Отмечайте выполненные задачи** в критериях готовности

---

## 📝 Примечания

- Все оценки времени приблизительные и могут варьироваться
- Некоторые задачи можно выполнять параллельно
- Рекомендуется делать коммиты после каждой завершенной задачи
- Тестирование должно быть частью каждой фазы

---

**Последнее обновление:** 2025-01-XX  
**Версия документа:** 1.0
