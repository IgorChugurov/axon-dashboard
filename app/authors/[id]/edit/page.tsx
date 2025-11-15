/**
 * Страница редактирования автора
 */

import { authorsService } from "@/lib/entities/authors/service";
import { EditAuthorClient } from "./EditAuthorClient";
import { notFound } from "next/navigation";

interface EditAuthorPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAuthorPage({ params }: EditAuthorPageProps) {
  const { id } = await params;

  // SSR: Загружаем автора на сервере
  const author = await authorsService.getById(id);

  if (!author) {
    notFound();
  }

  return <EditAuthorClient author={author} />;
}

