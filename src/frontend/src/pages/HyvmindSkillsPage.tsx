import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

const BASE_URL = "https://4p5ty-yyaaa-aaaam-qfana-cai.raw.icp0.io";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors ml-auto shrink-0"
      data-ocid="skills.copy_button"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "copied" : "copy"}
    </button>
  );
}

function CodeBlock({
  code,
  language = "bash",
  label,
}: {
  code: string;
  language?: string;
  label?: string;
}) {
  return (
    <div className="border border-dashed border-white/20 rounded-none overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-dashed border-white/10 bg-white/5">
        <span className="font-mono text-xs text-white/40">
          {label ?? language}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="px-4 py-4 overflow-x-auto text-sm font-mono text-white/80 leading-relaxed whitespace-pre bg-zinc-900">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold uppercase tracking-widest border-b border-dashed border-white/40 mb-4 pb-2 font-mono">
      {children}
    </h2>
  );
}

const FRONTMATTER = `---
name: hyvmind
description: >
  Query Hyvmind's legal knowledge graphs — published curations of law,
  interpretations, and relationships — without authentication.
version: "1.0"
auth: none
base_url: ${BASE_URL}
endpoints:
  - GET /api/graphs
  - GET /api/graphs/{id}
  - GET /api/graphs/{id}/nodes
  - GET /api/graphs/{id}/edges
  - POST /mcp  # JSON-RPC 2.0, experimental
---`;

const CURL_EXAMPLE = `# List all published knowledge graphs
curl ${BASE_URL}/api/graphs

# Get full graph data by ID
curl ${BASE_URL}/api/graphs/published-1700000000-abc123

# Get all nodes for a graph
curl ${BASE_URL}/api/graphs/published-1700000000-abc123/nodes

# Get all edges for a graph
curl ${BASE_URL}/api/graphs/published-1700000000-abc123/edges`;

const JS_EXAMPLE = `// List all graphs
const res = await fetch("${BASE_URL}/api/graphs");
const graphs = await res.json();

// Get full graph data
const graphRes = await fetch(\`${BASE_URL}/api/graphs/\${graphId}\`);
const graph = await graphRes.json();

// Traverse nodes
const nodesRes = await fetch(\`${BASE_URL}/api/graphs/\${graphId}/nodes\`);
const { nodes } = await nodesRes.json();`;

const PYTHON_EXAMPLE = `import requests

BASE = "${BASE_URL}"

# List all graphs
graphs = requests.get(f"{BASE}/api/graphs").json()

# Get full graph data
graph = requests.get(f"{BASE}/api/graphs/{graph_id}").json()

# Get nodes
nodes = requests.get(f"{BASE}/api/graphs/{graph_id}/nodes").json()`;

const NODEJS_EXAMPLE = `const axios = require("axios");

const BASE = "${BASE_URL}";

// List all graphs
const { data: graphs } = await axios.get(\`\${BASE}/api/graphs\`);

// Get full graph
const { data: graph } = await axios.get(\`\${BASE}/api/graphs/\${graphId}\`);

// Get edges
const { data: edges } = await axios.get(\`\${BASE}/api/graphs/\${graphId}/edges\`);`;

const LANGCHAIN_EXAMPLE = `from langchain.tools import Tool
import requests

BASE = "${BASE_URL}"

def fetch_hyvmind_graphs(_input: str = "") -> str:
    """Fetch all published Hyvmind legal knowledge graphs."""
    graphs = requests.get(f"{BASE}/api/graphs").json()
    return str(graphs)

def fetch_hyvmind_graph(graph_id: str) -> str:
    """Fetch full graph data for a specific Hyvmind knowledge graph."""
    data = requests.get(f"{BASE}/api/graphs/{graph_id}").json()
    return str(data)

hyvmind_tools = [
    Tool(
        name="hyvmind_list_graphs",
        func=fetch_hyvmind_graphs,
        description="List all published legal knowledge graphs in Hyvmind.",
    ),
    Tool(
        name="hyvmind_get_graph",
        func=fetch_hyvmind_graph,
        description="Get full nodes and edges for a Hyvmind knowledge graph by ID.",
    ),
]`;

const SAMPLE_RESPONSE = `{
  "graphs": [
    {
      "id": "published-1720000000-9a8b7c",
      "name": "Indian Contract Act 1872",
      "creator": "researcher-xyz",
      "publishedAt": 1720000000000000000,
      "nodeCount": 142,
      "edgeCount": 87,
      "attributeCount": 214,
      "artworkDataUrl": null
    },
    {
      "id": "published-1721000000-3f4e5d",
      "name": "GDPR Regulatory Framework",
      "creator": "legal-ai-team",
      "publishedAt": 1721000000000000000,
      "nodeCount": 98,
      "edgeCount": 63,
      "attributeCount": 155,
      "artworkDataUrl": "data:image/jpeg;base64,..."
    }
  ]
}`;

const SAMPLE_QUERIES = [
  {
    label: "Which graphs are available?",
    code: `curl ${BASE_URL}/api/graphs | jq '.graphs[].name'`,
    note: "Returns array of graph names",
  },
  {
    label: "How many nodes does a graph have?",
    code: `curl ${BASE_URL}/api/graphs | jq '.graphs[] | {name, nodeCount}'`,
    note: "Prints name + nodeCount for each graph",
  },
  {
    label: "Get all law entity nodes from a graph",
    code: `curl ${BASE_URL}/api/graphs/GRAPH_ID/nodes | jq '[.nodes[] | select(.type == "LawToken")]'`,
    note: "Filters to law entity nodes only",
  },
  {
    label: "Find edges by label",
    code: `curl ${BASE_URL}/api/graphs/GRAPH_ID/edges | jq '[.edges[] | select(.label == "overrides")]'`,
    note: "Returns all edges with label 'overrides'",
  },
];

export default function HyvmindSkillsPage() {
  return (
    <div
      className="min-h-screen overflow-y-auto font-mono"
      style={{ background: "#000000", color: "#ffffff" }}
      data-ocid="skills.page"
    >
      {/* Header bar */}
      <div
        className="border-b border-dashed border-white/20 px-6 py-4"
        style={{ background: "#0a0a0a" }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="font-mono text-sm font-bold tracking-widest uppercase">
            hyvmind / skills
          </span>
          <a
            href="/"
            className="font-mono text-xs text-white/40 hover:text-white/80 transition-colors"
            data-ocid="skills.home_link"
          >
            ← back to app
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-14">
        {/* Page title */}
        <div className="space-y-3">
          <div className="text-xs text-white/30 uppercase tracking-widest">
            SKILLS DOCUMENTATION
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Hyvmind Open API
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-2xl">
            Query legal knowledge graphs from any environment — server, browser,
            or CLI. No authentication, no API key, no rate limits.
          </p>
        </div>

        {/* YAML Frontmatter */}
        <section data-ocid="skills.frontmatter.section">
          <SectionHeader>Skill Manifest</SectionHeader>
          <CodeBlock code={FRONTMATTER} language="yaml" />
        </section>

        {/* What This Is */}
        <section data-ocid="skills.about.section">
          <SectionHeader>What This Is</SectionHeader>
          <div
            className="border border-dashed border-white/20 p-5 space-y-3 text-sm leading-relaxed text-white/70"
            style={{ background: "#0d0d0d" }}
          >
            <p>
              Hyvmind is a collaborative legal knowledge graph platform. Users
              upload structured source documents to create published graphs of{" "}
              <span className="text-red-400">law entities</span> and their{" "}
              <span className="text-purple-400">interpretation tokens</span> —
              rich semantic networks capturing how legal text is understood,
              debated, and applied.
            </p>
            <p>
              All published graphs are public and openly queryable. The API
              returns structured JSON you can parse, embed, or reason across
              with any language model.
            </p>
          </div>
        </section>

        {/* Prerequisites */}
        <section data-ocid="skills.prerequisites.section">
          <SectionHeader>Prerequisites</SectionHeader>
          <ul
            className="space-y-2 text-sm text-white/70 border border-dashed border-white/20 p-5"
            style={{ background: "#0d0d0d" }}
          >
            {[
              "HTTP client (curl, fetch, requests, axios — any will work)",
              "No authentication required",
              "No API key required",
              "No deployment or setup needed",
              "No CORS restrictions — works from browser, Node.js, Python, or CLI",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-white/30 shrink-0">▸</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* API Base URL */}
        <section data-ocid="skills.base_url.section">
          <SectionHeader>API Base URL</SectionHeader>
          <CodeBlock code={BASE_URL} language="url" />
          <p className="text-xs text-white/40 mt-3">
            Hosted on the Internet Computer (ICP). Requests are served directly
            from a canister — no intermediary servers.
          </p>
        </section>

        {/* How It Works */}
        <section data-ocid="skills.how_it_works.section">
          <SectionHeader>How It Works</SectionHeader>
          <div className="space-y-3">
            <p className="text-sm text-white/60 mb-4">
              Each published knowledge graph has a 5-level hierarchy:
            </p>
            <div className="border border-dashed border-white/20 overflow-hidden">
              {[
                {
                  level: "1",
                  name: "Curation",
                  desc: "Top-level named collection of legal knowledge (e.g. 'Indian Contract Act 1872')",
                  color: "text-white/80",
                },
                {
                  level: "2",
                  name: "Swarm",
                  desc: "Thematic grouping within a curation (e.g. 'Offer and Acceptance', 'Consideration')",
                  color: "text-white/70",
                },
                {
                  level: "3",
                  name: "Location",
                  desc: "Document or section reference (e.g. 'Section 10', 'Chapter 2')",
                  color: "text-white/60",
                },
                {
                  level: "4",
                  name: "Law Entity",
                  desc: "A discrete legal concept, rule, or clause extracted from the source",
                  color: "text-red-400",
                },
                {
                  level: "5",
                  name: "Interpretation Token",
                  desc: "Commentary, analysis, or annotation applied to a law entity",
                  color: "text-purple-400",
                },
              ].map((row, i) => (
                <div
                  key={row.level}
                  className={`flex gap-4 px-4 py-3 text-sm ${i < 4 ? "border-b border-dashed border-white/10" : ""}`}
                  style={{ background: i % 2 === 0 ? "#0d0d0d" : "#111111" }}
                >
                  <span className="text-white/25 font-mono shrink-0 w-4">
                    {row.level}
                  </span>
                  <span className={`font-bold shrink-0 w-36 ${row.color}`}>
                    {row.name}
                  </span>
                  <span className="text-white/50">{row.desc}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/30 mt-2">
              Nodes store weighted attributes. Edges are explicit semantic
              relationships between nodes (e.g. "overrides", "clarifies",
              "contradicts").
            </p>
          </div>
        </section>

        {/* Available Endpoints */}
        <section data-ocid="skills.endpoints.section">
          <SectionHeader>Available Endpoints</SectionHeader>
          <div className="border border-dashed border-white/20 overflow-hidden">
            {[
              {
                method: "GET",
                path: "/api/graphs",
                desc: "List all published knowledge graphs with metadata (name, creator, node/edge counts)",
              },
              {
                method: "GET",
                path: "/api/graphs/{id}",
                desc: "Get full graph data including all nodes, edges, and attributes for a specific graph",
              },
              {
                method: "GET",
                path: "/api/graphs/{id}/nodes",
                desc: "Get all nodes for a graph (curations, swarms, locations, law entities, interpretation tokens)",
              },
              {
                method: "GET",
                path: "/api/graphs/{id}/edges",
                desc: "Get all semantic edges for a graph with source, target, label, and directionality",
              },
              {
                method: "POST",
                path: "/mcp",
                desc: "JSON-RPC 2.0 MCP endpoint — experimental; SSE streaming may have issues in some clients",
                experimental: true,
              },
            ].map((ep, i) => (
              <div
                key={ep.path}
                className={`flex gap-4 px-4 py-3 text-sm ${i < 4 ? "border-b border-dashed border-white/10" : ""}`}
                style={{ background: i % 2 === 0 ? "#0d0d0d" : "#111111" }}
                data-ocid={`skills.endpoint.item.${i + 1}`}
              >
                <span
                  className={`font-mono font-bold shrink-0 w-12 text-xs ${
                    ep.method === "GET" ? "text-green-400" : "text-yellow-400"
                  }`}
                >
                  {ep.method}
                </span>
                <span className="font-mono text-white/80 shrink-0 w-64 text-xs">
                  {ep.path}
                </span>
                <span className="text-white/50 text-xs">
                  {ep.desc}
                  {ep.experimental && (
                    <span className="ml-2 text-yellow-500/60 text-xs">
                      [experimental]
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Implementation Examples */}
        <section data-ocid="skills.examples.section">
          <SectionHeader>Implementation Examples</SectionHeader>
          <div className="space-y-6">
            <CodeBlock code={CURL_EXAMPLE} language="bash" label="cURL" />
            <CodeBlock
              code={JS_EXAMPLE}
              language="javascript"
              label="JavaScript / TypeScript (fetch)"
            />
            <CodeBlock
              code={PYTHON_EXAMPLE}
              language="python"
              label="Python (requests)"
            />
            <CodeBlock
              code={NODEJS_EXAMPLE}
              language="javascript"
              label="Node.js (axios)"
            />
            <CodeBlock
              code={LANGCHAIN_EXAMPLE}
              language="python"
              label="LangChain Tool integration"
            />
          </div>
        </section>

        {/* Data Structure Example */}
        <section data-ocid="skills.data_structure.section">
          <SectionHeader>Data Structure Example</SectionHeader>
          <p className="text-xs text-white/40 mb-3">
            Response from <code className="text-white/60">GET /api/graphs</code>
          </p>
          <CodeBlock code={SAMPLE_RESPONSE} language="json" />
        </section>

        {/* Browser Support */}
        <section data-ocid="skills.browser_support.section">
          <SectionHeader>Browser Support</SectionHeader>
          <div
            className="border border-dashed border-white/20 p-5 text-sm text-white/70 space-y-2"
            style={{ background: "#0d0d0d" }}
          >
            <p>
              All API responses include{" "}
              <code className="text-white/80">
                Access-Control-Allow-Origin: *
              </code>{" "}
              headers.
            </p>
            <p>
              You can call the API directly from any browser origin with no
              proxy needed:
            </p>
            <CodeBlock
              code={`fetch("${BASE_URL}/api/graphs")
  .then(r => r.json())
  .then(console.log);`}
              language="javascript"
              label="Browser console"
            />
            <p className="text-xs text-white/40 mt-2">
              OPTIONS preflight requests return 204 with full CORS headers.
            </p>
          </div>
        </section>

        {/* Current Graphs */}
        <section data-ocid="skills.current_graphs.section">
          <SectionHeader>Current Graphs</SectionHeader>
          <p className="text-xs text-white/40 mb-3">
            Fetch live data from{" "}
            <code className="text-white/60">GET /api/graphs</code> — the table
            below shows the schema.
          </p>
          <div className="border border-dashed border-white/20 overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr
                  className="border-b border-dashed border-white/20"
                  style={{ background: "#111111" }}
                >
                  {[
                    "id",
                    "name",
                    "creator",
                    "nodeCount",
                    "edgeCount",
                    "publishedAt",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2 text-white/30 font-normal"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "#0d0d0d" }}>
                  <td className="px-4 py-3 text-white/40 italic" colSpan={6}>
                    ← call /api/graphs to see live published graphs →
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Sample Queries */}
        <section data-ocid="skills.sample_queries.section">
          <SectionHeader>Sample Queries</SectionHeader>
          <div className="space-y-6">
            {SAMPLE_QUERIES.map((q) => (
              <div
                key={q.label}
                data-ocid={`skills.sample_query.item.${SAMPLE_QUERIES.indexOf(q) + 1}`}
              >
                <p className="text-sm text-white/70 mb-2">
                  <span className="text-white/30 mr-2">
                    {SAMPLE_QUERIES.indexOf(q) + 1}.
                  </span>
                  {q.label}
                </p>
                <CodeBlock code={q.code} language="bash" />
                {q.note && (
                  <p className="text-xs text-white/30 mt-1 pl-1">↳ {q.note}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Links */}
        <section data-ocid="skills.links.section">
          <SectionHeader>Links</SectionHeader>
          <div className="flex flex-wrap gap-4 text-sm">
            <a
              href="https://hyvmind.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-dashed border-white/20 px-4 py-2 text-white/60 hover:text-white/90 hover:border-white/40 transition-colors"
              data-ocid="skills.app_link"
            >
              <ExternalLink className="h-3 w-3" />
              hyvmind.xyz — app
            </a>
            <a
              href="/mcp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-dashed border-white/20 px-4 py-2 text-white/60 hover:text-white/90 hover:border-white/40 transition-colors"
              data-ocid="skills.mcp_link"
            >
              <ExternalLink className="h-3 w-3" />
              /mcp — MCP setup docs
            </a>
            <a
              href={`${BASE_URL}/api/graphs`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-dashed border-white/20 px-4 py-2 text-white/60 hover:text-white/90 hover:border-white/40 transition-colors"
              data-ocid="skills.api_link"
            >
              <ExternalLink className="h-3 w-3" />
              Live API — /api/graphs
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-dashed border-white/10 pt-8 text-xs text-white/20 font-mono">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
              typeof window !== "undefined" ? window.location.hostname : "",
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/40 transition-colors underline underline-offset-2"
          >
            caffeine.ai
          </a>
        </footer>
      </div>
    </div>
  );
}
