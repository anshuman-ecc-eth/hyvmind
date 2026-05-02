import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  nodeName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// DeleteConfirmDialog
// ---------------------------------------------------------------------------

export function DeleteConfirmDialog({
  isOpen,
  nodeName,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onCancel}
        onKeyDown={onCancel}
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
        data-ocid="delete_confirm.dialog"
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card border border-border shadow-lg p-5"
      >
        {/* Title */}
        <h2
          id="delete-dialog-title"
          className="text-base font-semibold text-foreground mb-2"
        >
          Delete node?
        </h2>

        {/* Description */}
        <p
          id="delete-dialog-desc"
          className="text-sm text-muted-foreground leading-relaxed mb-5"
        >
          Are you sure you want to delete{" "}
          <span className="font-medium text-foreground">{nodeName}</span>? This
          action cannot be undone.
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            data-ocid="delete_confirm.cancel_button"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            data-ocid="delete_confirm.confirm_button"
            onClick={onConfirm}
          >
            Delete
          </Button>
        </div>
      </div>
    </>
  );
}
