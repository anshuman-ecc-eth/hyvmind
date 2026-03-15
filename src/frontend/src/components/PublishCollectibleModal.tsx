import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";

interface PublishCollectibleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swarmName: string;
  swarmTags: string[];
}

export default function PublishCollectibleModal({
  open,
  onOpenChange,
  swarmName,
  swarmTags,
}: PublishCollectibleModalProps) {
  const [title, setTitle] = useState(swarmName);
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [_imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish as Collectible</DialogTitle>
          <DialogDescription>
            Turn this Question of Law into an open-membership collectible badge.
            Anyone who mints it joins the swarm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Collectible image */}
          <div className="space-y-2">
            <Label>Collectible Image</Label>
            {imagePreview ? (
              <div className="relative w-full aspect-square max-w-[200px] mx-auto rounded-lg overflow-hidden border border-border">
                <img
                  src={imagePreview}
                  alt="Collectible preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-1.5 right-1.5 bg-background/80 hover:bg-background rounded-full p-0.5 border border-border transition-colors"
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full aspect-square max-w-[200px] mx-auto rounded-lg border-2 border-dashed border-border hover:border-foreground/40 transition-colors bg-muted/30 hover:bg-muted/50 cursor-pointer"
              >
                <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">
                  Click to upload image
                </span>
                <span className="text-xs text-muted-foreground/60 mt-0.5">
                  PNG, JPG, GIF up to 10MB
                </span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="collectible-title">Title</Label>
            <Input
              id="collectible-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Collectible title"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="collectible-description">Description</Label>
            <Textarea
              id="collectible-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this question of law…"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Tags */}
          {swarmTags.length > 0 && (
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {swarmTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs font-mono px-1.5 py-0"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Copies note */}
          <p className="text-xs text-muted-foreground border border-border rounded-md px-3 py-2 bg-muted/20">
            <span className="font-medium text-foreground">
              Unlimited copies
            </span>{" "}
            — this collectible functions as an open membership badge. There is
            no cap on the number of editions.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleClose}>
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
