import { AuthClient } from "@dfinity/auth-client";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative rounded border border-border overflow-hidden"
      data-ocid="obsidian_token.code_block"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <span className="font-mono text-xs text-muted-foreground">json</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-ocid="obsidian_token.copy_button"
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

type PageState = "loading" | "unauthenticated" | "authenticated" | "error";

export default function ObsidianTokenPage() {
  const [state, setState] = useState<PageState>("loading");
  const [tokenJson, setTokenJson] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const authClient = await AuthClient.create();
        const authenticated = await authClient.isAuthenticated();
        if (!authenticated) {
          setState("unauthenticated");
          return;
        }
        const identity = authClient.getIdentity() as any;
        const token = JSON.stringify(identity.getDelegation().toJSON(), null, 2);
        setTokenJson(token);
        setState("authenticated");
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setState("error");
      }
    })();
  }, []);

  if (state === "loading") {
    return (
      <div
        className="flex h-screen items-center justify-center bg-background font-mono text-xs text-muted-foreground"
        data-ocid="obsidian_token.loading_state"
      >
        loading...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen overflow-y-auto bg-background"
      data-ocid="obsidian_token.page"
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
            data-ocid="obsidian_token.home_link"
          >
            ← back to app
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-12">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Obsidian Token
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Copy this token into the Hyvmind Obsidian plugin to authenticate
            with your Hyvmind account.
          </p>
        </div>

        {state === "unauthenticated" && (
          <div
            className="space-y-4"
            data-ocid="obsidian_token.unauthenticated"
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
              You need to sign in to Hyvmind before you can generate an
              authentication token for the Obsidian plugin.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
              data-ocid="obsidian_token.sign_in_link"
            >
              <ExternalLink className="h-3 w-3" />
              Sign in to Hyvmind
            </a>
          </div>
        )}

        {state === "authenticated" && (
          <div
            className="space-y-4"
            data-ocid="obsidian_token.authenticated"
          >
            <CodeBlock code={tokenJson} />
          </div>
        )}

        {state === "error" && (
          <div
            className="rounded border border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-600 font-mono"
            data-ocid="obsidian_token.error_state"
          >
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
