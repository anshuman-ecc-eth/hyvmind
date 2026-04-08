import type { CustomAttribute, Location, backendInterface } from "@/backend";
import { createActor } from "@/backend";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface CreateLawTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentLocation: Location | null;
  /** 'yes' | 'no' — used for display label */
  side: "yes" | "no";
}

export default function CreateLawTokenDialog({
  open,
  onOpenChange,
  parentLocation,
  side,
}: CreateLawTokenDialogProps) {
  const { actor: _rawActor } = useActor(createActor);
  const actor = _rawActor as backendInterface | null;
  const queryClient = useQueryClient();

  const [meaning, setMeaning] = useState("");
  const [attributes, setAttributes] = useState<CustomAttribute[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setMeaning("");
      setAttributes([]);
    }
  }, [open]);

  const addAttribute = () => {
    setAttributes((prev) => [...prev, { key: "", value: "" }]);
  };

  const updateAttribute = (
    index: number,
    field: "key" | "value",
    value: string,
  ) => {
    setAttributes((prev) =>
      prev.map((attr, i) => (i === index ? { ...attr, [field]: value } : attr)),
    );
  };

  const removeAttribute = (index: number) => {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!meaning.trim()) {
      toast.error("Content is required");
      return;
    }
    if (!parentLocation) {
      toast.error("Parent location not found");
      return;
    }
    if (!actor) {
      toast.error("Not connected");
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedMeaning = meaning.trim();
      const wrappedContent = `{${trimmedMeaning}}`;

      // The backend's createLocation expects a valid swarm ID as parentSwarmId.
      // parentLocation is the Yes/No location node; its parentSwarmId is the actual swarm ID.
      // We pass parentLocation.parentSwarmId so the backend can find the parent swarm,
      // and the law token extracted from {content} will be linked to this location via
      // the createLawTokensForLocation logic in the backend.
      await actor.createLocation(
        trimmedMeaning.slice(0, 80),
        wrappedContent,
        wrappedContent,
        attributes.filter((a) => a.key.trim() !== ""),
        parentLocation.parentSwarmId,
      );
      toast.success(
        `Law Token added to "${side === "yes" ? "Yes" : "No"}" side`,
      );
      queryClient.invalidateQueries({ queryKey: ["allGraphData"] });
      queryClient.invalidateQueries({ queryKey: ["graphData"] });
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      toast.error(msg || "Failed to create Law Token");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sideLabel = side === "yes" ? "Yes" : "No";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Law Token — {sideLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Read-only parent location */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Parent Location
            </Label>
            <Input
              value={sideLabel}
              disabled
              className="opacity-60 cursor-not-allowed bg-muted text-muted-foreground"
            />
          </div>

          {/* Content / Meaning */}
          <div className="space-y-1">
            <Label htmlFor="law-token-meaning">
              Content <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="law-token-meaning"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder="Enter the meaning or content of this law token…"
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          {/* Custom Attributes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Custom Attributes</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addAttribute}
                disabled={isSubmitting}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            {attributes.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No attributes added yet.
              </p>
            )}
            {attributes.map((attr, i) => (
              <div key={`${attr.key}-${attr.value}`} className="flex gap-2">
                <Input
                  value={attr.key}
                  onChange={(e) => updateAttribute(i, "key", e.target.value)}
                  placeholder="Key"
                  className="flex-1"
                  disabled={isSubmitting}
                />
                <Input
                  value={attr.value}
                  onChange={(e) => updateAttribute(i, "value", e.target.value)}
                  placeholder="Value"
                  className="flex-1"
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAttribute(i)}
                  disabled={isSubmitting}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !meaning.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : (
              "Add Law Token"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
