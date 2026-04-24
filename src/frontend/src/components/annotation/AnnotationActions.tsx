import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Save } from "lucide-react";

interface Props {
  hasLawToken: boolean;
  onSaveDraft: () => void;
  onConvert: () => void;
  isSaving: boolean;
  isConverting: boolean;
}

export function AnnotationActions({
  hasLawToken,
  onSaveDraft,
  onConvert,
  isSaving,
  isConverting,
}: Props) {
  return (
    <div
      className="flex items-center gap-2"
      data-ocid="annotation-actions.panel"
    >
      {/* Save Draft */}
      <Button
        data-ocid="annotation-actions.save_button"
        type="button"
        variant="outline"
        onClick={onSaveDraft}
        disabled={isSaving}
        className="border-2 border-dashed border-border rounded-none font-mono text-xs uppercase px-3 h-8 flex items-center gap-1.5"
      >
        {isSaving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Save className="h-3 w-3" />
        )}
        {isSaving ? "Saving..." : "Save Draft"}
      </Button>

      {/* Convert to Source Graph */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                data-ocid="annotation-actions.convert_button"
                type="button"
                onClick={onConvert}
                disabled={!hasLawToken || isConverting}
                className="border-2 border-border rounded-none font-mono text-xs uppercase px-3 h-8 flex items-center gap-1.5 disabled:opacity-40"
              >
                {isConverting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span className="text-xs">⬡</span>
                )}
                {isConverting ? "Converting..." : "Convert to Source Graph"}
              </Button>
            </span>
          </TooltipTrigger>
          {!hasLawToken && (
            <TooltipContent
              data-ocid="annotation-actions.convert.tooltip"
              className="font-mono text-xs rounded-none border-2 border-border"
            >
              Add at least one law token to convert
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
