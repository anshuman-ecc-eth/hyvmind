import { useEffect, useRef } from "react";

interface OntologyModalProps {
  turtle: string;
  onClose: () => void;
  onCopy: () => void;
  copied: boolean;
  graphName: string;
}

export default function OntologyModal({
  turtle,
  onClose,
  onCopy,
  copied,
  graphName,
}: OntologyModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    el.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleDownload = () => {
    const blob = new Blob([turtle], { type: "text/turtle" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${graphName.replace(/[^a-zA-Z0-9_-]/g, "_")}.ttl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 outline-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl mx-4 bg-background border border-dashed border-border font-mono flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-dashed border-border shrink-0">
          <span className="text-xs text-muted-foreground uppercase tracking-widest">
            ontology (turtle)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="text-xs text-muted-foreground hover:text-foreground border border-dashed border-border px-2 py-0.5 transition-colors"
            >
              download .ttl
            </button>
            <button
              type="button"
              onClick={onCopy}
              className="text-xs text-muted-foreground hover:text-foreground border border-dashed border-border px-2 py-0.5 transition-colors"
            >
              {copied ? "copied!" : "copy"}
            </button>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={onClose}
            >
              [x]
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <pre className="text-xs text-foreground/80 whitespace-pre-wrap break-all">
            {turtle}
          </pre>
        </div>
      </div>
    </div>
  );
}
