import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { AnnotationPath, TokenAnnotation } from "../../types/annotation";

const LAW_COLOR = "#DC143C";
const INTERP_COLOR = "#DA70D6";

interface Props {
  path: AnnotationPath;
  annotations: TokenAnnotation[];
  selectedTokenId: string | null;
  onSelectToken: (id: string) => void;
}

interface TreeNodeProps {
  label: string;
  depth: number;
  defaultOpen?: boolean;
  children?: React.ReactNode;
  color?: string;
  selected?: boolean;
  onClick?: () => void;
  dataOcid?: string;
}

function TreeNode({
  label,
  depth,
  defaultOpen = true,
  children,
  color,
  selected,
  onClick,
  dataOcid,
}: TreeNodeProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = !!children;

  return (
    <div>
      <button
        type="button"
        data-ocid={dataOcid}
        className="w-full flex items-center gap-1 cursor-pointer select-none px-1 py-0.5 hover:bg-muted/50 transition-colors text-left"
        style={{
          paddingLeft: `${depth * 12 + 4}px`,
          borderLeft: selected
            ? `2px solid ${color ?? "var(--primary)"}`
            : "2px solid transparent",
          backgroundColor: selected
            ? `${color ?? "var(--primary)"}18`
            : undefined,
        }}
        onClick={() => {
          if (onClick) onClick();
          else if (hasChildren) setOpen((o) => !o);
        }}
      >
        {hasChildren && (
          <button
            type="button"
            className="text-muted-foreground"
            aria-label={open ? "Collapse" : "Expand"}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
          >
            {open ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        {!hasChildren && <span className="w-3" />}
        <span
          className="font-mono text-xs truncate max-w-[150px]"
          style={{ color: color ?? "var(--foreground)" }}
          title={label}
        >
          {label}
        </span>
      </button>
      {hasChildren && open && <div>{children}</div>}
    </div>
  );
}

export function TokenTree({
  path,
  annotations,
  selectedTokenId,
  onSelectToken,
}: Props) {
  const lawTokens = annotations.filter((a) => a.tag === "lawEntity");

  function interpsByParent(lawId: string) {
    return annotations.filter(
      (a) => a.tag === "interpEntity" && a.parentLawTokenId === lawId,
    );
  }

  const curationLabel = path.curation || "(no curation)";
  const swarmLabel = path.swarm || "(no swarm)";
  const locationLabel = path.location || "(no location)";

  return (
    <div
      data-ocid="token-tree.panel"
      className="border-2 border-dashed border-border bg-background overflow-auto"
    >
      <div className="px-2 py-1 border-b-2 border-dashed border-border">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Token Tree
        </span>
      </div>

      {/* Curation */}
      <TreeNode label={curationLabel} depth={0}>
        {/* Swarm */}
        <TreeNode label={swarmLabel} depth={1}>
          {/* Location */}
          <TreeNode label={locationLabel} depth={2}>
            {lawTokens.length === 0 && (
              <div className="pl-8 py-1 font-mono text-xs text-muted-foreground italic">
                No tokens yet
              </div>
            )}
            {lawTokens.map((lt, i) => {
              const interps = interpsByParent(lt.id);
              return (
                <TreeNode
                  key={lt.id}
                  label={lt.name}
                  depth={3}
                  color={LAW_COLOR}
                  selected={selectedTokenId === lt.id}
                  onClick={() => onSelectToken(lt.id)}
                  dataOcid={`token-tree.law.item.${i + 1}`}
                  defaultOpen
                >
                  {interps.length > 0 ? (
                    <>
                      {interps.map((it, j) => (
                        <TreeNode
                          key={it.id}
                          label={it.name}
                          depth={4}
                          color={INTERP_COLOR}
                          selected={selectedTokenId === it.id}
                          onClick={() => onSelectToken(it.id)}
                          dataOcid={`token-tree.interp.item.${j + 1}`}
                        />
                      ))}
                    </>
                  ) : undefined}
                </TreeNode>
              );
            })}
          </TreeNode>
        </TreeNode>
      </TreeNode>
    </div>
  );
}
