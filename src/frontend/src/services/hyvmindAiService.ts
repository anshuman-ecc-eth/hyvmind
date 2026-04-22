import type { InitProgressReport, MLCEngine } from "@mlc-ai/web-llm";
import { CreateMLCEngine } from "@mlc-ai/web-llm";
import type { PublishedSourceGraphMeta } from "../hooks/usePublicGraphs";

// ---------------------------------------------------------------------------
// Model options
// ---------------------------------------------------------------------------

export interface ModelOption {
  id: string;
  label: string;
  modelId: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "smollm2",
    label: "SmolLM2-135M (fastest, ~270MB)",
    modelId: "SmolLM2-135M-Instruct-q4f16_1-MLC",
  },
  {
    id: "qwen",
    label: "Qwen2.5-0.5B (~400MB)",
    modelId: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
  },
  {
    id: "tinyllama",
    label: "TinyLlama-1.1B (~670MB)",
    modelId: "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC",
  },
];

// ---------------------------------------------------------------------------
// Context formatter
// ---------------------------------------------------------------------------

const MAX_GRAPHS = 50;
const MAX_CONTEXT_CHARS = 8000;

export function formatGraphsAsContext(
  graphs: PublishedSourceGraphMeta[],
): string {
  const subset = graphs.slice(0, MAX_GRAPHS);

  const lines: string[] = [
    "You are an AI assistant helping users explore a legal knowledge graph platform called Hyvmind.",
    "The following published knowledge graphs are available in the system:\n",
  ];

  for (const g of subset) {
    const date = new Date(
      Number(g.publishedAt) / 1_000_000,
    ).toLocaleDateString();
    lines.push(
      `- Graph: "${g.name}" | Creator: ${g.creatorName} | Nodes: ${Number(g.nodeCount)} | Edges: ${Number(g.edgeCount)} | Attributes: ${Number(g.attributeCount)} | Published: ${date}`,
    );
  }

  if (graphs.length > MAX_GRAPHS) {
    lines.push(
      `\n(Showing first ${MAX_GRAPHS} of ${graphs.length} total graphs.)`,
    );
  }

  lines.push(
    "\nAnswer questions about the knowledge graphs above. Be concise and helpful.",
  );

  const result = lines.join("\n");
  return result.length > MAX_CONTEXT_CHARS
    ? `${result.slice(0, MAX_CONTEXT_CHARS)}\n...(truncated)`
    : result;
}

// ---------------------------------------------------------------------------
// Engine initialisation
// ---------------------------------------------------------------------------

export async function initWebLLMEngine(
  modelId: string,
  onProgress: (report: InitProgressReport) => void,
): Promise<MLCEngine> {
  const engine = await CreateMLCEngine(modelId, {
    initProgressCallback: onProgress,
  });
  return engine;
}

// ---------------------------------------------------------------------------
// Chat completion
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function generateAiResponse(
  engine: MLCEngine,
  messages: ChatMessage[],
  graphContext: string,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  const systemMessage: ChatMessage = {
    role: "system",
    content: graphContext,
  };

  const allMessages = [systemMessage, ...messages];

  if (onChunk) {
    // Streaming
    const chunks = await engine.chat.completions.create({
      messages: allMessages,
      stream: true,
    });

    let full = "";
    for await (const chunk of chunks) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        full += delta;
        onChunk(delta);
      }
    }
    return full;
  }

  // Non-streaming fallback
  const reply = await engine.chat.completions.create({
    messages: allMessages,
    stream: false,
  });

  return reply.choices[0]?.message?.content ?? "";
}
