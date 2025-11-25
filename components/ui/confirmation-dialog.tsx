/**
 * ConfirmationDialog Component
 * Universal confirmation dialog for destructive or important actions
 * Based on DeleteSection pattern but more flexible
 */

"use client";

import { useState, useEffect } from "react";
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

export interface ConfirmationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when user confirms the action */
  onConfirm: () => Promise<void> | void;

  /** Dialog title - default: "Confirm Action" */
  title?: string;
  /** Dialog description - default: "Are you sure you want to proceed?" */
  description?: string;
  /** Name of the item being acted upon (e.g., for deletion) */
  itemName?: string | null;

  /** Text for confirm button - default: "Confirm" */
  confirmButtonText?: string;
  /** Text for cancel button - default: "Cancel" */
  cancelButtonText?: string;

  /** Visual variant - default: "destructive" */
  variant?: "destructive" | "warning" | "default";

  /** If provided, user must type this word to confirm */
  confirmWord?: string;
  /** Label for the confirmation input - default: `Type "{confirmWord}" to confirm` */
  confirmWordLabel?: string;

  /** External loading state (if not provided, managed internally) */
  isLoading?: boolean;
}

/**
 * Default texts for the dialog
 */
const defaultTexts = {
  title: "Confirm Action",
  description: "Are you sure you want to proceed?",
  confirmButtonText: "Confirm",
  cancelButtonText: "Cancel",
};

/**
 * Generate description with item name if provided
 * Supports placeholders: {itemName}, ${itemName}, {name} (for backward compatibility)
 */
function getDescription(
  description: string | undefined,
  itemName: string | null | undefined,
  variant: string
): string {
  if (description) {
    // Replace placeholders if itemName is provided
    if (itemName) {
      return description
        .replace(/\{itemName\}/g, itemName)
        .replace(/\$\{itemName\}/g, itemName)
        .replace(/\{name\}/g, itemName); // backward compatibility
    }
    return description;
  }

  // Generate default description based on variant and itemName
  if (variant === "destructive") {
    if (itemName) {
      return `Are you sure you want to delete "${itemName}"? This action cannot be undone.`;
    }
    return "Are you sure you want to delete this item? This action cannot be undone.";
  }

  return defaultTexts.description;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title = defaultTexts.title,
  description,
  itemName,
  confirmButtonText = defaultTexts.confirmButtonText,
  cancelButtonText = defaultTexts.cancelButtonText,
  variant = "destructive",
  confirmWord,
  confirmWordLabel,
  isLoading: externalLoading,
}: ConfirmationDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [internalLoading, setInternalLoading] = useState(false);

  // Use external loading if provided, otherwise use internal
  const isLoading = externalLoading ?? internalLoading;

  // Whether confirmation word input is required
  const needsConfirmation = Boolean(confirmWord);

  // Can user confirm? (either no confirmation needed, or text matches)
  const canConfirm = !needsConfirmation || confirmText === confirmWord;

  // Reset confirm text when dialog closes
  useEffect(() => {
    if (!open) {
      setConfirmText("");
    }
  }, [open]);

  // Final description with item name substitution
  const finalDescription = getDescription(description, itemName, variant);

  // Default confirm word label
  const finalConfirmWordLabel =
    confirmWordLabel || `Type "${confirmWord}" to confirm`;

  // Handle confirm action
  const handleConfirm = async () => {
    if (!canConfirm) return;

    // Only manage internal loading if external is not provided
    if (externalLoading === undefined) {
      setInternalLoading(true);
    }

    try {
      await onConfirm();
      // Dialog will be closed by parent via onOpenChange
    } catch (error) {
      console.error("Confirmation action error:", error);
      // Error handling should be done in parent component
    } finally {
      if (externalLoading === undefined) {
        setInternalLoading(false);
      }
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (isLoading) return;
    setConfirmText("");
    onOpenChange(false);
  };

  // Get button variant based on dialog variant
  const getButtonVariant = () => {
    switch (variant) {
      case "destructive":
        return "destructive";
      case "warning":
        return "outline"; // or could be a custom warning variant
      default:
        return "default";
    }
  };

  return (
    <Dialog open={open} onOpenChange={isLoading ? undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{finalDescription}</DialogDescription>
        </DialogHeader>

        {needsConfirmation && confirmWord && (
          <div className="space-y-2">
            <Label htmlFor="confirm-text">{finalConfirmWordLabel}</Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmWord}
              disabled={isLoading}
              autoComplete="off"
            />
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelButtonText}
          </Button>
          <Button
            type="button"
            variant={getButtonVariant()}
            onClick={handleConfirm}
            disabled={isLoading || !canConfirm}
          >
            {isLoading ? "Processing..." : confirmButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

