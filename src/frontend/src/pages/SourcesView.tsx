import { useEffect, useRef, useState } from "react";
import NodeDetailsModal from "../components/NodeDetailsModal";
import SourceGraphDiagram from "../components/SourceGraphDiagram";
import useSourceGraphs from "../hooks/useSourceGraphs";
import type { SourceGraph, SourceNode } from "../types/sourceGraph";
import { parseSourceGraphZip } from "../utils/sourceGraphParser";

export default function SourcesView() {
  const {
    graphs,
    activeGraphId,
    saveGraph,
    deleteGraph,
    setActiveGraph,
    updateNode,
  } = useSourceGraphs();
  const [view, setView] = useState<"list" | "graph">("list");
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<SourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const activeGraph = graphs.find((g) => g.id === activeGraphId) ?? null;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-imported
    e.target.value = "";

    setImporting(true);
    setError(null);

    try {
      const graph = await parseSourceGraphZip(file);

      // Deduplicate name: append timestamp if name already exists
      const nameExists = graphs.some((g) => g.name === graph.name);
      if (nameExists) {
        graph.name = `${graph.name} (${Date.now()})`;
      }

      saveGraph(graph);
      setActiveGraph(graph.id);
      setView("graph");
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "QuotaExceededError"
          ? "Storage full. Delete an existing graph to free up space."
          : err instanceof Error
            ? err.message
            : "Failed to import ZIP file.";
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  const handleView = (graph: SourceGraph) => {
    setActiveGraph(graph.id);
    setView("graph");
  };

  const handleDeleteRequest = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleDeleteConfirm = () => {
    if (!confirmDeleteId) return;
    if (confirmDeleteId === activeGraphId) {
      setActiveGraph(null);
      setView("list");
    }
    deleteGraph(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  const handleDeleteCancel = () => {
    setConfirmDeleteId(null);
  };

  const handleBackToList = () => {
    setView("list");
  };

  const handleNodeClick = (node: SourceNode) => {
    setSelectedNode(node);
  };

  const handleNodeSave = (nodeId: string, updates: Partial<SourceNode>) => {
    if (activeGraphId) {
      updateNode(activeGraphId, nodeId, updates);
    }
    setSelectedNode(null);
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Graph view
  if (view === "graph" && activeGraph) {
    return (
      <div className="flex flex-col h-full font-mono">
        {/* Graph header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-dashed border-border bg-background shrink-0">
          <button
            type="button"
            onClick={handleBackToList}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-ocid="sources.back_to_list"
          >
            ← back to list
          </button>
          <span className="text-xs text-border">|</span>
          <span className="text-xs text-foreground">{activeGraph.name}</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {activeGraph.nodes.length} nodes
          </span>
        </div>

        {/* Graph canvas */}
        <div className="flex-1 min-h-0">
          <SourceGraphDiagram
            graph={activeGraph}
            onNodeClick={handleNodeClick}
          />
        </div>

        {/* Node details modal */}
        {selectedNode && (
          <NodeDetailsModal
            node={selectedNode}
            graph={activeGraph}
            onSave={handleNodeSave}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="h-full overflow-auto p-6 font-mono">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleFileChange}
        data-ocid="sources.file_input"
        aria-label="Import ZIP file"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-1">
            source graphs
          </h2>
          <p className="text-xs text-muted-foreground">
            import zip files to create custom source graphs
          </p>
        </div>
        <button
          type="button"
          onClick={handleImportClick}
          disabled={importing}
          className="text-xs border border-dashed border-border px-3 py-1.5 text-foreground hover:border-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          data-ocid="sources.import_button"
        >
          {importing ? "parsing..." : "[import graph]"}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mb-4 px-3 py-2 border border-dashed border-destructive text-destructive text-xs"
          data-ocid="sources.error_message"
          role="alert"
        >
          [ERROR] {error}
        </div>
      )}

      {/* Empty state */}
      {graphs.length === 0 && !importing && (
        <div
          className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border"
          data-ocid="sources.empty_state"
        >
          <p className="text-xs text-muted-foreground mb-3">
            no source graphs yet.
          </p>
          <p className="text-xs text-muted-foreground">
            import a zip file to get started.
          </p>
          <button
            type="button"
            onClick={handleImportClick}
            className="mt-5 text-xs border border-dashed border-border px-4 py-2 text-foreground hover:border-foreground hover:bg-accent transition-colors"
            data-ocid="sources.empty_import_button"
          >
            [import graph]
          </button>
        </div>
      )}

      {/* Graph list */}
      {graphs.length > 0 && (
        <div className="flex flex-col gap-2">
          {graphs.map((graph) => (
            <div
              key={graph.id}
              className="flex items-center gap-3 border border-dashed border-border px-4 py-3 hover:border-foreground transition-colors"
              data-ocid={`sources.graph_row.${graph.id}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{graph.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(graph.createdAt)} · {graph.nodes.length} nodes ·{" "}
                  {graph.edges.length} edges
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleView(graph)}
                  className="text-xs border border-dashed border-border px-2 py-1 text-foreground hover:border-foreground hover:bg-accent transition-colors"
                  data-ocid={`sources.view_button.${graph.id}`}
                >
                  [view]
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRequest(graph.id)}
                  className="text-xs border border-dashed border-destructive px-2 py-1 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  data-ocid={`sources.delete_button.${graph.id}`}
                >
                  [delete]
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDeleteId && (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm m-0 w-full h-full max-w-none max-h-none border-0 p-0"
          aria-label="Confirm deletion"
          data-ocid="sources.confirm_delete_dialog"
          onClose={handleDeleteCancel}
        >
          <div className="border border-dashed border-border bg-background p-6 max-w-sm w-full mx-4 font-mono">
            <p className="text-sm text-foreground mb-2">delete graph?</p>
            <p className="text-xs text-muted-foreground mb-6">
              {graphs.find((g) => g.id === confirmDeleteId)?.name ?? ""}
              <br />
              this action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 text-xs border border-dashed border-destructive px-3 py-2 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                data-ocid="sources.confirm_delete_yes"
              >
                [delete]
              </button>
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="flex-1 text-xs border border-dashed border-border px-3 py-2 text-foreground hover:border-foreground hover:bg-accent transition-colors"
                data-ocid="sources.confirm_delete_cancel"
              >
                [cancel]
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
