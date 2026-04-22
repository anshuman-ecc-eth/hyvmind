import type { InitProgressReport, MLCEngine } from "@mlc-ai/web-llm";
import { useEffect, useRef, useState } from "react";
import type { PublishedSourceGraphMeta } from "../hooks/usePublicGraphs";
import {
  type ChatMessage,
  MODEL_OPTIONS,
  type ModelOption,
  formatGraphsAsContext,
  generateAiResponse,
  initWebLLMEngine,
} from "../services/hyvmindAiService";

interface AiSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  graphs: PublishedSourceGraphMeta[];
}

type ModalState =
  | { phase: "webgpu_unsupported" }
  | { phase: "idle" }
  | { phase: "loading"; progress: number; text: string }
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
  graphs,
}: AiSearchModalProps) {
  const [modalState, setModalState] = useState<ModalState>({ phase: "idle" });
  const [selectedModel, setSelectedModel] = useState<ModelOption>(
    MODEL_OPTIONS[0],
  );
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const engineRef = useRef<MLCEngine | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const graphContextRef = useRef<string>("");
  const hasInitRef = useRef(false);
  const initialQueryHandledRef = useRef(false);

  // Check WebGPU on mount
  useEffect(() => {
    if (!isOpen) return;
    if (!("gpu" in navigator)) {
      setModalState({ phase: "webgpu_unsupported" });
    } else {
      setModalState({ phase: "idle" });
    }
  }, [isOpen]);

  // Build graph context when graphs arrive
  useEffect(() => {
    if (graphs.length > 0) {
      graphContextRef.current = formatGraphsAsContext(graphs);
    } else {
      graphContextRef.current =
        "You are an AI assistant for Hyvmind. No published graphs are available yet.";
    }
  }, [graphs]);

  // Auto-load model when modal opens (idle → loading)
  useEffect(() => {
    if (!isOpen) return;
    if (modalState.phase !== "idle") return;
    if (hasInitRef.current) return;
    hasInitRef.current = true;
    loadModel(selectedModel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, modalState.phase, selectedModel]);

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
    // Don't destroy engine — reuse across opens
    initialQueryHandledRef.current = false;
  };

  const loadModel = async (model: ModelOption) => {
    if (!("gpu" in navigator)) {
      setModalState({ phase: "webgpu_unsupported" });
      return;
    }

    setModalState({ phase: "loading", progress: 0, text: "Initialising..." });

    try {
      const onProgress = (report: InitProgressReport) => {
        const pct = Math.round((report.progress ?? 0) * 100);
        setModalState({
          phase: "loading",
          progress: pct,
          text: report.text ?? `Loading model… ${pct}%`,
        });
      };

      const engine = await initWebLLMEngine(model.modelId, onProgress);
      engineRef.current = engine;
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
    engineRef.current = null;
    hasInitRef.current = false;
    initialQueryHandledRef.current = false;
    setModalState({ phase: "idle" });
    // Trigger load
    setTimeout(() => {
      hasInitRef.current = false;
      setModalState({ phase: "idle" });
    }, 0);
  };

  const sendMessage = async (text: string) => {
    if (!engineRef.current || isGenerating) return;
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

    // Build history for context
    const history: ChatMessage[] = messages
      .filter((m) => !m.streaming)
      .concat(userMsg)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      let accumulated = "";
      await generateAiResponse(
        engineRef.current,
        history,
        graphContextRef.current,
        (chunk) => {
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
        },
      );

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
              disabled={isGenerating || modalState.phase === "loading"}
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

          {/* Loading */}
          {modalState.phase === "loading" && (
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
                  style={{ width: `${modalState.progress}%` }}
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
                  setModalState({ phase: "idle" });
                  loadModel(selectedModel);
                }}
                className="border border-border px-3 py-1 text-xs text-foreground hover:bg-secondary transition-colors"
                data-ocid="ai_search.retry_button"
              >
                Retry
              </button>
            </div>
          )}

          {/* Chat area (ready or idle with cached engine) */}
          {(modalState.phase === "ready" || modalState.phase === "idle") &&
            engineRef.current && (
              <>
                {/* No graphs notice */}
                {graphs.length === 0 && (
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
