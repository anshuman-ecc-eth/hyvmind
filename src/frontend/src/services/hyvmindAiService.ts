import {
  type TextGenerationPipeline,
  TextStreamer,
  pipeline,
} from "@huggingface/transformers";
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
    id: "smollm2-135m",
    label: "SmolLM2-135M (fastest, ~118MB)",
    modelId: "HuggingFaceTB/SmolLM2-135M-Instruct",
  },
  {
    id: "smollm2-360m",
    label: "SmolLM2-360M (~273MB)",
    modelId: "HuggingFaceTB/SmolLM2-360M-Instruct",
  },
  {
    id: "smollm2-1.7b",
    label: "SmolLM2-1.7B (~1.1GB)",
    modelId: "HuggingFaceTB/SmolLM2-1.7B-Instruct",
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
// Pipeline initialisation
// ---------------------------------------------------------------------------

// The public engine handle used by the component layer
export type { TextGenerationPipeline };

export interface ProgressInfo {
  status: string;
  progress?: number;
  file?: string;
}

export async function initModelPipeline(
  modelId: string,
  onProgress: (info: ProgressInfo) => void,
): Promise<TextGenerationPipeline> {
  const pipe = await pipeline("text-generation", modelId, {
    device: "webgpu",
    progress_callback: (info: ProgressInfo) => {
      onProgress(info);
    },
  });
  return pipe;
}

// ---------------------------------------------------------------------------
// Chat completion
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function generateAiResponse(
  engine: TextGenerationPipeline,
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
    // Streaming path via TextStreamer
    let accumulated = "";
    const streamer = new TextStreamer(engine.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (token: string) => {
        accumulated += token;
        onChunk(token);
      },
    });

    await engine(allMessages, {
      max_new_tokens: 256,
      streamer,
    });

    return accumulated;
  }

  // Non-streaming fallback
  const output = await engine(allMessages, { max_new_tokens: 256 });
  const result = Array.isArray(output) ? output[0] : output;
  if (
    result &&
    typeof result === "object" &&
    "generated_text" in result &&
    Array.isArray(result.generated_text)
  ) {
    const last = result.generated_text[result.generated_text.length - 1];
    if (last && typeof last === "object" && "content" in last) {
      return String(last.content);
    }
  }
  return "";
}
