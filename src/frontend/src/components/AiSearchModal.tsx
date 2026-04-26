import { useEffect, useRef, useState } from "react";
import type { GraphData } from "../backend.d";
import { useAllPublishedGraphDatas } from "../hooks/usePublicGraphs";
import {
  type ChatMessage,
  MODEL_OPTIONS,
  type ModelOption,
  type ProgressInfo,
  type TextGenerationPipeline,
  formatGraphDataAsContext,
  generateAiResponse,
  initModelPipeline,
} from "../services/hyvmindAiService";

interface AiSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

type ModalState =
  | { phase: "webgpu_unsupported" }
  | { phase: "idle" }
  | { phase: "loading_graphs"; progress: number; text: string }
  | { phase: "loading_model"; progress: number; text: string }
  | { phase: "ready" }
  | { phase: "error"; message: string };

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export default function AiSearchModal({
  isOpen,
  onClose,
  initialQuery,
}: AiSearchModalProps) {
  const [modalState, setModalState] = useState<ModalState>({ phase: "idle" });
  const [selectedModel, setSelectedModel] = useState<ModelOption>(
    MODEL_OPTIONS[0],
  );
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const pipelineRef = useRef<TextGenerationPipeline | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const graphContextRef = useRef<string>("");
  const hasInitRef = useRef(false);
  const initialQueryHandledRef = useRef(false);
  const graphsLoadedRef = useRef(false);

  // RAF streaming refs
  const bufferRef = useRef<string>("");
  const rafIdRef = useRef<number | null>(null);

  // Parallel graph data fetching
  const { queries, metas } = useAllPublishedGraphDatas();
  const totalCount = metas?.length ?? 0;
  const completedCount = queries.filter((q) => q.isSuccess).length;

  // Check WebGPU on mount and start Phase 1
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isOpen) return;
    if (!("gpu" in navigator)) {
      setModalState({ phase: "webgpu_unsupported" });
    } else {
      setModalState((prev) =>
        prev.phase === "idle"
          ? { phase: "loading_graphs", progress: 0, text: "Reading graphs..." }
          : prev,
      );
    }
  }, [isOpen]);

  // Phase 1: track graph loading progress
  useEffect(() => {
    if (!isOpen) return;
    if (modalState.phase !== "loading_graphs") return;

    if (totalCount === 0 && metas !== undefined) {
      // No graphs — skip to Phase 2
      graphContextRef.current =
        "You are an AI assistant for Hyvmind. No published graphs are available yet.";
      graphsLoadedRef.current = true;
      startModelLoad();
      return;
    }

    if (totalCount > 0) {
      const progress = Math.round((completedCount / totalCount) * 100);
      setModalState({
        phase: "loading_graphs",
        progress,
        text: `Reading graphs... (${completedCount}/${totalCount})`,
      });

      if (completedCount === totalCount && !graphsLoadedRef.current) {
        graphsLoadedRef.current = true;
        const graphDatas = queries.map(
          (q) => (q.data as GraphData | null | undefined) ?? null,
        );
        graphContextRef.current = formatGraphDataAsContext(metas!, graphDatas);
        startModelLoad();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedCount, totalCount, metas, queries, isOpen, modalState.phase]);

  const startModelLoad = () => {
    if (hasInitRef.current) return;
    hasInitRef.current = true;
    setModalState({
      phase: "loading_model",
      progress: 0,
      text: "Loading model...",
    });
    loadModel(selectedModel);
  };

  // Send initial query once model is ready
  useEffect(() => {
    if (
      modalState.phase === "ready" &&
      initialQuery &&
      !initialQueryHandledRef.current
    ) {
      initialQueryHandledRef.current = true;
      sendMessage(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalState.phase, initialQuery]);

  // Scroll to bottom when messages change
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on every message change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset state on close
  const handleClose = () => {
    onClose();
    // Don't destroy pipeline — reuse across opens
    initialQueryHandledRef.current = false;
  };

  const loadModel = async (model: ModelOption) => {
    if (!("gpu" in navigator)) {
      setModalState({ phase: "webgpu_unsupported" });
      return;
    }

    try {
      const onProgress = (info: ProgressInfo) => {
        const pct = info.progress !== undefined ? Math.round(info.progress) : 0;
        setModalState({
          phase: "loading_model",
          progress: pct,
          text:
            info.status ??
            (pct > 0 ? `Loading model… ${pct}%` : "Loading model..."),
        });
      };

      const engine = await initModelPipeline(model.modelId, onProgress);
      pipelineRef.current = engine;
      setModalState({ phase: "ready" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load model.";
      setModalState({ phase: "error", message: msg });
      hasInitRef.current = false;
    }
  };

  const handleModelChange = (model: ModelOption) => {
    if (isGenerating) return;
    setSelectedModel(model);
    setMessages([]);
    pipelineRef.current = null;
    hasInitRef.current = false;
    graphsLoadedRef.current = false;
    initialQueryHandledRef.current = false;
    setModalState({
      phase: "loading_graphs",
      progress: 0,
      text: "Reading graphs...",
    });
  };

  const sendMessage = async (text: string) => {
    if (!pipelineRef.current || isGenerating) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: DisplayMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    // Placeholder streaming message
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", streaming: true },
    ]);

    // Build history for context — limit to last 10 entries
    const history: ChatMessage[] = messages
      .filter((m) => !m.streaming)
      .concat(userMsg)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      let accumulated = "";

      // RAF-throttled streaming
      const flushBuffer = () => {
        if (bufferRef.current) {
          const chunk = bufferRef.current;
          bufferRef.current = "";
          accumulated += chunk;
          setMessages((prev) => {
            const next = [...prev];
            const lastIdx = next.length - 1;
            if (next[lastIdx]?.role === "assistant") {
              next[lastIdx] = {
                role: "assistant",
                content: accumulated,
                streaming: true,
              };
            }
            return next;
          });
        }
        rafIdRef.current = null;
      };

      await generateAiResponse(
        pipelineRef.current,
        history,
        graphContextRef.current,
        (chunk) => {
          bufferRef.current += chunk;
          if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(flushBuffer);
          }
        },
      );

      // Flush any remaining buffer
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (bufferRef.current) {
        accumulated += bufferRef.current;
        bufferRef.current = "";
      }

      // Finalise
      setMessages((prev) => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        if (next[lastIdx]?.role === "assistant") {
          next[lastIdx] = { role: "assistant", content: accumulated };
        }
        return next;
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Generation failed.";
      setMessages((prev) => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        if (next[lastIdx]?.role === "assistant") {
          next[lastIdx] = {
            role: "assistant",
            content: `[Error: ${errMsg}]`,
          };
        }
        return next;
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
    setInputValue("");
  };

  if (!isOpen) return null;

  const isLoadingPhase =
    modalState.phase === "loading_graphs" ||
    modalState.phase === "loading_model";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      data-ocid="ai_search.dialog"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") handleClose();
      }}
    >
      <dialog
        open
        className="relative w-full max-w-2xl h-[80vh] flex flex-col border border-border bg-card font-mono text-foreground shadow-lg m-4 p-0"
        aria-label="AI Knowledge Search"
        style={{ maxHeight: "80vh" }}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs text-muted-foreground tracking-widest uppercase">
              AI_KNOWLEDGE_SEARCH
            </span>
            {/* Model selector */}
            <select
              value={selectedModel.id}
              onChange={(e) => {
                const m = MODEL_OPTIONS.find((o) => o.id === e.target.value);
                if (m) handleModelChange(m);
              }}
              disabled={isGenerating || isLoadingPhase}
              className="bg-background border border-border text-xs text-foreground px-1.5 py-0.5 outline-none disabled:opacity-50 font-mono max-w-[200px]"
              data-ocid="ai_search.model_select"
              aria-label="Select AI model"
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1 ml-2 shrink-0"
            aria-label="Close AI search"
            data-ocid="ai_search.close_button"
          >
            [X]
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* WebGPU unsupported */}
          {modalState.phase === "webgpu_unsupported" && (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
              data-ocid="ai_search.error_state"
            >
              <span className="text-2xl" aria-hidden>
                ⚠
              </span>
              <p className="text-sm text-muted-foreground">
                AI Search requires a browser with WebGPU support.
              </p>
              <p className="text-xs text-muted-foreground">
                Please use Chrome or Edge (desktop) to enable this feature.
              </p>
            </div>
          )}

          {/* Phase 1: Graph loading */}
          {modalState.phase === "loading_graphs" && (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-4 p-8"
              data-ocid="ai_search.loading_state"
            >
              <p className="text-xs text-muted-foreground text-center max-w-xs break-words">
                {modalState.text}
              </p>
              <div className="w-full max-w-xs border border-border bg-background h-2">
                <div
                  className="h-full bg-foreground/60 transition-all duration-300"
                  style={{
                    width:
                      modalState.progress > 0
                        ? `${modalState.progress}%`
                        : "0%",
                  }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground/60">
                Loading graph data for AI context…
              </p>
            </div>
          )}

          {/* Phase 2: Model loading */}
          {modalState.phase === "loading_model" && (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-4 p-8"
              data-ocid="ai_search.loading_state"
            >
              <p className="text-xs text-muted-foreground text-center max-w-xs break-words">
                {modalState.text}
              </p>
              <div className="w-full max-w-xs border border-border bg-background h-2">
                <div
                  className="h-full bg-foreground/60 transition-all duration-300"
                  style={{
                    width:
                      modalState.progress > 0
                        ? `${modalState.progress}%`
                        : "0%",
                  }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground/60">
                The model will be cached after the first download.
              </p>
            </div>
          )}

          {/* Error */}
          {modalState.phase === "error" && (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
              data-ocid="ai_search.error_state"
            >
              <p className="text-xs text-destructive">{modalState.message}</p>
              <button
                type="button"
                onClick={() => {
                  hasInitRef.current = false;
                  graphsLoadedRef.current = false;
                  setModalState({
                    phase: "loading_graphs",
                    progress: 0,
                    text: "Reading graphs...",
                  });
                }}
                className="border border-border px-3 py-1 text-xs text-foreground hover:bg-secondary transition-colors"
                data-ocid="ai_search.retry_button"
              >
                Retry
              </button>
            </div>
          )}

          {/* Chat area (ready or idle with cached pipeline) */}
          {(modalState.phase === "ready" || modalState.phase === "idle") &&
            pipelineRef.current && (
              <>
                {/* No graphs notice */}
                {totalCount === 0 && (
                  <div className="px-4 py-2 border-b border-border bg-muted/30 text-[10px] text-muted-foreground">
                    No published graphs available. Publish a source graph from
                    the Sources page to enable graph-aware answers.
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
                  {messages.length === 0 && (
                    <p
                      className="text-xs text-muted-foreground text-center py-8"
                      data-ocid="ai_search.empty_state"
                    >
                      Ask anything about the published knowledge graphs.
                    </p>
                  )}
                  {messages.map((msg, i) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: positional messages
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      data-ocid={`ai_search.message.${i + 1}`}
                    >
                      <div
                        className={`max-w-[80%] px-3 py-2 text-xs leading-relaxed border ${
                          msg.role === "user"
                            ? "bg-secondary border-border text-foreground"
                            : "bg-background border-border/50 text-foreground/90"
                        }`}
                      >
                        {msg.role === "assistant" &&
                        msg.streaming &&
                        !msg.content ? (
                          <TypingIndicator />
                        ) : (
                          <span className="whitespace-pre-wrap break-words">
                            {msg.content}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="shrink-0 border-t border-border px-4 py-3">
                  <form
                    onSubmit={handleFormSubmit}
                    className="flex items-center gap-2"
                    data-ocid="ai_search.input_form"
                  >
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={
                        isGenerating ? "Generating..." : "Ask a follow-up..."
                      }
                      disabled={isGenerating}
                      className="flex-1 bg-background border border-border px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-foreground/40 transition-colors disabled:opacity-50 font-mono"
                      data-ocid="ai_search.chat_input"
                      aria-label="Follow-up message"
                    />
                    <button
                      type="submit"
                      disabled={isGenerating || !inputValue.trim()}
                      className="border border-border px-3 py-1.5 text-xs text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      data-ocid="ai_search.send_button"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </>
            )}
        </div>
      </dialog>
    </div>
  );
}

function TypingIndicator() {
  return (
    <span className="flex items-center gap-1" aria-label="Generating response">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-muted-foreground"
          style={{
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </span>
  );
}
