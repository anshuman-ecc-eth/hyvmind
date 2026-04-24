import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActor } from "@caffeineai/core-infrastructure";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { createActor } from "../../backend";
import type { backendInterface } from "../../backend";
import { parseHTML } from "../../utils/htmlParser";

interface Props {
  onFetched: (title: string, rawHtml: string, url: string) => void;
}

export function URLImporter({ onFetched }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { actor: _rawActor } = useActor(createActor);
  const actor = _rawActor as backendInterface | null;

  async function handleFetch() {
    setError(null);

    if (!url.startsWith("https://")) {
      setError("URL must start with https://");
      return;
    }

    if (!actor) {
      setError("Actor not initialized, please try again");
      return;
    }

    setLoading(true);
    try {
      // Fetch via IC HTTP outcall — bypasses CORS restrictions
      const result = await (actor as any).fetchURL(url);
      if ("ok" in result) {
        const { html, title } = result.ok;
        await parseHTML(html, url);
        onFetched(title, html, url);
      } else {
        setError(result.err);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch URL");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor="url-importer-input"
        className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
      >
        Web URL
      </label>
      <div className="flex gap-2">
        <Input
          id="url-importer-input"
          data-ocid="url-importer.input"
          type="url"
          placeholder="https://example.com/article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleFetch()}
          className="flex-1 font-mono text-xs border-2 border-dashed border-border rounded-none bg-background"
          disabled={loading}
        />
        <Button
          data-ocid="url-importer.fetch_button"
          onClick={handleFetch}
          disabled={loading || !url}
          className="border-2 border-border rounded-none font-mono text-xs uppercase px-3"
          variant="outline"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Fetch"}
        </Button>
      </div>
      {error && (
        <p
          data-ocid="url-importer.error_state"
          className="text-xs font-mono border border-dashed border-destructive bg-destructive/10 text-destructive px-2 py-1"
        >
          {error}
        </p>
      )}
    </div>
  );
}
