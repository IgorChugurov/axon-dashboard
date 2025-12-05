/**
 * Сервис для работы с файлами в Supabase Storage
 * Всегда работает с массивами файлов, даже для одного файла
 * Использует клиентский Supabase клиент для работы в браузере
 */

import { createClient } from "@/lib/supabase/client";
import type { EntityFile } from "@/lib/universal-entity/types";

export interface FileUploadOptions {
  entityInstanceId: string;
  fieldId?: string | null;
  bucket?: string; // из .env если не указано
  folder?: string; // подпапка в bucket (например, "avatars", "documents")
  maxSize?: number; // в байтах (из EntityDefinition или Field)
  maxFiles?: number; // из EntityDefinition или Field
  acceptTypes?: string[]; // MIME types
}

export interface UploadedFile {
  id: string; // ID записи в entity_file
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

/**
 * Получить имя bucket из переменных окружения
 */
function getBucketName(): string {
  return process.env.NEXT_PUBLIC_STORAGE_BUCKET || "files";
}

/**
 * Валидация размера файла
 */
function validateFileSize(file: File, maxSize?: number): void {
  if (maxSize && file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(
      `Размер файла ${file.name} превышает лимит ${maxSizeMB}MB (загружено: ${fileSizeMB}MB)`
    );
  }
}

/**
 * Валидация типа файла
 */
function validateFileType(file: File, acceptTypes?: string[]): void {
  if (!acceptTypes || acceptTypes.length === 0) {
    return; // Если типы не указаны, принимаем все
  }

  const isValid = acceptTypes.some((type) => {
    if (type.endsWith("/*")) {
      // Паттерн типа (например, "image/*")
      const prefix = type.slice(0, -1);
      return file.type.startsWith(prefix);
    }
    // Точное совпадение
    return file.type === type;
  });

  if (!isValid) {
    throw new Error(
      `Тип файла ${file.type} не разрешен. Разрешенные типы: ${acceptTypes.join(
        ", "
      )}`
    );
  }
}

/**
 * Генерация уникального имени файла
 */
function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split(".").pop() || "";
  return `${timestamp}-${random}.${extension}`;
}

/**
 * Загрузка массива файлов
 * Всегда работает с массивом, даже если файл один
 */
export async function uploadFiles(
  files: File[],
  options: FileUploadOptions
): Promise<UploadedFile[]> {
  const supabase = createClient();
  const bucket = options.bucket || getBucketName();
  const folder = options.folder || "";

  // Валидация количества файлов
  if (options.maxFiles && files.length > options.maxFiles) {
    throw new Error(
      `Превышено максимальное количество файлов: ${options.maxFiles} (попытка загрузить: ${files.length})`
    );
  }

  // Валидация каждого файла
  files.forEach((file) => {
    validateFileSize(file, options.maxSize);
    validateFileType(
      file,
      options.acceptTypes?.filter(Boolean) as string[] | undefined
    );
  });

  const uploadedFiles: UploadedFile[] = [];

  // Загружаем файлы последовательно (можно распараллелить, но для контроля лучше последовательно)
  for (const file of files) {
    try {
      // Генерируем уникальное имя
      const fileName = generateFileName(file.name);
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Конвертируем File в ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Загружаем в Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `Ошибка загрузки файла ${file.name}: ${uploadError.message}`
        );
      }

      // Получаем публичный URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      // Получаем текущего пользователя
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Создаем запись в entity_file
      const { data: fileRecord, error: dbError } = await supabase
        .from("entity_file")
        .insert({
          entity_instance_id: options.entityInstanceId,
          field_id: options.fieldId || null,
          file_url: publicUrl,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_bucket: bucket,
          uploaded_by: user?.id || null,
        } as never)
        .select()
        .single();

      if (dbError) {
        // Если ошибка БД, удаляем файл из Storage
        await supabase.storage.from(bucket).remove([filePath]);
        throw new Error(
          `Ошибка сохранения записи о файле ${file.name}: ${dbError.message}`
        );
      }

      uploadedFiles.push({
        id: (fileRecord as { id: string }).id,
        url: publicUrl,
        path: filePath,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    } catch (error) {
      // Если ошибка при загрузке одного файла, удаляем уже загруженные
      if (uploadedFiles.length > 0) {
        await deleteFiles(
          uploadedFiles.map((f) => f.id),
          bucket
        );
      }
      throw error;
    }
  }

  return uploadedFiles;
}

/**
 * Удаление файлов по ID записей в entity_file
 */
export async function deleteFiles(
  fileIds: string[],
  bucket?: string
): Promise<void> {
  if (fileIds.length === 0) {
    return;
  }

  const supabase = createClient();
  const bucketName = bucket || getBucketName();

  // Получаем информацию о файлах
  const { data: files, error: fetchError } = (await supabase
    .from("entity_file")
    .select("id, file_path, storage_bucket")
    .in("id", fileIds)) as {
    data: Array<{
      id: string;
      file_path: string;
      storage_bucket: string;
    }> | null;
    error: any;
  };

  if (fetchError) {
    throw new Error(
      `Ошибка получения информации о файлах: ${fetchError.message}`
    );
  }

  if (!files || files.length === 0) {
    return; // Файлы уже удалены или не существуют
  }

  // Группируем файлы по bucket
  const filesByBucket = new Map<string, string[]>();
  files.forEach((file) => {
    const fileBucket = file.storage_bucket || bucketName;
    if (!filesByBucket.has(fileBucket)) {
      filesByBucket.set(fileBucket, []);
    }
    filesByBucket.get(fileBucket)!.push(file.file_path);
  });

  // Удаляем файлы из Storage
  for (const [fileBucket, paths] of filesByBucket.entries()) {
    const { error: storageError } = await supabase.storage
      .from(fileBucket)
      .remove(paths);

    if (storageError) {
      console.error(`Ошибка удаления файлов из Storage:`, storageError);
      // Продолжаем удаление записей из БД даже если Storage ошибка
    }
  }

  // Удаляем записи из БД
  const { error: dbError } = await supabase
    .from("entity_file")
    .delete()
    .in("id", fileIds);

  if (dbError) {
    throw new Error(`Ошибка удаления записей о файлах: ${dbError.message}`);
  }
}

/**
 * Получить все файлы для экземпляра сущности
 */
export async function getFilesForInstance(
  entityInstanceId: string,
  fieldId?: string | null
): Promise<EntityFile[]> {
  const supabase = createClient();

  let query = supabase
    .from("entity_file")
    .select("*")
    .eq("entity_instance_id", entityInstanceId)
    .order("created_at", { ascending: false });

  if (fieldId) {
    query = query.eq("field_id", fieldId);
  }

  const { data, error } = (await query) as {
    data: Array<{
      id: string;
      entity_instance_id: string;
      field_id: string | null;
      file_url: string;
      file_path: string;
      file_name: string;
      file_size: number;
      file_type: string;
      storage_bucket: string;
      uploaded_by: string | null;
      created_at: string;
      updated_at: string;
    }> | null;
    error: any;
  };

  if (error) {
    throw new Error(`Ошибка получения файлов: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    entityInstanceId: row.entity_instance_id,
    fieldId: row.field_id,
    fileUrl: row.file_url,
    filePath: row.file_path,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileType: row.file_type,
    storageBucket: row.storage_bucket,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Получить файлы по ID
 */
export async function getFilesByIds(fileIds: string[]): Promise<EntityFile[]> {
  if (fileIds.length === 0) {
    return [];
  }

  const supabase = createClient();

  const { data, error } = (await supabase
    .from("entity_file")
    .select("*")
    .in("id", fileIds)
    .order("created_at", { ascending: false })) as {
    data: Array<{
      id: string;
      entity_instance_id: string;
      field_id: string | null;
      file_url: string;
      file_path: string;
      file_name: string;
      file_size: number;
      file_type: string;
      storage_bucket: string;
      uploaded_by: string | null;
      created_at: string;
      updated_at: string;
    }> | null;
    error: any;
  };

  if (error) {
    throw new Error(`Ошибка получения файлов: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    entityInstanceId: row.entity_instance_id,
    fieldId: row.field_id,
    fileUrl: row.file_url,
    filePath: row.file_path,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileType: row.file_type,
    storageBucket: row.storage_bucket,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
