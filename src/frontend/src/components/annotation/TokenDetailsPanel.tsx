import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import type { TokenAnnotation } from "../../types/annotation";
import { AttributeEditor } from "./AttributeEditor";

const LAW_COLOR = "#DC143C";
const INTERP_COLOR = "#DA70D6";

interface Props {
  token: TokenAnnotation | null;
  allLawTokens: TokenAnnotation[];
  onUpdate: (id: string, updates: Partial<TokenAnnotation>) => void;
  onAddLink: (interpId: string, lawId: string) => void;
  onRemoveLink: (interpId: string, lawId: string) => void;
}

export function TokenDetailsPanel({
  token,
  allLawTokens,
  onUpdate,
  onAddLink,
  onRemoveLink,
}: Props) {
  if (!token) {
    return (
      <div
        data-ocid="token-details.empty_state"
        className="h-full flex items-center justify-center border-2 border-dashed border-border bg-background"
      >
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest text-center px-4">
          Select a token
          <br />
          to see details
        </p>
      </div>
    );
  }

  const isLaw = token.tag === "lawEntity";
  const tokenColor = isLaw ? LAW_COLOR : INTERP_COLOR;
  const parentLawToken = isLaw
    ? null
    : allLawTokens.find((lt) => lt.id === token.parentLawTokenId);

  const linkedTokens = allLawTokens.filter(
    (lt) =>
      token.linkedLawTokenIds.includes(lt.id) &&
      lt.id !== token.parentLawTokenId,
  );

  const availableForLink = allLawTokens.filter(
    (lt) =>
      lt.id !== token.parentLawTokenId &&
      !token.linkedLawTokenIds.includes(lt.id),
  );

  return (
    <div
      data-ocid="token-details.panel"
      className="h-full flex flex-col border-2 border-dashed border-border bg-background overflow-auto"
    >
      {/* Header */}
      <div
        className="px-3 py-2 border-b-2 border-dashed border-border flex items-center gap-2"
        style={{
          borderLeftColor: tokenColor,
          borderLeftWidth: 3,
          borderLeftStyle: "solid",
        }}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 border"
          style={{
            color: tokenColor,
            borderColor: tokenColor,
            background: `${tokenColor}15`,
          }}
        >
          {isLaw ? "Law" : "Interp"}
        </span>
        <span
          className="font-mono text-xs text-muted-foreground truncate flex-1"
          title={token.id}
        >
          {token.id.slice(-12)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Name */}
        <div className="space-y-1">
          <label
            htmlFor="token-details-name-input"
            className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
          >
            Name
          </label>
          <Input
            id="token-details-name-input"
            data-ocid="token-details.name.input"
            defaultValue={token.name}
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val && val !== token.name) onUpdate(token.id, { name: val });
            }}
            className="font-mono text-xs border-2 border-dashed border-border rounded-none bg-background"
          />
        </div>

        {/* Parent law (interp only) */}
        {!isLaw && parentLawToken && (
          <div className="space-y-1">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Parent Law Token
            </p>
            <div
              className="px-2 py-1.5 border-2 border-dashed font-mono text-xs truncate"
              style={{ borderColor: LAW_COLOR, color: LAW_COLOR }}
            >
              {parentLawToken.name}
            </div>
          </div>
        )}

        {/* Cross-references */}
        {!isLaw && (
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Cross-References
            </p>

            {linkedTokens.length > 0 && (
              <div className="space-y-1">
                {linkedTokens.map((lt) => (
                  <div
                    key={lt.id}
                    className="flex items-center gap-1 border border-dashed border-border px-2 py-1"
                  >
                    <span
                      className="font-mono text-xs flex-1 truncate"
                      style={{ color: LAW_COLOR }}
                    >
                      {lt.name}
                    </span>
                    <Button
                      data-ocid={`token-details.remove-link.${lt.id}`}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveLink(token.id, lt.id)}
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {availableForLink.length > 0 && (
              <Select
                value=""
                onValueChange={(id) => id && onAddLink(token.id, id)}
              >
                <SelectTrigger
                  data-ocid="token-details.add-link.select"
                  className="border-2 border-dashed border-border rounded-none font-mono text-xs bg-background"
                >
                  <SelectValue placeholder="Add reference..." />
                </SelectTrigger>
                <SelectContent className="font-mono text-xs rounded-none border-2 border-border">
                  {availableForLink.map((lt) => (
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
            )}

            {linkedTokens.length === 0 && availableForLink.length === 0 && (
              <p className="font-mono text-xs text-muted-foreground/50 italic">
                No law tokens to link
              </p>
            )}
          </div>
        )}

        {/* Attributes */}
        <AttributeEditor
          ownAttributes={token.attributes}
          inheritedAttributes={token.inheritedAttributes}
          onChange={(attrs) => onUpdate(token.id, { attributes: attrs })}
        />
      </div>
    </div>
  );
}
