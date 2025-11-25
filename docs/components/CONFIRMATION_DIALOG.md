# ConfirmationDialog Component

> **ВАЖНО**: Всегда используйте этот компонент для подтверждения деструктивных или важных действий пользователя вместо браузерного `confirm()` или `alert()`.

## Назначение

`ConfirmationDialog` — универсальный компонент модального окна подтверждения действий. Используется для:

- ✅ Подтверждения удаления элементов
- ✅ Подтверждения необратимых действий
- ✅ Предупреждений перед важными операциями
- ✅ Любых действий, требующих явного подтверждения пользователя

## Расположение

```
components/ui/confirmation-dialog.tsx
```

## Импорт

```tsx
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
```

## API

### Props

| Prop | Тип | Обязательный | По умолчанию | Описание |
|------|-----|--------------|--------------|----------|
| `open` | `boolean` | ✅ | - | Открыт ли диалог |
| `onOpenChange` | `(open: boolean) => void` | ✅ | - | Callback при изменении состояния |
| `onConfirm` | `() => Promise<void> \| void` | ✅ | - | Callback при подтверждении |
| `title` | `string` | ❌ | `"Confirm Action"` | Заголовок диалога |
| `description` | `string` | ❌ | Авто-генерация | Текст описания |
| `itemName` | `string \| null` | ❌ | - | Имя элемента для подстановки в текст |
| `confirmButtonText` | `string` | ❌ | `"Confirm"` | Текст кнопки подтверждения |
| `cancelButtonText` | `string` | ❌ | `"Cancel"` | Текст кнопки отмены |
| `variant` | `"destructive" \| "warning" \| "default"` | ❌ | `"destructive"` | Визуальный стиль |
| `confirmWord` | `string` | ❌ | - | Слово для ввода подтверждения |
| `confirmWordLabel` | `string` | ❌ | Авто-генерация | Текст лейбла для поля ввода |
| `isLoading` | `boolean` | ❌ | Внутреннее | Состояние загрузки |

### Подстановка имени элемента

В `description` можно использовать плейсхолдеры:
- `{itemName}` — заменяется на значение `itemName`
- `${itemName}` — альтернативный синтаксис

Если `description` не указан, но указан `itemName`, автоматически генерируется текст:
```
Are you sure you want to delete "{itemName}"? This action cannot be undone.
```

## Примеры использования

### Базовое использование (удаление)

```tsx
import { useState } from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

function MyComponent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteItem(itemId);
      setDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button variant="destructive" onClick={() => setDialogOpen(true)}>
        Delete
      </Button>

      <ConfirmationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Delete Item"
        itemName="My Document"
        confirmButtonText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </>
  );
}
```

### С подтверждением вводом слова

```tsx
<ConfirmationDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  title="Delete Project"
  description="This will permanently delete the project and all associated data."
  itemName={projectName}
  confirmButtonText="Delete Project"
  variant="destructive"
  confirmWord="DELETE"
  confirmWordLabel='Type "DELETE" to confirm deletion'
  onConfirm={handleDeleteProject}
  isLoading={isDeleting}
/>
```

### Предупреждение (не удаление)

```tsx
<ConfirmationDialog
  open={warningOpen}
  onOpenChange={setWarningOpen}
  title="Publish Changes"
  description="Are you sure you want to publish these changes? They will be visible to all users."
  confirmButtonText="Publish"
  cancelButtonText="Go Back"
  variant="warning"
  onConfirm={handlePublish}
/>
```

### Использование в списках (UniversalEntityListClient)

Компонент уже интегрирован в `UniversalEntityListClient` для удаления элементов:

```tsx
// Состояние диалога
const [deleteDialog, setDeleteDialog] = useState<{
  open: boolean;
  id: string | null;
  itemName: string | null;
}>({
  open: false,
  id: null,
  itemName: null,
});

// Открытие диалога
const handleDeleteRequest = (id: string) => {
  const itemName = getItemName(id); // Получаем имя из кэша React Query
  setDeleteDialog({ open: true, id, itemName });
};

// Подтверждение удаления
const handleDeleteConfirm = async () => {
  if (!deleteDialog.id) return;
  await deleteMutation.mutateAsync(deleteDialog.id);
  setDeleteDialog({ open: false, id: null, itemName: null });
};

// В JSX
<ConfirmationDialog
  open={deleteDialog.open}
  onOpenChange={(open) => {
    if (!open) setDeleteDialog({ open: false, id: null, itemName: null });
  }}
  title="Delete Item"
  itemName={deleteDialog.itemName}
  confirmButtonText="Delete"
  variant="destructive"
  onConfirm={handleDeleteConfirm}
  isLoading={deleteMutation.isPending}
/>
```

## Когда использовать

### ✅ ИСПОЛЬЗУЙТЕ ConfirmationDialog для:

1. **Удаления данных** — любое удаление записей, файлов, проектов
2. **Необратимых действий** — публикация, архивирование, отправка
3. **Опасных операций** — сброс настроек, очистка данных
4. **Массовых операций** — удаление нескольких элементов сразу

### ❌ НЕ ИСПОЛЬЗУЙТЕ для:

1. **Информационных сообщений** — используйте Toast
2. **Форм ввода данных** — используйте отдельные формы/модалки
3. **Простых уведомлений** — используйте Toast с соответствующим variant

## Связанные компоненты

- `DeleteSection` (`lib/form-generation/components/DeleteSection.tsx`) — секция удаления в формах, использует похожий паттерн
- `Toast` (`components/ui/toast.tsx`) — для уведомлений о результате операций
- `Dialog` (`components/ui/dialog.tsx`) — базовый компонент диалога

## Интеграция с React Query

При использовании с React Query (как в UniversalEntityListClient):

```tsx
const deleteMutation = useMutation({
  mutationFn: deleteItem,
  onSuccess: () => {
    // Закрываем диалог после успеха
    setDialogOpen(false);
    // Инвалидируем кэш
    queryClient.invalidateQueries({ queryKey: ["items"] });
  },
  onError: (error) => {
    // Показываем ошибку через Toast, диалог остаётся открытым
    toast({ variant: "destructive", title: "Error", description: error.message });
  },
});

<ConfirmationDialog
  // ...
  onConfirm={() => deleteMutation.mutateAsync(itemId)}
  isLoading={deleteMutation.isPending}
/>
```

## Стилизация

Компонент использует:
- `Dialog` из shadcn/ui для базовой структуры
- `Button` с variant `destructive`, `outline`, `default`
- Стандартные CSS классы проекта

Для кастомизации стилей модифицируйте `components/ui/confirmation-dialog.tsx`.

