import {
  type TextGenerationPipeline,
  TextStreamer,
  pipeline,
} from "@huggingface/transformers";
import type {
  Curation,
  GraphData,
  InterpretationToken,
  LawToken,
  Location,
  PublishedSourceGraphMeta,
  Swarm,
  WeightedAttribute,
} from "../backend.d";

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
// Context formatters
// ---------------------------------------------------------------------------

const MAX_CONTEXT_CHARS = 12000;

/** Serialize a WeightedAttribute array into a compact key: value string. */
function serializeAttributes(attrs: WeightedAttribute[]): string {
  if (!attrs || attrs.length === 0) return "";
  return attrs
    .map((attr) => {
      const values = attr.weightedValues
        .map((wv) =>
          Number(wv.weight) > 1 ? `${wv.value}(×${wv.weight})` : wv.value,
        )
        .join(", ");
      return `${attr.key}: ${values}`;
    })
    .join("; ");
}

/**
 * Serializes the complete graph structure across all 5 hierarchy levels
 * plus explicit edges. Accepts the full GraphData for each published graph
 * alongside metadata for header information.
 */
export function formatGraphDataAsContext(
  metadatas: PublishedSourceGraphMeta[],
  graphDatas: (GraphData | null)[],
): string {
  const parts: string[] = [
    "You are an AI assistant helping users explore a legal knowledge graph platform called Hyvmind.",
    "The following published knowledge graphs are available with their full content:\n",
  ];

  for (let i = 0; i < metadatas.length; i++) {
    const graphData = graphDatas[i];
    if (!graphData) continue;
    const meta = metadatas[i];

    const date = new Date(
      Number(meta.publishedAt) / 1_000_000,
    ).toLocaleDateString();

    parts.push(
      `\n=== Graph: ${meta.name} ===\nCreator: ${meta.creatorName}\nPublished: ${date}`,
    );

    // Build id→name lookup for edge rendering
    const idToName = new Map<string, string>();
    for (const c of graphData.curations) idToName.set(c.id, c.name);
    for (const s of graphData.swarms) idToName.set(s.id, s.name);
    for (const l of graphData.locations) idToName.set(l.id, l.title);
    for (const lt of graphData.lawTokens) idToName.set(lt.id, lt.tokenLabel);
    for (const it of graphData.interpretationTokens)
      idToName.set(it.id, it.title);

    // Group nodes by parent for efficient hierarchy traversal
    const swarmsByCuration = new Map<string, Swarm[]>();
    for (const s of graphData.swarms) {
      const arr = swarmsByCuration.get(s.parentCurationId) ?? [];
      arr.push(s);
      swarmsByCuration.set(s.parentCurationId, arr);
    }

    const locationsBySwarm = new Map<string, Location[]>();
    for (const l of graphData.locations) {
      const arr = locationsBySwarm.get(l.parentSwarmId) ?? [];
      arr.push(l);
      locationsBySwarm.set(l.parentSwarmId, arr);
    }

    const lawsByLocation = new Map<string, LawToken[]>();
    for (const lt of graphData.lawTokens) {
      const arr = lawsByLocation.get(lt.parentLocationId) ?? [];
      arr.push(lt);
      lawsByLocation.set(lt.parentLocationId, arr);
    }

    const interpsByLaw = new Map<string, InterpretationToken[]>();
    for (const it of graphData.interpretationTokens) {
      const arr = interpsByLaw.get(it.parentLawTokenId) ?? [];
      arr.push(it);
      interpsByLaw.set(it.parentLawTokenId, arr);
    }

    // Walk 5-level hierarchy
    for (const curation of graphData.curations) {
      const cAttrs = serializeAttributes(curation.customAttributes);
      parts.push(`[Curation] ${curation.name}${cAttrs ? ` | ${cAttrs}` : ""}`);

      for (const swarm of swarmsByCuration.get(curation.id) ?? []) {
        const sAttrs = serializeAttributes(swarm.customAttributes);
        parts.push(`  [Swarm] ${swarm.name}${sAttrs ? ` | ${sAttrs}` : ""}`);

        for (const location of locationsBySwarm.get(swarm.id) ?? []) {
          const lAttrs = serializeAttributes(location.customAttributes);
          parts.push(
            `    [Location] ${location.title}${lAttrs ? ` | ${lAttrs}` : ""}`,
          );

          for (const law of lawsByLocation.get(location.id) ?? []) {
            const ltAttrs = serializeAttributes(law.customAttributes);
            parts.push(
              `      [Law] ${law.tokenLabel}${ltAttrs ? ` | ${ltAttrs}` : ""}`,
            );

            for (const interp of interpsByLaw.get(law.id) ?? []) {
              const content =
                interp.contentVersions[interp.contentVersions.length - 1]
                  ?.content ?? "";
              const itAttrs = serializeAttributes(interp.customAttributes);
              parts.push(
                `        [Interp] ${interp.title}: ${content}${itAttrs ? ` | ${itAttrs}` : ""}`,
              );
            }
          }
        }
      }
    }

    // Serialize edges with readable names
    if (graphData.edges.length > 0) {
      parts.push("  Edges:");
      for (const edge of graphData.edges) {
        const src = idToName.get(edge.source) ?? edge.source;
        const tgt = idToName.get(edge.target) ?? edge.target;
        parts.push(`    Edge: ${src} --[${edge.edgeLabel}]--> ${tgt}`);
      }
    }
  }

  parts.push(
    "\nAnswer questions about the knowledge graphs above. Be concise and helpful.",
  );

  const result = parts.join("\n");
  return result.length > MAX_CONTEXT_CHARS
    ? `${result.slice(0, MAX_CONTEXT_CHARS)}\n...[truncated]`
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
