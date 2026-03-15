import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  mermaidText: string;
  onError?: (error: string) => void;
}

export default function MermaidDiagram({
  mermaidText,
  onError,
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mermaidLoaded, setMermaidLoaded] = useState(false);
  const renderTokenRef = useRef<number>(0);

  // Load Mermaid from CDN
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).mermaid) {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
      script.async = true;
      script.onload = () => {
        const mermaid = (window as any).mermaid;
        if (mermaid) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "neutral",
            securityLevel: "loose",
            fontFamily: "monospace",
          });
          setMermaidLoaded(true);
        }
      };
      script.onerror = () => {
        const errorMsg = "Failed to load Mermaid library";
        setError(errorMsg);
        setIsLoading(false);
        if (onError) {
          onError(errorMsg);
        }
      };
      document.head.appendChild(script);
    } else if ((window as any).mermaid) {
      setMermaidLoaded(true);
    }
  }, [onError]);

  // Reset state when mermaidText changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset without renderTokenRef
  useEffect(() => {
    setSvg("");
    setError(null);
    setIsLoading(true);
    renderTokenRef.current += 1;
  }, [mermaidText]);

  // Render diagram when mermaidText or mermaidLoaded changes
  useEffect(() => {
    const renderDiagram = async () => {
      if (!mermaidText || !mermaidLoaded) {
        setIsLoading(false);
        return;
      }

      const mermaid = (window as any).mermaid;
      if (!mermaid) {
        setIsLoading(false);
        return;
      }

      // Capture current render token to detect stale renders
      const currentToken = renderTokenRef.current;

      try {
        // Validate Mermaid syntax before rendering
        if (
          !mermaidText.trim().startsWith("flowchart") &&
          !mermaidText.trim().startsWith("graph") &&
          !mermaidText.trim().startsWith("sequenceDiagram") &&
          !mermaidText.trim().startsWith("classDiagram") &&
          !mermaidText.trim().startsWith("stateDiagram") &&
          !mermaidText.trim().startsWith("erDiagram") &&
          !mermaidText.trim().startsWith("journey") &&
          !mermaidText.trim().startsWith("gantt") &&
          !mermaidText.trim().startsWith("pie")
        ) {
          throw new Error(
            "Invalid Mermaid diagram type. Must start with a valid diagram declaration (e.g., flowchart, graph, etc.)",
          );
        }

        // Generate unique ID for this diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(id, mermaidText);

        // Only update if this render is still current (not stale)
        if (currentToken === renderTokenRef.current) {
          setSvg(renderedSvg);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        // Only update if this render is still current (not stale)
        if (currentToken === renderTokenRef.current) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to render Mermaid diagram";
          setError(errorMessage);
          setIsLoading(false);
          if (onError) {
            onError(errorMessage);
          }
        }
      }
    };

    renderDiagram();
  }, [mermaidText, mermaidLoaded, onError]);

  if (error) {
    return (
      <div className="font-mono text-xs bg-destructive/10 text-destructive p-3 rounded border border-destructive/30">
        Mermaid render error: {error}
      </div>
    );
  }

  if (isLoading || !svg) {
    return (
      <div className="font-mono text-xs bg-muted/30 text-muted-foreground p-3 rounded border border-border">
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-muted/30 p-3 rounded border border-border overflow-x-auto"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG output from Mermaid library
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
