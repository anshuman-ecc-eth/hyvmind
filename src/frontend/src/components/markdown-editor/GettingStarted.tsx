import { Button } from "@/components/ui/button";
import { FolderPlus, Upload } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GettingStartedProps {
  onCreate: () => void;
  onImport: () => void;
}

// ---------------------------------------------------------------------------
// GettingStarted
// ---------------------------------------------------------------------------

export function GettingStarted({ onCreate, onImport }: GettingStartedProps) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-6 bg-background p-8"
      data-ocid="getting_started.panel"
    >
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <FolderPlus className="w-8 h-8 text-muted-foreground" />
      </div>

      {/* Text */}
      <div className="text-center space-y-1 max-w-xs">
        <h2 className="text-base font-semibold text-foreground">
          Create your first curation
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Start by creating a new curation folder or importing a ZIP file
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="button"
          variant="default"
          data-ocid="getting_started.create_button"
          onClick={onCreate}
          className="flex items-center gap-2"
        >
          <FolderPlus size={15} />
          Create Curation
        </Button>
        <Button
          type="button"
          variant="outline"
          data-ocid="getting_started.import_button"
          onClick={onImport}
          className="flex items-center gap-2"
        >
          <Upload size={15} />
          Import ZIP
        </Button>
      </div>
    </div>
  );
}
