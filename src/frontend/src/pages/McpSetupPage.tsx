import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
} from "lucide-react";
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
      className="relative rounded border border-border overflow-hidden"
      data-ocid="mcp.code_block"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <span className="font-mono text-xs text-muted-foreground">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-ocid="mcp.copy_button"
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
      <pre className="px-4 py-3 overflow-x-auto text-sm font-mono text-foreground leading-relaxed whitespace-pre-wrap break-all bg-muted/10">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4" data-ocid="mcp.step">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
        <span className="font-mono text-xs font-semibold text-primary">
          {number}
        </span>
      </div>
      <div className="flex-1 space-y-2 pt-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {children}
      </div>
    </div>
  );
}

export default function McpSetupPage() {
  const [canisterId, setCanisterId] = useState<string | null>(null);
  const [othersOpen, setOthersOpen] = useState(false);

  useEffect(() => {
    loadConfig().then((cfg) => setCanisterId(cfg.backend_canister_id));
  }, []);

  if (!canisterId) {
    return (
      <div
        className="flex h-screen items-center justify-center bg-background font-mono text-xs text-muted-foreground"
        data-ocid="mcp.loading_state"
      >
        loading...
      </div>
    );
  }

  const mcpUrl = `https://${canisterId}.icp0.io/mcp`;

  const ironclawAddCmd = `ironclaw mcp add hyvmind ${mcpUrl} --header "Authorization:Bearer YOUR_API_KEY"`;
  const ironclawTestCmd = "ironclaw mcp test hyvmind";

  const claudeConfig = `{
  "mcpServers": {
    "hyvmind": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`;

  return (
    <div
      className="min-h-screen overflow-y-auto bg-background"
      data-ocid="mcp.page"
    >
      {/* Header bar */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="font-mono text-sm font-semibold text-foreground">
            hyvmind
          </span>
          <a
            href="/"
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-ocid="mcp.home_link"
          >
            ← back to app
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-12">
        {/* Page header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Connect with MCP
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Use your Hyvmind knowledge graphs as context for AI agents
          </p>
        </div>

        {/* Section 1: Get API Key */}
        <div className="space-y-3" data-ocid="mcp.api_key_section">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide font-mono border-b border-dashed border-border pb-2">
            Get Your API Key
          </h2>
          <div className="rounded border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
            Log in to Hyvmind and generate an API key from your profile settings{" "}
            <span className="font-mono text-foreground text-xs bg-muted/40 px-1.5 py-0.5 rounded">
              top-right menu → Profile Settings
            </span>
            . Your key will appear in the{" "}
            <span className="font-mono text-foreground text-xs">API Key</span>{" "}
            section.
          </div>
        </div>

        {/* Section 2: IronClaw Setup */}
        <div className="space-y-5" data-ocid="mcp.ironclaw_section">
          <div className="flex items-center justify-between border-b border-dashed border-border pb-2">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide font-mono">
              IronClaw Setup
            </h2>
            <a
              href="https://github.com/nearai/ironclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="mcp.ironclaw_link"
            >
              <ExternalLink className="h-3 w-3" />
              github
            </a>
          </div>

          <div className="space-y-6">
            <Step number={1} title="Install IronClaw">
              <p className="text-xs text-muted-foreground">
                Follow the installation instructions on the{" "}
                <a
                  href="https://github.com/nearai/ironclaw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
                >
                  IronClaw GitHub repository
                </a>
                .
              </p>
            </Step>

            <Step number={2} title="Add Hyvmind as an MCP server">
              <CodeBlock code={ironclawAddCmd} language="bash" />
              <p className="text-xs text-muted-foreground">
                Replace{" "}
                <code className="font-mono bg-muted/40 px-1 py-0.5 rounded text-foreground">
                  YOUR_API_KEY
                </code>{" "}
                with the key from your profile settings.
              </p>
            </Step>

            <Step number={3} title="Test the connection">
              <CodeBlock code={ironclawTestCmd} language="bash" />
            </Step>

            <Step number={4} title="Try a prompt">
              <div className="rounded border border-border bg-muted/10 px-4 py-3 font-mono text-sm text-foreground italic">
                "What knowledge graphs are available in Hyvmind?"
              </div>
            </Step>
          </div>
        </div>

        {/* Section 3: Other MCP Clients (collapsible) */}
        <div className="space-y-3" data-ocid="mcp.other_clients_section">
          <button
            type="button"
            onClick={() => setOthersOpen((v) => !v)}
            className="flex items-center gap-2 w-full text-left border-b border-dashed border-border pb-2 group"
            data-ocid="mcp.other_clients_toggle"
          >
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide font-mono flex-1">
              Other MCP Clients
            </h2>
            {othersOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
          </button>

          {othersOpen && (
            <div
              className="space-y-4 pt-1"
              data-ocid="mcp.other_clients_content"
            >
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Claude Desktop
                </p>
                <p className="text-xs text-muted-foreground">
                  Add the following to your Claude Desktop configuration file at{" "}
                  <code className="font-mono bg-muted/40 px-1 py-0.5 rounded text-foreground text-xs">
                    ~/Library/Application
                    Support/Claude/claude_desktop_config.json
                  </code>
                  :
                </p>
                <CodeBlock code={claudeConfig} language="json" />
              </div>
              <div className="rounded border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                Replace{" "}
                <code className="font-mono text-foreground bg-muted/40 px-1 py-0.5 rounded">
                  YOUR_API_KEY
                </code>{" "}
                with your key from profile settings.
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Available Tools */}
        <div className="space-y-4" data-ocid="mcp.tools_section">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide font-mono border-b border-dashed border-border pb-2">
            Available Tools
          </h2>
          <div className="rounded border border-border overflow-hidden">
            <table
              className="w-full text-sm font-mono"
              data-ocid="mcp.tools_table"
            >
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground font-normal">
                    Tool name
                  </th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground font-normal">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  className="border-b border-border"
                  data-ocid="mcp.tools_table.item.1"
                >
                  <td className="px-4 py-3 text-foreground text-xs font-mono">
                    get_all_graphs
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    Returns metadata for all published knowledge graphs
                  </td>
                </tr>
                <tr data-ocid="mcp.tools_table.item.2">
                  <td className="px-4 py-3 text-foreground text-xs font-mono">
                    get_graph
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    Returns full graph data (nodes and edges) for a specific
                    graph. Requires{" "}
                    <code className="bg-muted/40 px-1 py-0.5 rounded">
                      graphId
                    </code>{" "}
                    parameter.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
