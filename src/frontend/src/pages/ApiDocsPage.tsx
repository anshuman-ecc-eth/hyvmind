import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { loadConfig } from "../config";

function CodeBlock({
  code,
  language = "bash",
}: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative group rounded border border-border bg-muted/30 overflow-hidden"
      data-ocid="api-docs.code_block"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20">
        <span className="font-mono text-xs text-muted-foreground">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-ocid="api-docs.copy_button"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> copy
            </>
          )}
        </button>
      </div>
      <pre className="px-4 py-3 overflow-x-auto text-sm font-mono text-foreground leading-relaxed whitespace-pre-wrap break-all">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Section({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4" data-ocid="api-docs.section">
      <h2 className="font-mono text-base font-semibold text-foreground border-b border-dashed border-border pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function EndpointCard({
  method,
  path,
  description,
  params,
  curl,
  response,
}: {
  method: string;
  path: string;
  description: string;
  params?: { name: string; required: boolean; desc: string }[];
  curl: string;
  response: string;
}) {
  return (
    <div
      className="rounded border border-border bg-card space-y-4 overflow-hidden"
      data-ocid="api-docs.endpoint_card"
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/20">
        <span className="font-mono text-xs font-bold bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
          {method}
        </span>
        <code className="font-mono text-sm text-foreground">{path}</code>
      </div>
      <div className="px-4 pb-4 space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>

        {params && params.length > 0 && (
          <div className="space-y-2">
            <p className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Parameters
            </p>
            <div className="rounded border border-border overflow-hidden">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-3 py-2 text-muted-foreground font-normal">
                      Name
                    </th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-normal">
                      Required
                    </th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-normal">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {params.map((p) => (
                    <tr
                      key={p.name}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2 text-foreground">{p.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {p.required ? "yes" : "no"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {p.desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Example Request
          </p>
          <CodeBlock code={curl} language="curl" />
        </div>

        <div className="space-y-2">
          <p className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Example Response
          </p>
          <CodeBlock code={response} language="json" />
        </div>
      </div>
    </div>
  );
}

export default function ApiDocsPage() {
  const [canisterId, setCanisterId] = useState<string | null>(null);

  useEffect(() => {
    loadConfig().then((cfg) => setCanisterId(cfg.backend_canister_id));
  }, []);

  if (!canisterId) {
    return (
      <div
        className="flex h-screen items-center justify-center bg-background font-mono text-xs text-muted-foreground"
        data-ocid="api-docs.loading_state"
      >
        loading...
      </div>
    );
  }

  const baseUrl = `https://${canisterId}.icp0.io`;

  const endpoints = [
    {
      method: "GET",
      path: "/api/tools",
      description:
        "Returns the MCP tools manifest. MCP-compatible clients (Claude Desktop, etc.) use this to auto-discover available tools.",
      params: [{ name: "api_key", required: true, desc: "Your API key" }],
      curl: `curl "${baseUrl}/api/tools?api_key=YOUR_KEY"`,
      response: `{
  "tools": [
    {
      "name": "get_all_graphs",
      "description": "List metadata for all published knowledge graphs",
      "inputSchema": { "type": "object", "properties": {} }
    },
    {
      "name": "get_graph_data",
      "description": "Get full graph data (nodes + edges) for a published graph by ID",
      "inputSchema": {
        "type": "object",
        "properties": { "id": { "type": "string", "description": "Published graph ID" } },
        "required": ["id"]
      }
    },
    {
      "name": "get_graph_nodes",
      "description": "Get all nodes for a published graph by ID",
      "inputSchema": {
        "type": "object",
        "properties": { "id": { "type": "string", "description": "Published graph ID" } },
        "required": ["id"]
      }
    },
    {
      "name": "get_graph_edges",
      "description": "Get all edges for a published graph by ID",
      "inputSchema": {
        "type": "object",
        "properties": { "id": { "type": "string", "description": "Published graph ID" } },
        "required": ["id"]
      }
    }
  ]
}`,
    },
    {
      method: "GET",
      path: "/api/graphs",
      description:
        "Returns metadata for all published knowledge graphs, including creator, node count, edge count, and publication date.",
      params: [{ name: "api_key", required: true, desc: "Your API key" }],
      curl: `curl "${baseUrl}/api/graphs?api_key=YOUR_KEY"`,
      response: `[
  {
    "id": "published-1713504000000000000-12345678",
    "name": "Contract Law",
    "creatorName": "Alice",
    "publishedAt": 1713504000000000000,
    "nodeCount": 42,
    "edgeCount": 31,
    "attributeCount": 18,
    "extensionLog": []
  }
]`,
    },
    {
      method: "GET",
      path: "/api/graphs/:id",
      description:
        "Returns full graph data for a single published graph, including all nodes and edges.",
      params: [
        { name: "api_key", required: true, desc: "Your API key" },
        {
          name: ":id",
          required: true,
          desc: "Published graph ID (from /api/graphs)",
        },
      ],
      curl: `curl "${baseUrl}/api/graphs/published-1713504000000000000-12345678?api_key=YOUR_KEY"`,
      response: `{
  "curations": [{ "id": "curation-abc", "name": "Contract Law", ... }],
  "swarms": [...],
  "locations": [...],
  "lawTokens": [...],
  "interpretationTokens": [...],
  "edges": [
    { "source": "node-id-1", "target": "node-id-2", "edgeLabel": "references", "directionality": "unidirectional" }
  ]
}`,
    },
    {
      method: "GET",
      path: "/api/nodes/:graphId",
      description:
        "Returns all nodes for a published graph, flattened into a single array with type annotations.",
      params: [
        { name: "api_key", required: true, desc: "Your API key" },
        { name: ":graphId", required: true, desc: "Published graph ID" },
      ],
      curl: `curl "${baseUrl}/api/nodes/published-1713504000000000000-12345678?api_key=YOUR_KEY"`,
      response: `[
  { "id": "curation-abc", "type": "curation", "name": "Contract Law", "parentId": null },
  { "id": "curation-abc@Research", "type": "swarm", "name": "Research", "parentId": "curation-abc" },
  { "id": "curation-abc@Research@Definitions", "type": "location", "name": "Definitions", "parentId": "curation-abc@Research" }
]`,
    },
    {
      method: "GET",
      path: "/api/edges/:graphId",
      description:
        "Returns all edges for a published graph, including hierarchy and cross-reference edges.",
      params: [
        { name: "api_key", required: true, desc: "Your API key" },
        { name: ":graphId", required: true, desc: "Published graph ID" },
      ],
      curl: `curl "${baseUrl}/api/edges/published-1713504000000000000-12345678?api_key=YOUR_KEY"`,
      response: `[
  {
    "source": "curation-abc@Research",
    "target": "curation-abc@Research@Definitions",
    "label": null,
    "bidirectional": false,
    "type": "hierarchy"
  },
  {
    "source": "curation-abc@Research@Definitions@Section1",
    "target": "curation-abc@Research@Definitions@Section2",
    "label": "references",
    "bidirectional": false,
    "type": "cross-reference"
  }
]`,
    },
  ];

  const mcpConfig = `{
  "mcpServers": {
    "hyvmind": {
      "url": "${baseUrl}/api/tools?api_key=YOUR_KEY",
      "transport": "http"
    }
  }
}`;

  return (
    <div
      className="min-h-screen overflow-y-auto bg-background"
      data-ocid="api-docs.page"
    >
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-12">
        {/* Page header */}
        <div className="space-y-2">
          <h1 className="font-mono text-xl font-semibold text-foreground">
            API
          </h1>
          <p className="text-sm text-muted-foreground">
            Hyvmind exposes a read-only MCP-compatible HTTP API for published
            knowledge graphs. Any MCP client or LLM can connect using the API
            key from your profile settings.
          </p>
        </div>

        {/* Overview */}
        <Section title="overview">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Hyvmind API provides programmatic access to all published
            knowledge graphs on the platform. It is designed to be consumed by
            language models and MCP clients, but works equally well from any
            HTTP client. All endpoints are read-only and return JSON.
          </p>
          <div className="rounded border border-border bg-muted/20 px-4 py-3 text-sm font-mono text-muted-foreground">
            Base URL: <span className="text-foreground">{baseUrl}</span>
          </div>
        </Section>

        {/* Authentication */}
        <Section title="authentication">
          <p className="text-sm text-muted-foreground">
            All API requests require an API key passed as a query parameter.
            Retrieve your key from{" "}
            <span className="font-mono text-foreground">
              Settings → API Key
            </span>
            .
          </p>
          <CodeBlock
            code={`GET ${baseUrl}/api/graphs?api_key=YOUR_KEY`}
            language="http"
          />
          <div className="rounded border border-border bg-muted/20 p-4 space-y-1 text-sm">
            <p className="text-muted-foreground">
              <span className="font-mono text-foreground">
                401 Unauthorized
              </span>{" "}
              — missing or invalid API key
            </p>
            <p className="text-muted-foreground">
              <span className="font-mono text-foreground">
                429 Too Many Requests
              </span>{" "}
              — rate limit exceeded
            </p>
          </div>
        </Section>

        {/* Rate Limits */}
        <Section title="rate limits">
          <p className="text-sm text-muted-foreground">
            Each API key is limited to{" "}
            <span className="font-mono text-foreground">
              100 requests per minute
            </span>
            . Exceeding this limit returns HTTP{" "}
            <span className="font-mono text-foreground">429</span>. The limit
            resets on a rolling 60-second window.
          </p>
        </Section>

        {/* Endpoints */}
        <Section title="endpoints">
          <div className="space-y-6">
            {endpoints.map((ep) => (
              <EndpointCard key={`${ep.method}-${ep.path}`} {...ep} />
            ))}
          </div>
        </Section>

        {/* MCP Setup */}
        <Section title="mcp setup">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Hyvmind API is MCP-spec compliant. The tools manifest at{" "}
            <code className="font-mono text-foreground text-xs bg-muted/40 px-1 py-0.5 rounded">
              /api/tools
            </code>{" "}
            allows Claude Desktop and other MCP-compatible clients to
            auto-discover and call the available tools.
          </p>
          <p className="text-sm text-muted-foreground">
            Add the following to your MCP client configuration (e.g.{" "}
            <code className="font-mono text-foreground text-xs bg-muted/40 px-1 py-0.5 rounded">
              ~/Library/Application Support/Claude/claude_desktop_config.json
            </code>
            ):
          </p>
          <CodeBlock code={mcpConfig} language="json" />
          <p className="text-sm text-muted-foreground">
            Replace{" "}
            <code className="font-mono text-foreground text-xs bg-muted/40 px-1 py-0.5 rounded">
              YOUR_KEY
            </code>{" "}
            with the key from your profile settings.
          </p>
        </Section>
      </div>
    </div>
  );
}
