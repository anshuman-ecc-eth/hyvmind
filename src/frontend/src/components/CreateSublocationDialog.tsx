import type { Sublocation } from "@/backend";
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
import { useCreateSublocation, useGetAllData } from "@/hooks/useQueries";
import { Link2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface CreateSublocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentLawTokenId: string;
}

export default function CreateSublocationDialog({
  open,
  onOpenChange,
  parentLawTokenId,
}: CreateSublocationDialogProps) {
  const { data: graphData } = useGetAllData();
  const createSublocation = useCreateSublocation();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setContent("");
    }
  }, [open]);

  const parentLawToken = graphData?.lawTokens.find(
    (lt) => lt.id === parentLawTokenId,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await createSublocation.mutateAsync({
      title: title.trim(),
      content: content.trim(),
      originalTokenSequence: content.trim(),
      parentLawTokenIds: [parentLawTokenId],
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">
            Create Sublocation
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Attached law token — greyed out, locked */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Attached to</Label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted border border-border text-sm text-muted-foreground">
              <Link2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {parentLawToken?.tokenLabel ?? parentLawTokenId}
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="sl-title" className="text-xs text-muted-foreground">
              Title
            </Label>
            <Input
              id="sl-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sublocation title"
              className="text-sm"
              data-ocid="create_sublocation.input"
              required
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label
              htmlFor="sl-content"
              className="text-xs text-muted-foreground"
            >
              Content
              <span className="ml-1 text-muted-foreground/60">
                (use {"{}"} for law tokens, e.g. {"{ token name }"})
              </span>
            </Label>
            <Textarea
              id="sl-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe this sublocation…"
              rows={4}
              className="text-sm resize-none"
              data-ocid="create_sublocation.textarea"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              data-ocid="create_sublocation.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || createSublocation.isPending}
              data-ocid="create_sublocation.submit_button"
            >
              {createSublocation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Sublocation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
