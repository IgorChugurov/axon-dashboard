/**
 * DeleteSection Component
 * Renders a section with a delete button and confirmation modal
 * Uses ConfirmationDialog for the modal
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { SectionAction } from "../types";

interface DeleteSectionProps {
  action: SectionAction;
  onDelete: () => Promise<void>;
  itemName?: string; // For replacing {itemName} in modal text
  onlyButton?: boolean;
}

export function DeleteSection({
  action,
  onDelete,
  itemName,
  onlyButton = false,
}: DeleteSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { options } = action;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      setIsOpen(false);
    } catch (error) {
      console.error("Delete error:", error);
      // Error handling is done in parent component
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {onlyButton ? (
        <Button
          type="button"
          variant="destructive"
          onClick={() => setIsOpen(true)}
          className="w-full sm:w-auto"
        >
          {action.title || "Delete"}
        </Button>
      ) : (
        <div className="space-y-6 pt-6 border-t border-destructive/20">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-tight text-destructive">
              {action.title || "Danger Zone"}
            </h3>
            <div className="h-1 w-12 bg-destructive rounded-full" />
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. This will permanently delete this
              item.
            </p>

            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsOpen(true)}
              className="w-full sm:w-auto"
            >
              {action.title || "Delete"}
            </Button>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={options.modalTitle}
        description={options.modalText}
        itemName={itemName}
        confirmWord={options.confirmWord}
        confirmWordLabel={options.confirmText}
        confirmButtonText={action.title || "Delete"}
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </>
  );
}
