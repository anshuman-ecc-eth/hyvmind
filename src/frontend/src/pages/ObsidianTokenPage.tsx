import { AuthClient } from "@dfinity/auth-client";
import { Check, Copy } from "lucide-react";
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

function readAuthStorage(): Promise<{ identity: string; delegation: unknown }> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("auth-client-db");
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("ic-keyval", "readonly");
      const store = tx.objectStore("ic-keyval");
      const idReq = store.get("identity");
      const delReq = store.get("delegation");
      let identity: unknown;
      let delegation: unknown;
      idReq.onsuccess = () => {
        identity = idReq.result;
        check();
      };
      delReq.onsuccess = () => {
        delegation = delReq.result;
        check();
      };
      idReq.onerror = () => reject(idReq.error);
      delReq.onerror = () => reject(delReq.error);
      function check() {
        if (identity !== undefined && delegation !== undefined) {
          resolve({ identity: identity as string, delegation });
        }
      }
    };
    req.onerror = () => reject(req.error);
  });
}

type PageState = "loading" | "ready" | "signing_in" | "success" | "error";

export default function ObsidianTokenPage() {
  const [state, setState] = useState<PageState>("loading");
  const [tokenJson, setTokenJson] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetch("/env.json")
      .then(() => setState("ready"))
      .catch(() => setState("ready"));
  }, []);

  const handleSignIn = async () => {
    setState("signing_in");
    try {
      const config = await (await fetch("/env.json")).json();
      const authClient = await AuthClient.create({ keyType: "Ed25519" });
      await new Promise<void>((resolve, reject) => {
        authClient.login({
          identityProvider: "https://identity.internetcomputer.org/",
          derivationOrigin: config.ii_derivation_origin,
          maxTimeToLive: BigInt(30) * BigInt(24) * BigInt(3_600_000_000_000),
          onSuccess: async () => {
            try {
              const { identity, delegation } = await readAuthStorage();
              const combined = JSON.stringify(
                { identity, delegation },
                null,
                2,
              );
              setTokenJson(combined);
              setState("success");
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          onError: (err) => {
            reject(new Error(err ?? "Authentication failed"));
          },
        });
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  };

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

      <div className="max-w-2xl mx-auto px-6 py-12 space-y-10">
        {/* Page header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Obsidian Token
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sign in with Internet Identity to generate your Obsidian plugin
            authentication token.
          </p>
        </div>

        {/* Ready: sign-in prompt */}
        {state === "ready" && (
          <div className="space-y-5" data-ocid="obsidian_token.ready_section">
            <div className="rounded border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
              Click the button below to authenticate with Internet Identity.
              Your Ed25519 signing key and delegation chain will be exported as
              a JSON token that the Obsidian plugin uses to call the Hyvmind
              canister on your behalf.
            </div>
            <button
              type="button"
              onClick={handleSignIn}
              className="inline-flex items-center gap-2 rounded border border-border bg-primary/10 px-4 py-2 font-mono text-sm text-foreground hover:bg-primary/20 transition-colors"
              data-ocid="obsidian_token.sign_in_button"
            >
              Sign in with Internet Identity
            </button>
          </div>
        )}

        {/* Signing in: loading state */}
        {state === "signing_in" && (
          <div
            className="flex items-center gap-2 font-mono text-xs text-muted-foreground"
            data-ocid="obsidian_token.signing_in_state"
          >
            <span className="animate-spin inline-block h-3 w-3 border border-border border-t-foreground rounded-full" />
            signing in…
          </div>
        )}

        {/* Success: display token */}
        {state === "success" && (
          <div className="space-y-5" data-ocid="obsidian_token.success_state">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide font-mono border-b border-dashed border-border pb-2">
              Your Authentication Token
            </h2>
            <CodeBlock code={tokenJson} />
            <div className="rounded border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
              Copy this token and paste it into the Obsidian plugin settings.
              Keep it secret — it grants full signing authority on your behalf.
            </div>
            <button
              type="button"
              onClick={() => setState("ready")}
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              data-ocid="obsidian_token.regenerate_button"
            >
              sign in again to regenerate
            </button>
          </div>
        )}

        {/* Error state */}
        {state === "error" && (
          <div className="space-y-4" data-ocid="obsidian_token.error_state">
            <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-mono text-destructive">
              {errorMessage || "An unexpected error occurred."}
            </div>
            <button
              type="button"
              onClick={() => setState("ready")}
              className="inline-flex items-center gap-2 rounded border border-border bg-muted/20 px-4 py-2 font-mono text-xs text-foreground hover:bg-muted/40 transition-colors"
              data-ocid="obsidian_token.retry_button"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
