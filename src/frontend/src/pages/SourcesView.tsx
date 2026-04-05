import { ArrowLeft, RefreshCw } from "lucide-react";
import { useState } from "react";

interface Source {
  id: string;
  title: string;
  description: string;
  url: string;
}

const SOURCES: Source[] = [
  {
    id: "indiacode",
    title: "India Code",
    description: "Browse Central and State Acts",
    url: "https://www.indiacode.nic.in/",
  },
  {
    id: "constitution",
    title: "Constitution of India",
    description: "Read the Indian Constitution",
    url: "https://www.constitutionofindia.net/read/",
  },
];

export default function SourcesView() {
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  if (selectedSource !== null) {
    return (
      <div className="flex h-full flex-col">
        {/* Iframe header */}
        <div className="flex items-center gap-3 border-b border-dashed border-border bg-background px-4 py-2 font-mono">
          <button
            type="button"
            onClick={() => setSelectedSource(null)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-ocid="sources.back_button"
          >
            <ArrowLeft className="h-3 w-3" />
            back
          </button>
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-xs text-foreground">
            {selectedSource.title}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {selectedSource.url}
          </span>
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => setIframeKey((k) => k + 1)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Reload"
              data-ocid="sources.reload_button"
            >
              <RefreshCw className="h-3 w-3" />
              reload
            </button>
          </div>
        </div>
        {/* Iframe */}
        <iframe
          key={iframeKey}
          src={selectedSource.url}
          title={selectedSource.title}
          className="flex-1 w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 font-mono">
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-1">sources</h2>
        <p className="text-xs text-muted-foreground">
          browse whitelisted legal reference sources
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SOURCES.map((source) => (
          <button
            key={source.id}
            type="button"
            onClick={() => setSelectedSource(source)}
            className="group text-left border border-dashed border-border bg-background p-4 hover:border-foreground hover:bg-accent transition-colors"
            data-ocid={`sources.card.${source.id}`}
          >
            <div className="mb-2 text-xs font-semibold text-foreground group-hover:text-accent-foreground">
              [{source.title}]
            </div>
            <div className="text-xs text-muted-foreground group-hover:text-foreground mb-3">
              {source.description}
            </div>
            <div className="text-xs text-muted-foreground truncate opacity-60">
              {source.url}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
