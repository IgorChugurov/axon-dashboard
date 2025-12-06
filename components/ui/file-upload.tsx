"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Upload, X, File, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  uploadFiles,
  deleteFiles,
  getFilesByIds,
} from "@/lib/storage/file-service";
import type { EntityFile } from "@igorchugurov/public-api-sdk";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export interface FileUploadProps {
  value?: string[]; // массив ID файлов из entity_file
  onChange: (fileIds: string[]) => void;
  entityInstanceId: string;
  fieldId?: string | null;
  displayMode?: "files" | "images"; // files - список, images - img теги
  accept?: string; // MIME types
  maxSize?: number; // в байтах
  maxFiles?: number;
  bucket?: string;
  folder?: string;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  value = [],
  onChange,
  entityInstanceId,
  fieldId,
  displayMode = "files",
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
  const [files, setFiles] = useState<EntityFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    fileId: string | null;
    fileName: string | null;
  }>({
    open: false,
    fileId: null,
    fileName: null,
  });

  // Загружаем файлы при монтировании и при изменении value
  const loadFiles = useCallback(async () => {
    if (!value || value.length === 0) {
      setFiles([]);
      return;
    }

    setLoadingFiles(true);
    try {
      const loadedFiles = await getFilesByIds(value);
      setFiles(loadedFiles);
    } catch (err) {
      console.error("Error loading files:", err);
      setError(err instanceof Error ? err.message : "Ошибка загрузки файлов");
    } finally {
      setLoadingFiles(false);
    }
  }, [value]);

  // Загружаем файлы при монтировании и при изменении value
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles || selectedFiles.length === 0) return;

      setError(null);
      setUploading(true);

      try {
        // Конвертируем FileList в массив
        const filesArray = Array.from(selectedFiles);

        // Валидация количества
        const currentCount = value.length;
        const newCount = filesArray.length;
        if (maxFiles && currentCount + newCount > maxFiles) {
          throw new Error(
            `Максимальное количество файлов: ${maxFiles}. Текущее: ${currentCount}, пытаетесь добавить: ${newCount}`
          );
        }

        // Парсим accept типы
        const acceptTypes = accept
          ? accept.split(",").map((t) => t.trim())
          : undefined;

        // Загружаем файлы
        const uploaded = await uploadFiles(filesArray, {
          entityInstanceId,
          fieldId: fieldId || null,
          bucket,
          folder,
          maxSize,
          maxFiles: maxFiles ? maxFiles - currentCount : undefined,
          acceptTypes,
        });

        // Добавляем ID новых файлов к существующим
        const newFileIds = uploaded.map((f) => f.id);
        onChange([...value, ...newFileIds]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки файлов");
      } finally {
        setUploading(false);
        // Сбрасываем input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [
      value,
      onChange,
      entityInstanceId,
      fieldId,
      accept,
      maxSize,
      maxFiles,
      bucket,
      folder,
    ]
  );

  const handleRemoveRequest = useCallback(
    (fileId: string, fileName: string) => {
      if (disabled) return;
      setDeleteDialog({
        open: true,
        fileId,
        fileName,
      });
    },
    [disabled]
  );

  const handleRemoveConfirm = useCallback(async () => {
    if (!deleteDialog.fileId) return;

    try {
      // Удаляем файл из Storage и БД
      await deleteFiles([deleteDialog.fileId], bucket);

      // Удаляем ID из массива
      const newValue = value.filter((id) => id !== deleteDialog.fileId);
      onChange(newValue);

      // Закрываем диалог
      setDeleteDialog({
        open: false,
        fileId: null,
        fileName: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления файла");
      // Закрываем диалог даже при ошибке
      setDeleteDialog({
        open: false,
        fileId: null,
        fileName: null,
      });
    }
  }, [deleteDialog.fileId, value, onChange, bucket]);

  const isImage = (fileType: string) => {
    return fileType.startsWith("image/");
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Загрузка..." : "Загрузить файлы"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled || uploading}
        />
        {maxFiles && (
          <span className="text-sm text-muted-foreground">
            {value.length} / {maxFiles}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loadingFiles && (
        <p className="text-sm text-muted-foreground">Загрузка файлов...</p>
      )}

      {files.length > 0 && (
        <div
          className={cn(
            "space-y-2",
            displayMode === "images" &&
              "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          )}
        >
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                "border rounded p-2",
                displayMode === "images" && isImage(file.fileType)
                  ? "relative aspect-square"
                  : "flex items-center justify-between"
              )}
            >
              {displayMode === "images" && isImage(file.fileType) ? (
                <>
                  <Image
                    src={file.fileUrl}
                    alt={file.fileName}
                    fill
                    className="object-cover rounded"
                  />
                  {!disabled && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() =>
                        handleRemoveRequest(file.id, file.fileName)
                      }
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isImage(file.fileType) ? (
                      <ImageIcon className="h-4 w-4 shrink-0" />
                    ) : (
                      <File className="h-4 w-4 shrink-0" />
                    )}
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate"
                    >
                      {file.fileName}
                    </a>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({(file.fileSize / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleRemoveRequest(file.id, file.fileName)
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({
            open,
            fileId: deleteDialog.fileId,
            fileName: deleteDialog.fileName,
          })
        }
        onConfirm={handleRemoveConfirm}
        title="Удалить файл"
        description="Вы уверены, что хотите удалить этот файл? Это действие нельзя отменить."
        itemName={deleteDialog.fileName}
        confirmButtonText="Удалить"
        cancelButtonText="Отмена"
        variant="destructive"
      />
    </div>
  );
}
