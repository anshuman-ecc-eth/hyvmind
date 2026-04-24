import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { parseHTML } from "../../utils/htmlParser";

interface Props {
  onFetched: (title: string, rawHtml: string, url: string) => void;
}

export function URLImporter({ onFetched }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFetch() {
    setError(null);

    if (!url.startsWith("https://")) {
      setError("URL must start with https://");
      return;
    }

    setLoading(true);
    try {
      // Fetch via browser — requires CORS headers on the target page.
      // Falls back to a CORS proxy if direct fetch fails.
      try {
        const res = await fetch(url, { mode: "cors" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const parsed = await parseHTML(html, url);
        onFetched(parsed.title, html, url);
      } catch (_corsErr) {
        // Try via allorigins CORS proxy as fallback
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { contents?: string };
        if (!data.contents) throw new Error("Empty response from proxy");
        const html = data.contents;
        const parsed = await parseHTML(html, url);
        onFetched(parsed.title, html, url);
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
