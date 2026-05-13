import { useState } from "react";
import MermaidDiagram from "./MermaidDiagram";

interface TerminalOntologyOutputProps {
  turtleText: string;
  mermaidText: string | null;
  mermaidError?: string;
}

export default function TerminalOntologyOutput({
  turtleText,
  mermaidText,
  mermaidError,
}: TerminalOntologyOutputProps) {
  const [copiedTurtle, setCopiedTurtle] = useState(false);
  const [copiedMermaid, setCopiedMermaid] = useState(false);
  const [clientMermaidError, setClientMermaidError] = useState<string | null>(
    null,
  );

  const handleCopyTurtle = () => {
    navigator.clipboard.writeText(turtleText);
    setCopiedTurtle(true);
    setTimeout(() => setCopiedTurtle(false), 2000);
  };

  const handleCopyMermaid = () => {
    if (mermaidText) {
      navigator.clipboard.writeText(mermaidText);
      setCopiedMermaid(true);
      setTimeout(() => setCopiedMermaid(false), 2000);
    }
  };

  const handleMermaidError = (error: string) => {
    setClientMermaidError(error);
  };

  // Combine server-side and client-side errors
  const displayError = mermaidError || clientMermaidError;

  return (
    <div className="flex flex-col gap-3 my-2">
      {/* Turtle Section */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-muted-foreground">
            Turtle (TTL)
          </span>
          <button
            type="button"
            onClick={handleCopyTurtle}
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5"
          >
            {copiedTurtle ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="font-mono text-xs bg-muted/30 p-3 rounded border border-border overflow-x-auto whitespace-pre">
          {turtleText}
        </pre>
      </div>

      {/* Mermaid Section */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-muted-foreground">
            Mermaid Diagram
          </span>
          {mermaidText && (
            <button
              type="button"
              onClick={handleCopyMermaid}
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5"
            >
              {copiedMermaid ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
        {displayError ? (
          <div className="font-mono text-xs bg-destructive/10 text-destructive p-3 rounded border border-destructive/30">
            {displayError}
          </div>
        ) : mermaidText ? (
          <MermaidDiagram
            mermaidText={mermaidText}
            onError={handleMermaidError}
          />
        ) : (
          <div className="font-mono text-xs bg-muted/30 text-muted-foreground p-3 rounded border border-border">
            No diagram available
          </div>
        )}
      </div>
    </div>
  );
}
