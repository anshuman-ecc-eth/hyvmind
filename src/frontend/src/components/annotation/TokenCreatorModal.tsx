import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import type { TokenAnnotation, TokenType } from "../../types/annotation";

const LAW_COLOR = "#DC143C";
const INTERP_COLOR = "#DA70D6";

interface Props {
  open: boolean;
  selectedText: string;
  start: number;
  end: number;
  annotations: TokenAnnotation[];
  onConfirm: (annotation: Omit<TokenAnnotation, "id">) => void;
  onClose: () => void;
}

export function TokenCreatorModal({
  open,
  selectedText,
  start,
  end,
  annotations,
  onConfirm,
  onClose,
}: Props) {
  const [name, setName] = useState("");
  const [tokenType, setTokenType] = useState<TokenType>("lawEntity");
  const [parentLawId, setParentLawId] = useState<string>("");
  const [extraLinks, setExtraLinks] = useState<string[]>([]);

  const lawTokens = annotations.filter((a) => a.tag === "lawEntity");

  useEffect(() => {
    if (open) {
      setName(selectedText.trim().slice(0, 80));
      setTokenType("lawEntity");
      setParentLawId("");
      setExtraLinks([]);
    }
  }, [open, selectedText]);

  const canConfirm =
    tokenType === "lawEntity" ||
    (tokenType === "interpEntity" && !!parentLawId);

  function handleConfirm() {
    const linkedIds =
      tokenType === "interpEntity"
        ? [parentLawId, ...extraLinks.filter((id) => id !== parentLawId)]
        : [];

    onConfirm({
      start,
      end,
      tag: tokenType,
      name: name.trim() || selectedText.trim(),
      color: tokenType === "lawEntity" ? LAW_COLOR : INTERP_COLOR,
      attributes: {},
      inheritedAttributes: {},
      parentLawTokenId: tokenType === "interpEntity" ? parentLawId : undefined,
      linkedLawTokenIds: linkedIds,
    });
    onClose();
  }

  function toggleExtraLink(id: string) {
    setExtraLinks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-ocid="token-creator.dialog"
        className="border-2 border-border rounded-none bg-background font-mono max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-mono text-sm uppercase tracking-widest">
            Create Token
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Selected text preview */}
          <div className="border-2 border-dashed border-border bg-muted px-3 py-2">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
              Selected Text
            </p>
            <p className="text-sm font-mono line-clamp-3 break-words">
              {selectedText}
            </p>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Token Name
            </Label>
            <Input
              data-ocid="token-creator.name.input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this token..."
              className="font-mono text-xs border-2 border-dashed border-border rounded-none bg-background"
            />
          </div>

          {/* Token type */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Token Type
            </Label>
            <div className="flex gap-2">
              <button
                data-ocid="token-creator.type.law"
                type="button"
                onClick={() => setTokenType("lawEntity")}
                style={{
                  borderColor:
                    tokenType === "lawEntity" ? LAW_COLOR : undefined,
                  color: tokenType === "lawEntity" ? LAW_COLOR : undefined,
                  backgroundColor:
                    tokenType === "lawEntity"
                      ? "rgba(220,20,60,0.08)"
                      : undefined,
                }}
                className="flex-1 border-2 border-dashed border-border font-mono text-xs py-2 uppercase tracking-wider transition-colors"
              >
                Law Token
              </button>
              <button
                data-ocid="token-creator.type.interp"
                type="button"
                onClick={() => setTokenType("interpEntity")}
                style={{
                  borderColor:
                    tokenType === "interpEntity" ? INTERP_COLOR : undefined,
                  color:
                    tokenType === "interpEntity" ? INTERP_COLOR : undefined,
                  backgroundColor:
                    tokenType === "interpEntity"
                      ? "rgba(218,112,214,0.08)"
                      : undefined,
                }}
                className="flex-1 border-2 border-dashed border-border font-mono text-xs py-2 uppercase tracking-wider transition-colors"
              >
                Interp Token
              </button>
            </div>
          </div>

          {/* Parent law token (for interp) */}
          {tokenType === "interpEntity" && (
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Parent Law Token <span style={{ color: LAW_COLOR }}>*</span>
              </Label>
              <Select
                value={parentLawId}
                onValueChange={setParentLawId}
                disabled={lawTokens.length === 0}
              >
                <SelectTrigger
                  data-ocid="token-creator.parent-law.select"
                  className="border-2 border-dashed border-border rounded-none font-mono text-xs bg-background disabled:opacity-50"
                >
                  <SelectValue
                    placeholder={
                      lawTokens.length === 0
                        ? "No law tokens yet"
                        : "Select parent..."
                    }
                  />
                </SelectTrigger>
                <SelectContent className="font-mono text-xs rounded-none border-2 border-border">
                  {lawTokens.map((lt) => (
                    <SelectItem
                      key={lt.id}
                      value={lt.id}
                      className="font-mono text-xs"
                    >
                      {lt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Additional cross-references */}
          {tokenType === "interpEntity" &&
            lawTokens.filter((lt) => lt.id !== parentLawId).length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Additional References (optional)
                </Label>
                <div className="border-2 border-dashed border-border divide-y divide-dashed divide-border max-h-28 overflow-y-auto">
                  {lawTokens
                    .filter((lt) => lt.id !== parentLawId)
                    .map((lt) => (
                      <label
                        key={lt.id}
                        className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={extraLinks.includes(lt.id)}
                          onChange={() => toggleExtraLink(lt.id)}
                          className="accent-current"
                        />
                        <span className="font-mono text-xs truncate">
                          {lt.name}
                        </span>
                      </label>
                    ))}
                </div>
              </div>
            )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              data-ocid="token-creator.cancel_button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-2 border-dashed border-border rounded-none font-mono text-xs uppercase"
            >
              Cancel
            </Button>
            <Button
              data-ocid="token-creator.confirm_button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 border-2 border-border rounded-none font-mono text-xs uppercase"
              style={
                canConfirm
                  ? {
                      borderColor:
                        tokenType === "lawEntity" ? LAW_COLOR : INTERP_COLOR,
                    }
                  : undefined
              }
            >
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
