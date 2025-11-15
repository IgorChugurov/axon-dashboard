/**
 * Страница редактирования тега
 */

import { tagsService } from "@/lib/entities/tags/service";
import { EditTagClient } from "./EditTagClient";
import { notFound } from "next/navigation";

interface EditTagPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTagPage({ params }: EditTagPageProps) {
  const { id } = await params;

  // SSR: Загружаем тег на сервере
  const tag = await tagsService.getById(id);

  if (!tag) {
    notFound();
  }

  return <EditTagClient tag={tag} />;
}

