# Фаза 2: Content Types Builder - Детальный план

**Статус:** 🟡 В разработке  
**Приоритет:** 🔴 Высокий  
**Оценка времени:** 5-7 дней

---

## 🎯 Цель

Создать визуальный редактор для создания и редактирования `entity_definition` и `field` в стиле Strapi Content Types Builder. Позволяет создавать сущности и поля без знания SQL, через удобный drag & drop интерфейс.

---

## 📋 Общая структура

### Компоненты

1. **EntityDefinitionEditor** - редактор сущности
2. **FieldList** - список полей с drag & drop
3. **FieldEditor** - редактор одного поля
4. **FieldTypeSelector** - выбор типа поля
5. **RelationBuilder** - создание связей
6. **FormPreview** - предпросмотр формы
7. **PermissionEditor** - редактор прав доступа

### Страницы

1. **Builder Page** - главная страница с тремя панелями
2. **Entity List** - список всех сущностей проекта

---

## 📝 Детальные задачи

### Задача 2.1: Создать структуру страницы Builder

**Файл:** `app/projects/[projectId]/entity-definitions/builder/page.tsx`

**Описание:**
Главная страница с тремя панелями:

- Левая: список Entity Definitions
- Центральная: редактор выбранной Entity Definition
- Правая: список полей выбранной Entity Definition

**Код:**

```typescript
import { getEntityDefinitions } from "@/lib/universal-entity/config-service";
import { EntityDefinitionList } from "@/components/entity-definition-builder/EntityDefinitionList";
import { EntityDefinitionEditor } from "@/components/entity-definition-builder/EntityDefinitionEditor";
import { FieldList } from "@/components/entity-definition-builder/FieldList";

export default async function EntityDefinitionBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ entityId?: string }>;
}) {
  const { projectId } = await params;
  const { entityId } = await searchParams;

  const entities = await getEntityDefinitions(projectId);
  const selectedEntity = entityId
    ? entities.find((e) => e.id === entityId)
    : null;

  return (
    <div className="flex h-screen">
      {/* Левая панель: список сущностей */}
      <div className="w-64 border-r">
        <EntityDefinitionList
          projectId={projectId}
          entities={entities}
          selectedId={entityId}
        />
      </div>

      {/* Центральная панель: редактор сущности */}
      <div className="flex-1 border-r">
        {selectedEntity ? (
          <EntityDefinitionEditor
            projectId={projectId}
            entityDefinition={selectedEntity}
          />
        ) : (
          <div className="p-8 text-center text-gray-500">
            Выберите сущность для редактирования
          </div>
        )}
      </div>

      {/* Правая панель: список полей */}
      <div className="w-96">
        {selectedEntity ? (
          <FieldList
            projectId={projectId}
            entityDefinitionId={selectedEntity.id}
          />
        ) : (
          <div className="p-8 text-center text-gray-500">
            Выберите сущность для просмотра полей
          </div>
        )}
      </div>
    </div>
  );
}
```

**Оценка:** 1 час

---

### Задача 2.2: Компонент списка Entity Definitions

**Файл:** `components/entity-definition-builder/EntityDefinitionList.tsx`

**Описание:**
Список всех сущностей проекта с возможностью выбора и создания новой.

**Функционал:**

- Отображение списка сущностей
- Выделение выбранной сущности
- Кнопка "Создать новую сущность"
- Поиск по имени
- Сортировка

**Код:**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import type { EntityDefinition } from "@/lib/universal-entity/types";

interface EntityDefinitionListProps {
  projectId: string;
  entities: EntityDefinition[];
  selectedId?: string;
}

export function EntityDefinitionList({
  projectId,
  entities,
  selectedId,
}: EntityDefinitionListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = entities.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (id: string) => {
    router.push(
      `/projects/${projectId}/entity-definitions/builder?entityId=${id}`
    );
  };

  const handleCreate = () => {
    // Открыть модальное окно создания новой сущности
    // Или перейти на страницу создания
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Input
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map((entity) => (
          <div
            key={entity.id}
            onClick={() => handleSelect(entity.id)}
            className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
              selectedId === entity.id ? "bg-blue-50 border-blue-200" : ""
            }`}
          >
            <div className="font-medium">{entity.name}</div>
            {entity.description && (
              <div className="text-sm text-gray-500 mt-1">
                {entity.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Оценка:** 2 часа

---

### Задача 2.3: Компонент редактора Entity Definition

**Файл:** `components/entity-definition-builder/EntityDefinitionEditor.tsx`

**Описание:**
Редактор базовых свойств сущности и прав доступа.

**Функционал:**

- Редактирование name, description, type
- Настройка прав доступа (createPermission, readPermission, etc.)
- Настройка UI конфигурации
- Настройка пагинации и фильтров
- Сохранение изменений

**Код:**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveEntityDefinitionAction } from "@/app/projects/[projectId]/entity-definitions/builder/actions";
import type { EntityDefinition } from "@/lib/universal-entity/types";

interface EntityDefinitionEditorProps {
  projectId: string;
  entityDefinition: EntityDefinition;
}

export function EntityDefinitionEditor({
  projectId,
  entityDefinition,
}: EntityDefinitionEditorProps) {
  const [formData, setFormData] = useState({
    name: entityDefinition.name,
    description: entityDefinition.description || "",
    type: entityDefinition.type,
    createPermission: entityDefinition.createPermission,
    readPermission: entityDefinition.readPermission,
    updatePermission: entityDefinition.updatePermission,
    deletePermission: entityDefinition.deletePermission,
    enablePagination: entityDefinition.enablePagination ?? true,
    pageSize: entityDefinition.pageSize ?? 20,
    enableFilters: entityDefinition.enableFilters ?? false,
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveEntityDefinitionAction(
        projectId,
        entityDefinition.id,
        formData
      );
      // Показать toast об успехе
    } catch (error) {
      // Показать toast об ошибке
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold">Редактор сущности</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">Общие</TabsTrigger>
            <TabsTrigger value="permissions">Права доступа</TabsTrigger>
            <TabsTrigger value="ui">UI настройки</TabsTrigger>
            <TabsTrigger value="pagination">Пагинация</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4 space-y-4">
            <div>
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="description">Описание</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="type">Тип</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as any })
                }
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="tertiary">Tertiary</option>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="mt-4 space-y-4">
            {/* Редактор прав доступа */}
            <PermissionEditor
              formData={formData}
              onChange={(permissions) =>
                setFormData({ ...formData, ...permissions })
              }
            />
          </TabsContent>

          {/* ... другие табы ... */}
        </Tabs>
      </div>

      <div className="p-6 border-t">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}
```

**Оценка:** 1 день

---

### Задача 2.4: Компонент списка полей с drag & drop

**Файл:** `components/entity-definition-builder/FieldList.tsx`

**Описание:**
Список полей выбранной сущности с возможностью изменения порядка через drag & drop.

**Функционал:**

- Отображение списка полей
- Drag & drop для изменения порядка
- Кнопка "Добавить поле"
- Редактирование поля по клику
- Удаление поля

**Зависимости:**

- Установить `@dnd-kit/core` и `@dnd-kit/sortable`

**Код:**

```typescript
"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getFields } from "@/lib/universal-entity/config-service";
import { reorderFieldsAction } from "@/app/projects/[projectId]/entity-definitions/builder/actions";
import type { Field } from "@/lib/universal-entity/types";
import { FieldEditor } from "./FieldEditor";

interface FieldListProps {
  projectId: string;
  entityDefinitionId: string;
}

function SortableFieldItem({
  field,
  onEdit,
  onDelete,
}: {
  field: Field;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 border rounded mb-2 cursor-move hover:bg-gray-50"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{field.label}</div>
          <div className="text-sm text-gray-500">{field.type}</div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Редактировать
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            Удалить
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FieldList({ projectId, entityDefinitionId }: FieldListProps) {
  const [fields, setFields] = useState<Field[]>([]);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadFields();
  }, [entityDefinitionId]);

  const loadFields = async () => {
    setLoading(true);
    const data = await getFields(entityDefinitionId);
    setFields(data);
    setLoading(false);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);

      const newFields = [...fields];
      const [removed] = newFields.splice(oldIndex, 1);
      newFields.splice(newIndex, 0, removed);

      setFields(newFields);

      // Обновить displayIndex в БД
      await reorderFieldsAction(
        entityDefinitionId,
        newFields.map((f) => f.id)
      );
    }
  };

  if (loading) {
    return <div className="p-4">Загрузка...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <Button size="sm" onClick={() => setEditingField({} as Field)}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить поле
        </Button>
      </div>

      {editingField && (
        <FieldEditor
          projectId={projectId}
          entityDefinitionId={entityDefinitionId}
          field={editingField}
          onClose={() => setEditingField(null)}
          onSave={loadFields}
        />
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            {fields.map((field) => (
              <SortableFieldItem
                key={field.id}
                field={field}
                onEdit={() => setEditingField(field)}
                onDelete={async () => {
                  // Удалить поле
                  await loadFields();
                }}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
```

**Оценка:** 1 день

---

### Задача 2.5: Компонент редактора поля

**Файл:** `components/entity-definition-builder/FieldEditor.tsx`

**Описание:**
Модальное окно или панель для редактирования одного поля.

**Функционал:**

- Редактирование всех свойств поля
- Выбор типа поля через FieldTypeSelector
- Настройка валидации
- Настройка файловых полей (если type = "file" или "files")
- Настройка связей (если dbType = relation)
- Сохранение изменений

**Оценка:** 2 дня

---

### Задача 2.6: Компонент выбора типа поля

**Файл:** `components/entity-definition-builder/FieldTypeSelector.tsx`

**Описание:**
Визуальный селектор типа поля с иконками и описаниями.

**Функционал:**

- Отображение всех доступных типов полей
- Иконки для каждого типа
- Краткое описание
- Предпросмотр компонента

**Оценка:** 4 часа

---

### Задача 2.7: Компонент создания связей

**Файл:** `components/entity-definition-builder/RelationBuilder.tsx`

**Описание:**
Визуальный редактор для создания связей между Entity Definitions.

**Функционал:**

- Выбор целевой Entity Definition
- Выбор типа связи (manyToOne, oneToMany, manyToMany, oneToOne)
- Автоматическое создание обратных полей
- Визуализация связей (граф)

**Оценка:** 1 день

---

### Задача 2.8: Компонент предпросмотра формы

**Файл:** `components/entity-definition-builder/FormPreview.tsx`

**Описание:**
Live preview формы на основе текущей конфигурации полей.

**Функционал:**

- Отображение формы с текущими полями
- Правильные типы компонентов для каждого поля
- Валидация в реальном времени
- Отображение секций

**Оценка:** 4 часа

---

### Задача 2.9: Server Actions для сохранения

**Файл:** `app/projects/[projectId]/entity-definitions/builder/actions.ts`

**Описание:**
Server Actions для сохранения изменений в БД.

**Функционал:**

- `saveEntityDefinitionAction` - сохранение сущности
- `saveFieldAction` - сохранение поля
- `deleteFieldAction` - удаление поля
- `reorderFieldsAction` - изменение порядка полей

**Код:**

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveEntityDefinitionAction(
  projectId: string,
  entityDefinitionId: string,
  data: Partial<EntityDefinition>
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("entity_definition")
    .update({
      name: data.name,
      description: data.description,
      type: data.type,
      create_permission: data.createPermission,
      read_permission: data.readPermission,
      update_permission: data.updatePermission,
      delete_permission: data.deletePermission,
      enable_pagination: data.enablePagination,
      page_size: data.pageSize,
      enable_filters: data.enableFilters,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entityDefinitionId);

  if (error) {
    throw new Error(`Failed to save entity definition: ${error.message}`);
  }

  revalidatePath(`/projects/${projectId}/entity-definitions/builder`);
}

export async function saveFieldAction(
  entityDefinitionId: string,
  fieldId: string | null,
  data: Partial<Field>
) {
  const supabase = await createClient();

  if (fieldId) {
    // Обновление существующего поля
    const { error } = await supabase
      .from("field")
      .update({
        name: data.name,
        type: data.type,
        db_type: data.dbType,
        label: data.label,
        // ... все остальные поля
        updated_at: new Date().toISOString(),
      })
      .eq("id", fieldId);

    if (error) {
      throw new Error(`Failed to save field: ${error.message}`);
    }
  } else {
    // Создание нового поля
    const { error } = await supabase.from("field").insert({
      entity_definition_id: entityDefinitionId,
      name: data.name,
      type: data.type,
      db_type: data.dbType,
      label: data.label,
      // ... все остальные поля
    });

    if (error) {
      throw new Error(`Failed to create field: ${error.message}`);
    }
  }
}

export async function deleteFieldAction(fieldId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("field").delete().eq("id", fieldId);

  if (error) {
    throw new Error(`Failed to delete field: ${error.message}`);
  }
}

export async function reorderFieldsAction(
  entityDefinitionId: string,
  fieldIds: string[]
) {
  const supabase = await createClient();

  // Обновить displayIndex для каждого поля
  for (let i = 0; i < fieldIds.length; i++) {
    const { error } = await supabase
      .from("field")
      .update({ display_index: i })
      .eq("id", fieldIds[i]);

    if (error) {
      throw new Error(`Failed to reorder fields: ${error.message}`);
    }
  }
}
```

**Оценка:** 4 часа

---

## ✅ Критерии готовности

- [ ] Страница Builder создана и доступна по URL
- [ ] Можно просмотреть список всех Entity Definitions проекта
- [ ] Можно выбрать Entity Definition для редактирования
- [ ] Можно редактировать базовые свойства Entity Definition
- [ ] Можно редактировать права доступа
- [ ] Можно просмотреть список полей выбранной Entity Definition
- [ ] Можно добавить новое поле через UI
- [ ] Можно редактировать существующее поле через UI
- [ ] Можно удалить поле
- [ ] Можно изменить порядок полей через drag & drop
- [ ] Можно выбрать тип поля из списка
- [ ] Можно создать связь между Entity Definitions
- [ ] Предпросмотр формы работает и обновляется в реальном времени
- [ ] Все изменения сохраняются в БД
- [ ] После сохранения изменения отображаются в админ-панели

---

## 📦 Зависимости

Перед началом работы установите:

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## 🚀 Порядок выполнения

1. Задача 2.1: Создать структуру страницы Builder
2. Задача 2.2: Компонент списка Entity Definitions
3. Задача 2.9: Server Actions для сохранения
4. Задача 2.3: Компонент редактора Entity Definition
5. Задача 2.4: Компонент списка полей с drag & drop
6. Задача 2.6: Компонент выбора типа поля
7. Задача 2.5: Компонент редактора поля
8. Задача 2.7: Компонент создания связей
9. Задача 2.8: Компонент предпросмотра формы

---

**Готово к началу работы!** 🚀
