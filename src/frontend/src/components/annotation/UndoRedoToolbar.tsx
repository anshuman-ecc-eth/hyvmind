import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function UndoRedoToolbar({ canUndo, canRedo, onUndo, onRedo }: Props) {
  return (
    <div className="flex items-center gap-1" data-ocid="undo-redo.toolbar">
      <Button
        data-ocid="undo-redo.undo_button"
        type="button"
        variant="outline"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo}
        className="flex items-center gap-1 border-2 border-dashed border-border rounded-none font-mono text-xs uppercase px-2 h-7 disabled:opacity-40"
      >
        <ArrowLeft className="h-3 w-3" />
        Undo
      </Button>
      <Button
        data-ocid="undo-redo.redo_button"
        type="button"
        variant="outline"
        size="sm"
        onClick={onRedo}
        disabled={!canRedo}
        className="flex items-center gap-1 border-2 border-dashed border-border rounded-none font-mono text-xs uppercase px-2 h-7 disabled:opacity-40"
      >
        Redo
        <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
