/**
 * DeleteSection Component
 * Renders a section with a delete button and confirmation modal
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SectionAction } from "../types";

interface DeleteSectionProps {
  action: SectionAction;
  onDelete: () => Promise<void>;
  itemName?: string; // For replacing ${item.name} in modal text
}

export function DeleteSection({
  action,
  onDelete,
  itemName,
}: DeleteSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const { options } = action;
  const needsConfirmation = Boolean(options.confirmWord);

  // Replace {name} or ${item.name} placeholder if itemName is provided
  let modalText = options.modalText;
  if (itemName) {
    modalText = modalText.replace(/\$\{item\.name\}/g, itemName);
    modalText = modalText.replace(/\{name\}/g, itemName);
  }

  const handleDelete = async () => {
    if (needsConfirmation && confirmText !== options.confirmWord) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete();
      setIsOpen(false);
      setConfirmText("");
    } catch (error) {
      console.error("Delete error:", error);
      // Error handling is done in parent component
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{options.modalTitle}</DialogTitle>
            <DialogDescription>{modalText}</DialogDescription>
          </DialogHeader>

          {needsConfirmation && options.confirmWord && (
            <div className="space-y-2">
              <Label htmlFor="confirm-text">
                {options.confirmText ||
                  `To confirm, type "${options.confirmWord}"`}
              </Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={options.confirmWord}
                disabled={isDeleting}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setConfirmText("");
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={
                isDeleting ||
                (needsConfirmation && confirmText !== options.confirmWord)
              }
            >
              {isDeleting ? "Deleting..." : action.title || "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
