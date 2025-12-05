# Quick Start: Создание новой сущности

**Время:** ~15 минут  
**Сложность:** Легко

---

## 📋 Чеклист

```
□ 1. SQL: Создать таблицу в Supabase
□ 2. SQL: Настроить RLS политики
□ 3. TS:  Создать types.ts
□ 4. TS:  Создать service.ts
□ 5. TS:  Создать actions.ts (копипаста)
□ 6. TS:  Создать page.tsx (список)
□ 7. TS:  Создать new/page.tsx (создание)
□ 8. TS:  Создать [id]/edit/page.tsx (редактирование)
□ 9. TS:  Создать List компонент
□ 10. TS: Создать Form компонент
□ 11. TS: Добавить в навигацию
```

---

## 🚀 Пример: Создаем Products

### 1. SQL: Таблица

```sql
-- Supabase Dashboard → SQL Editor
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_products_name ON products(name);

-- Триггер для updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. SQL: RLS

```sql
-- Включаем RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Чтение: всем
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  USING (true);

-- Запись: только админам
CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );
```

### 3. TypeScript: Types

```typescript
// lib/entities/products/types.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}
```

### 4. TypeScript: Service

```typescript
// lib/entities/products/service.ts
import { createEntityService } from "@/lib/entity-service";
import type { Product } from "./types";

export const productsService = createEntityService<Product>({
  tableName: "products",
  searchFields: ["name", "description"],
  defaultSortBy: "created_at",
  defaultSortOrder: "desc",
});
```

### 5. TypeScript: Actions (48 строк - копипаста)

```typescript
// app/products/actions.ts
"use server";

import { productsService } from "@/lib/entities/products/service";
import { revalidatePath } from "next/cache";
import type { Product } from "@/lib/entities/products/types";

export async function createProductAction(data: Partial<Product>) {
  try {
    const result = await productsService.create(data);
    revalidatePath("/products");
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateProductAction(id: string, data: Partial<Product>) {
  try {
    const result = await productsService.update(id, data);
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deleteProductAction(id: string) {
  try {
    await productsService.delete(id);
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

### 6. TypeScript: Page (список)

```typescript
// app/products/page.tsx
import { productsService } from "@/lib/entities/products/service";
import { ProductsList } from "@/components/ProductsList";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  
  const { data, pagination } = await productsService.getAll({
    page: parseInt(params.page || "1"),
    pageSize: 20,
    search: params.search || "",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your products</p>
        </div>
        <Button asChild>
          <Link href="/products/new">Create Product</Link>
        </Button>
      </div>

      <ProductsList
        initialData={data}
        initialPagination={pagination}
        initialSearch={params.search || ""}
      />
    </div>
  );
}
```

### 7. TypeScript: Page (создание)

```typescript
// app/products/new/page.tsx
import { ProductForm } from "@/components/forms/ProductForm";
import { createProductAction } from "../actions";

export default function NewProductPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Product</h1>
        <p className="text-muted-foreground">Add a new product</p>
      </div>

      <ProductForm onSubmit={createProductAction} />
    </div>
  );
}
```

### 8. TypeScript: Page (редактирование)

```typescript
// app/products/[id]/edit/page.tsx
import { productsService } from "@/lib/entities/products/service";
import { EditProductClient } from "./EditProductClient";
import { notFound } from "next/navigation";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await productsService.getById(id);

  if (!product) {
    notFound();
  }

  return <EditProductClient product={product} />;
}
```

```typescript
// app/products/[id]/edit/EditProductClient.tsx
"use client";

import { ProductForm } from "@/components/forms/ProductForm";
import { updateProductAction } from "../../actions";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/entities/products/types";

interface EditProductClientProps {
  product: Product;
}

export function EditProductClient({ product }: EditProductClientProps) {
  const router = useRouter();

  const handleSubmit = async (data: Partial<Product>) => {
    return await updateProductAction(product.id, data);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Product</h1>
        <p className="text-muted-foreground">Update product details</p>
      </div>

      <ProductForm
        initialData={product}
        onSubmit={handleSubmit}
        isEdit
      />
    </div>
  );
}
```

### 9. TypeScript: List Component

```typescript
// components/ProductsList.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EntityList } from "./EntityList";
import { deleteProductAction } from "@/app/products/actions";
import { Button } from "./ui/button";
import type { Product } from "@/lib/entities/products/types";
import type { PaginationInfo } from "@/lib/entity-service";

interface ProductsListProps {
  initialData: Product[];
  initialPagination: PaginationInfo;
  initialSearch?: string;
}

export function ProductsList({
  initialData,
  initialPagination,
  initialSearch = "",
}: ProductsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;

    startTransition(async () => {
      const result = await deleteProductAction(id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  return (
    <EntityList
      entityName="products"
      initialData={initialData}
      initialPagination={initialPagination}
      initialSearch={initialSearch}
      searchFields={["name", "description"]}
      renderItem={(product) => (
        <div className="flex items-center justify-between p-6 border rounded-lg bg-card">
          <div className="space-y-1">
            <h3 className="font-semibold">{product.name}</h3>
            <p className="text-sm text-muted-foreground">
              ${product.price.toFixed(2)}
            </p>
            {product.description && (
              <p className="text-sm text-muted-foreground">
                {product.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/products/${product.id}/edit`)}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(product.id)}
              disabled={isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
      deleteAction={deleteProductAction}
    />
  );
}
```

### 10. TypeScript: Form Component

```typescript
// components/forms/ProductForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EntityForm } from "./EntityForm";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import type { Product } from "@/lib/entities/products/types";

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: Partial<Product>) => Promise<{
    success: boolean;
    error?: string;
    data?: Product;
  }>;
  isEdit?: boolean;
}

export function ProductForm({
  initialData,
  onSubmit,
  isEdit = false,
}: ProductFormProps) {
  const router = useRouter();

  return (
    <EntityForm<Partial<Product>>
      initialData={
        initialData
          ? {
              name: initialData.name,
              price: initialData.price,
              description: initialData.description,
            }
          : {
              name: "",
              price: 0,
              description: "",
            }
      }
      onSubmit={onSubmit}
      onSuccess={() => router.push("/products")}
    >
      {(formData, setFormData) => (
        <>
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Product name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price || 0}
              onChange={(e) =>
                setFormData({ ...formData, price: parseFloat(e.target.value) })
              }
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Product description"
              rows={4}
            />
          </div>
        </>
      )}
    </EntityForm>
  );
}
```

### 11. TypeScript: Навигация

```typescript
// components/AppSidebar.tsx
// Добавьте в массив navItems:

{
  title: "Products",
  url: "/products",
  icon: Package, // импортируйте из lucide-react
}
```

---

## ✅ Готово!

Теперь у вас есть полноценный CRUD для Products:

- ✅ `/products` - список
- ✅ `/products/new` - создание
- ✅ `/products/[id]/edit` - редактирование
- ✅ Поиск и пагинация
- ✅ Server Actions для мутаций
- ✅ RLS для безопасности

---

## 📚 Дополнительно

### Добавить фильтры

```typescript
// app/products/page.tsx
const { data, pagination } = await productsService.getAll({
  page: parseInt(params.page || "1"),
  search: params.search || "",
  filters: parseFiltersFromUrl(params, {
    simpleFilters: [
      { paramName: "min_price", field: "price", operator: "gte" },
      { paramName: "max_price", field: "price", operator: "lte" },
    ],
  }),
});
```

### Добавить hooks

```typescript
// lib/entities/products/service.ts
export const productsService = createEntityService<Product>({
  tableName: "products",
  searchFields: ["name", "description"],
  hooks: {
    beforeCreate: async (data) => {
      // Валидация
      if (data.price && data.price < 0) {
        throw new Error("Price cannot be negative");
      }
      return data;
    },
  },
});
```

---

## 🎯 Следующие шаги

1. Запустите `pnpm dev`
2. Откройте `/products`
3. Создайте тестовый продукт
4. Проверьте редактирование и удаление

**Всё работает? Поздравляю! 🎉**

---

*См. также:*
- `ENTITY_SERVICE_FINAL.md` - полная документация
- `PROJECT_STATUS_2025_11_15.md` - текущий статус
- Примеры: `lib/entities/posts/` - самый сложный пример

