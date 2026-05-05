import Fuse, { type FuseResult } from "fuse.js";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GraphData } from "../backend.d";
import { useAllPublishedGraphDatas } from "../hooks/usePublicGraphs";
import type { Edge, SourceNode } from "../types/sourceGraph";
import { graphDataToSourceGraph } from "../utils/graphDataConverter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SearchableItemType = "node" | "edge" | "attribute";

export interface SearchableItem {
  type: SearchableItemType;
  graphId: string;
  curationName: string;
  node?: SourceNode;
  edge?: Edge;
  sourceName?: string;
  targetName?: string;
  nodeId?: string;
  nodeName?: string;
  key?: string;
  value?: string;
  label: string;
  description: string;
}

interface GraphFuzzyFinderProps {
  onSelect: (item: SearchableItem) => void;
  onClose?: () => void;
}

// ---------------------------------------------------------------------------
// Section header for dropdown grouping
// ---------------------------------------------------------------------------

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border bg-muted/30">
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GraphFuzzyFinder({
  onSelect,
  onClose,
}: GraphFuzzyFinderProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<FuseResult<SearchableItem>[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const { queries, metas } = useAllPublishedGraphDatas();

  // Build flat searchable items from all graph data
  const items = useMemo<SearchableItem[]>(() => {
    if (!metas) return [];
    const out: SearchableItem[] = [];

    for (let i = 0; i < metas.length; i++) {
      const meta = metas[i];
      const q = queries[i];
      if (!q?.isSuccess || !q.data) continue;

      const graphId = meta.id;
      const curationName = meta.name;
      const converted = graphDataToSourceGraph(
        q.data as GraphData,
        meta.name,
        meta.id,
      );

      // Nodes
      for (const node of converted.nodes) {
        out.push({
          type: "node",
          graphId,
          curationName,
          node,
          label: node.name,
          description: `${node.nodeType}${node.parentName ? ` in ${node.parentName}` : ""}`,
        });

        // Attributes — one item per key
        if (node.attributes) {
          for (const [key, rawVal] of Object.entries(node.attributes)) {
            const value =
              typeof rawVal === "string" ? rawVal : JSON.stringify(rawVal);
            out.push({
              type: "attribute",
              graphId,
              curationName,
              nodeId: node.id,
              nodeName: node.name,
              key,
              value,
              label: `${key}: ${value}`,
              description: `attr on ${node.name}`,
            });
          }
        }
      }

      // Edges — use source/target IDs (UUIDs), label with readable names via node map
      const idToName = new Map(
        converted.nodes.map((n) => [n.id ?? "", n.name]),
      );
      for (const edge of converted.edges) {
        const srcName = idToName.get(edge.source) ?? edge.source;
        const tgtName = idToName.get(edge.target) ?? edge.target;
        out.push({
          type: "edge",
          graphId,
          curationName,
          edge,
          sourceName: srcName,
          targetName: tgtName,
          label: `${srcName} → ${tgtName}`,
          description: edge.label ?? "edge",
        });
      }
    }
    return out;
  }, [queries, metas]);

  // Fuse instance — recreated when items change
  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: [
          { name: "label", weight: 0.5 },
          { name: "description", weight: 0.3 },
        ],
        threshold: 0.4,
        includeScore: true,
      }),
    [items],
  );

  // Click-outside closes dropdown
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (val.length > 0) {
      const r = fuse.search(val).slice(0, 10);
      setResults(r);
      setIsOpen(true);
      setSelectedIndex(0);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[selectedIndex]?.item;
      if (item) {
        onSelect(item);
        setIsOpen(false);
        setQuery("");
        setResults([]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
      onClose?.();
    }
  }

  function handleSelect(item: SearchableItem) {
    onSelect(item);
    setIsOpen(false);
    setQuery("");
    setResults([]);
  }

  // Group results by type for section headers
  const nodes = results.filter((r) => r.item.type === "node");
  const edges = results.filter((r) => r.item.type === "edge");
  const attrs = results.filter((r) => r.item.type === "attribute");

  // Flat ordered list for index tracking
  const ordered = [...nodes, ...edges, ...attrs];

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-sm"
      data-ocid="fuzzy_finder.container"
    >
      {/* Input */}
      <div className="flex items-center border border-border bg-background focus-within:border-foreground/40 transition-colors">
        <span className="pl-2 pr-1 text-muted-foreground shrink-0" aria-hidden>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.length > 0 && results.length > 0) setIsOpen(true);
          }}
          placeholder="Search nodes, edges, attributes..."
          className="flex-1 bg-transparent py-1.5 px-1 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
          data-ocid="fuzzy_finder.search_input"
          aria-label="Search knowledge graph nodes, edges, and attributes"
          aria-autocomplete="list"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="pr-2 pl-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Clear search"
            data-ocid="fuzzy_finder.clear_button"
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 z-50 mt-0.5 border border-border bg-background shadow-md overflow-hidden max-h-80 overflow-y-auto"
          data-ocid="fuzzy_finder.dropdown"
        >
          {nodes.length > 0 && (
            <div>
              <SectionLabel label="Nodes" />
              {nodes.map((r) => {
                const idx = ordered.indexOf(r);
                return (
                  <ResultRow
                    key={`node-${r.item.graphId}-${r.item.label}`}
                    result={r}
                    isSelected={idx === selectedIndex}
                    onSelect={handleSelect}
                    index={idx}
                    onHover={setSelectedIndex}
                  />
                );
              })}
            </div>
          )}
          {edges.length > 0 && (
            <div>
              <SectionLabel label="Edges" />
              {edges.map((r) => {
                const idx = ordered.indexOf(r);
                return (
                  <ResultRow
                    key={`edge-${r.item.graphId}-${r.item.label}`}
                    result={r}
                    isSelected={idx === selectedIndex}
                    onSelect={handleSelect}
                    index={idx}
                    onHover={setSelectedIndex}
                  />
                );
              })}
            </div>
          )}
          {attrs.length > 0 && (
            <div>
              <SectionLabel label="Attributes" />
              {attrs.map((r) => {
                const idx = ordered.indexOf(r);
                return (
                  <ResultRow
                    key={`attr-${r.item.graphId}-${r.item.nodeId}-${r.item.key}`}
                    result={r}
                    isSelected={idx === selectedIndex}
                    onSelect={handleSelect}
                    index={idx}
                    onHover={setSelectedIndex}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* No results */}
      {isOpen && query.length > 0 && results.length === 0 && (
        <div
          className="absolute top-full left-0 right-0 z-50 mt-0.5 border border-border bg-background px-3 py-2"
          data-ocid="fuzzy_finder.empty_state"
        >
          <span className="font-mono text-xs text-muted-foreground">
            No results for "{query}"
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row sub-component
// ---------------------------------------------------------------------------

interface ResultRowProps {
  result: FuseResult<SearchableItem>;
  isSelected: boolean;
  onSelect: (item: SearchableItem) => void;
  index: number;
  onHover: (index: number) => void;
}

function ResultRow({
  result,
  isSelected,
  onSelect,
  index,
  onHover,
}: ResultRowProps) {
  const { item } = result;
  return (
    <button
      type="button"
      className={`w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors ${
        isSelected ? "bg-accent/20" : "hover:bg-muted/40"
      }`}
      onClick={() => onSelect(item)}
      onMouseEnter={() => onHover(index)}
      data-ocid={`fuzzy_finder.result.${index + 1}`}
    >
      <span className="font-mono text-xs font-medium text-foreground truncate">
        {item.label}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground truncate">
        {item.description}
        {" · "}
        <span className="opacity-60">{item.curationName}</span>
      </span>
    </button>
  );
}
