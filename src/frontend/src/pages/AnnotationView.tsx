import { useState } from "react";
import { toast } from "sonner";
import { AnnotationActions } from "../components/annotation/AnnotationActions";
import { AnnotationPathSelector } from "../components/annotation/AnnotationPathSelector";
import { TokenAnnotatorPanel } from "../components/annotation/TokenAnnotatorPanel";
import { TokenCreatorModal } from "../components/annotation/TokenCreatorModal";
import { TokenDetailsPanel } from "../components/annotation/TokenDetailsPanel";
import { TokenTree } from "../components/annotation/TokenTree";
import { URLImporter } from "../components/annotation/URLImporter";
import { UndoRedoToolbar } from "../components/annotation/UndoRedoToolbar";
import { useAnnotation } from "../hooks/useAnnotation";
import useSourceGraphs from "../hooks/useSourceGraphs";
import type { AnnotationPath } from "../types/annotation";
import { annotationsToSourceGraph } from "../utils/annotationSerializer";
import { parseHTML } from "../utils/htmlParser";

interface Props {
  onBack: () => void;
  /** Resume an existing annotation session by ID */
  resumeSessionId?: string;
}

const defaultPath: AnnotationPath = {
  curation: "",
  swarm: "",
  location: "",
  isNewCuration: true,
  isNewSwarm: true,
  isNewLocation: true,
};

export default function AnnotationView({ onBack, resumeSessionId }: Props) {
  const {
    session,
    initSession,
    createToken,
    updateToken,
    addLink,
    removeLink,
    undo,
    redo,
    canUndo,
    canRedo,
    saveDraft,
    setSession,
  } = useAnnotation(resumeSessionId);

  const { saveGraph } = useSourceGraphs();

  // Path state — lives outside session so it can be set before URL fetch
  const [pendingPath, setPendingPath] = useState<AnnotationPath>(defaultPath);

  // UI state
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [creatorSelection, setCreatorSelection] = useState<{
    start: number;
    end: number;
    text: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const activePath = session?.path ?? pendingPath;
  const annotations = session?.annotations ?? [];
  const tokens = session?.tokens ?? [];
  const hasLawToken = annotations.some((a) => a.tag === "lawEntity");

  const selectedToken =
    annotations.find((a) => a.id === selectedTokenId) ?? null;
  const allLawTokens = annotations.filter((a) => a.tag === "lawEntity");

  // ─── URL fetch ───────────────────────────────────────────────────────────
  async function handleFetched(title: string, rawHtml: string, url: string) {
    const parsed = await parseHTML(rawHtml, url);
    initSession(url, title, parsed.text, parsed.tokens, activePath);
  }

  // ─── Path change ─────────────────────────────────────────────────────────
  function handlePathChange(newPath: AnnotationPath) {
    setPendingPath(newPath);
    if (session) {
      setSession({ ...session, path: newPath });
    }
  }

  // ─── Token creation flow ─────────────────────────────────────────────────
  function handleSelectionComplete(
    start: number,
    end: number,
    selectedText: string,
  ) {
    setCreatorSelection({ start, end, text: selectedText });
    setCreatorOpen(true);
  }

  function handleCreatorConfirm(annotation: Parameters<typeof createToken>[0]) {
    createToken(annotation);
    setCreatorOpen(false);
    setCreatorSelection(null);
  }

  // ─── Save draft ──────────────────────────────────────────────────────────
  function handleSaveDraft() {
    setIsSaving(true);
    saveDraft();
    setTimeout(() => setIsSaving(false), 600);
    toast.success("Draft saved");
  }

  // ─── Convert to source graph ─────────────────────────────────────────────
  async function handleConvert() {
    if (!session) {
      toast.error("No annotation session — fetch a URL first");
      return;
    }
    if (!hasLawToken) {
      toast.error("Add at least one law token before converting");
      return;
    }

    setIsConverting(true);
    try {
      const graph = annotationsToSourceGraph(session);
      saveGraph(graph);
      saveDraft(); // save final state
      toast.success("Source graph created — ready to publish");
      onBack();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <div
      className="flex flex-col h-full font-mono bg-background"
      data-ocid="annotation.page"
    >
      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-dashed border-border bg-card shrink-0 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          data-ocid="annotation.back_button"
        >
          ← back
        </button>
        <span className="text-xs text-border shrink-0">|</span>
        <span className="text-xs text-foreground font-semibold tracking-widest uppercase shrink-0">
          Annotate URL
        </span>

        {/* undo/redo centred */}
        <div className="flex-1 flex justify-center min-w-0">
          <UndoRedoToolbar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
          />
        </div>

        {/* actions right */}
        <AnnotationActions
          hasLawToken={hasLawToken}
          onSaveDraft={handleSaveDraft}
          onConvert={handleConvert}
          isSaving={isSaving}
          isConverting={isConverting}
        />
      </div>

      {/* ── Body: three-column layout ───────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Left sidebar (280px) ───────────────────────────────────────── */}
        <aside
          className="w-70 shrink-0 flex flex-col border-r border-dashed border-border bg-card overflow-y-auto"
          style={{ width: 280 }}
          data-ocid="annotation.left_panel"
        >
          {/* URL importer */}
          <section className="p-3 border-b border-dashed border-border">
            <URLImporter onFetched={handleFetched} />
          </section>

          {/* Path selector */}
          <section className="p-3 border-b border-dashed border-border">
            <AnnotationPathSelector
              path={activePath}
              onChange={handlePathChange}
              publishedPaths={[]}
            />
          </section>

          {/* Token tree */}
          <section className="flex-1 min-h-0 overflow-auto">
            <TokenTree
              path={activePath}
              annotations={annotations}
              selectedTokenId={selectedTokenId}
              onSelectToken={(id) =>
                setSelectedTokenId((prev) => (prev === id ? null : id))
              }
            />
          </section>
        </aside>

        {/* ── Main annotator area ────────────────────────────────────────── */}
        <main
          className="flex-1 min-w-0 overflow-y-auto p-4"
          data-ocid="annotation.main_panel"
        >
          {tokens.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-full text-center border border-dashed border-border py-20"
              data-ocid="annotation.empty_state"
            >
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-widest">
                No content yet
              </p>
              <p className="text-xs text-muted-foreground/60">
                Enter a URL above and click Fetch to begin annotating.
              </p>
            </div>
          ) : (
            <TokenAnnotatorPanel
              tokens={tokens}
              annotations={annotations}
              onSelectionComplete={handleSelectionComplete}
            />
          )}
        </main>

        {/* ── Right panel (280px) — only when a token is selected ─────────── */}
        {selectedToken && (
          <aside
            className="shrink-0 border-l border-dashed border-border"
            style={{ width: 280 }}
            data-ocid="annotation.right_panel"
          >
            <TokenDetailsPanel
              token={selectedToken}
              allLawTokens={allLawTokens}
              onUpdate={(id, updates) => {
                updateToken(id, updates);
              }}
              onAddLink={addLink}
              onRemoveLink={removeLink}
            />
          </aside>
        )}
      </div>

      {/* ── Token creator modal ─────────────────────────────────────────────── */}
      {creatorSelection && (
        <TokenCreatorModal
          open={creatorOpen}
          selectedText={creatorSelection.text}
          start={creatorSelection.start}
          end={creatorSelection.end}
          annotations={annotations}
          onConfirm={handleCreatorConfirm}
          onClose={() => {
            setCreatorOpen(false);
            setCreatorSelection(null);
          }}
        />
      )}
    </div>
  );
}
