import { Actor, AnonymousIdentity, HttpAgent } from "@icp-sdk/core/agent";
import { useCallback, useEffect, useRef, useState } from "react";
import AppPageHeader from "../components/AppPageHeader";
import { loadConfig } from "../config";
import { type _SERVICE, idlFactory } from "../declarations/backend.did";

interface BlogPost {
  id: string;
  title: string;
  author: string;
  published: string;
  lastEdited: string;
}

interface BlogsViewProps {
  onClose: () => void;
}

const SESSION_KEY = "hyvmind-blog-unlocked";

async function sha256Hex(salt: Uint8Array, data: Uint8Array): Promise<string> {
  const combined = new Uint8Array(salt.length + data.length);
  combined.set(salt, 0);
  combined.set(data, salt.length);
  const digest = await crypto.subtle.digest("SHA-256", combined);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bytesEqualHex(a: Uint8Array, hex: string): boolean {
  if (a.length * 2 !== hex.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)) return false;
  }
  return true;
}

export default function BlogsView({ onClose }: BlogsViewProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [gateConfigured, setGateConfigured] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [activePost, setActivePost] = useState<BlogPost | null>(null);
  const [articleHtml, setArticleHtml] = useState("");
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [articleLoading, setArticleLoading] = useState(false);

  const actorRef = useRef<_SERVICE | null>(null);
  const digestRef = useRef<Uint8Array | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  // Build an anonymous agent/actor so the blog works without login. The password
  // check happens on the backend in the same shared call that returns content.
  const ensureBackend = useCallback(async () => {
    if (actorRef.current) return;
    const { backend_canister_id } = await loadConfig();
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const agent = await HttpAgent.create({
      identity: new AnonymousIdentity(),
      host: isLocal ? undefined : "https://icp-api.io",
      shouldFetchRootKey: isLocal,
    });
    actorRef.current = Actor.createActor<_SERVICE>(idlFactory, {
      agent,
      canisterId: backend_canister_id,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureBackend();
        const actor = actorRef.current;
        if (!actor) return;
        const configRaw = await actor.getBlogPasswordConfig();
        const config = configRaw[0] ?? null;
        if (cancelled) return;
        if (config) {
          setGateConfigured(true);
          if (sessionStorage.getItem(SESSION_KEY)) {
            setUnlocked(true);
            digestRef.current = config.hash;
            const list = await actor.getBlogPosts(config.hash);
            if (!cancelled) setPosts(list.map(toBlogPost));
          }
        } else {
          setUnlocked(true);
          const list = await actor.getBlogPosts(new Uint8Array());
          if (!cancelled) setPosts(list.map(toBlogPost));
        }
      } catch {
        // leave in loading/error state below
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ensureBackend]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (activePost) setActivePost(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePost, onClose]);

  useEffect(() => {
    if (gateConfigured && !unlocked) passwordRef.current?.focus();
  }, [gateConfigured, unlocked]);

  const handleUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    const actor = actorRef.current;
    const configRaw = actor ? await actor.getBlogPasswordConfig() : [];
    const config = configRaw[0] ?? null;
    if (!config) {
      setUnlocked(true);
      return;
    }
    const digest = await sha256Hex(
      config.salt,
      new TextEncoder().encode(password),
    );
    if (!bytesEqualHex(config.hash, digest)) {
      setPwError(true);
      setPassword("");
      return;
    }
    setPwError(false);
    setUnlocked(true);
    sessionStorage.setItem(SESSION_KEY, "1");
    digestRef.current = config.hash;
    const list = actor ? await actor.getBlogPosts(config.hash) : [];
    setPosts(list.map(toBlogPost));
  };

  const openPost = async (post: BlogPost) => {
    setActivePost(post);
    setArticleLoading(true);
    setArticleHtml("");
    setBannerUrl(null);
    try {
      const actor = actorRef.current;
      if (!actor) throw new Error("backend unavailable");
      const digest = digestRef.current ?? new Uint8Array();
      const contentRaw = await actor.getBlogPostContent(post.id, digest);
      const content = contentRaw[0] ?? null;
      if (!content) throw new Error("not authorized");
      setArticleHtml(new TextDecoder().decode(content.html));
      const bannerRaw = content.banner;
      const bannerBytes = bannerRaw?.[0];
      if (bannerBytes) {
        const copy = new Uint8Array(bannerBytes.length);
        copy.set(bannerBytes);
        const blob = new Blob([copy.buffer], { type: "image/png" });
        setBannerUrl(URL.createObjectURL(blob));
      }
    } catch {
      setArticleHtml("");
    } finally {
      setArticleLoading(false);
    }
  };

  if (activePost) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <AppPageHeader
          title={activePost.title}
          subtitle={activePost.author}
          onClose={onClose}
          onBack={() => setActivePost(null)}
          backLabel="Blog"
          backOcid="blog.reader.back.button"
          closeOcid="blog.reader.close.button"
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-8">
            {bannerUrl && (
              <div className="mb-6">
                <img src={bannerUrl} alt="" className="w-full rounded" />
              </div>
            )}
            <div className="mb-3 flex justify-end border-b border-dashed border-border pb-4">
              <div className="flex flex-col items-end gap-1 font-mono text-xs text-muted-foreground text-right">
                <span>published {activePost.published}</span>
                <span>last edited {activePost.lastEdited}</span>
              </div>
            </div>
            {articleLoading ? (
              <p className="font-mono text-xs text-muted-foreground">
                Loading..
              </p>
            ) : articleHtml ? (
              <div
                aria-label="Blog article"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: first-party pandoc HTML stored on-chain
                dangerouslySetInnerHTML={{ __html: articleHtml }}
                className={[
                  "prose max-w-none",
                  "text-foreground",
                  "[&_h1]:text-center [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-7 [&_h1]:mt-7 [&_h1]:text-foreground",
                  "[&_h2]:text-center [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-7 [&_h2]:mt-7 [&_h2]:text-foreground",
                  "[&_h3]:text-center [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-7 [&_h3]:mt-7 [&_h3]:text-foreground",
                  "[&_h4]:text-center [&_h4]:text-base [&_h4]:font-medium [&_h4]:mb-7 [&_h4]:mt-7 [&_h4]:text-foreground",
                  "[&_h5]:text-center [&_h5]:text-sm [&_h5]:font-medium [&_h5]:mb-7 [&_h5]:mt-7 [&_h5]:text-foreground",
                  "[&_h6]:text-center [&_h6]:text-sm [&_h6]:text-muted-foreground [&_h6]:mb-7 [&_h6]:mt-7",
                  "[&_p]:mb-3 [&_p]:leading-relaxed [&_p]:text-foreground",
                  "[&_strong]:font-bold [&_strong]:text-foreground",
                  "[&_em]:italic [&_em]:text-foreground",
                  "[&_code]:font-mono [&_code]:text-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded-sm [&_code]:text-foreground",
                  "[&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:my-3",
                  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
                  "[&_hr]:border-border [&_hr]:my-4",
                  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3",
                  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3",
                  "[&_li]:mb-1 [&_li]:text-foreground",
                  "[&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:bg-muted/50 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:my-4 [&_blockquote]:rounded-r [&_blockquote]:text-muted-foreground [&_blockquote]:not-italic",
                  "[&_blockquote_p]:mb-0",
                  "[&_blockquote_p:first-of-type::before]:content-none",
                  "[&_blockquote_p:last-of-type::after]:content-none",
                  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:opacity-80",
                  "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3",
                  "[&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-1.5 [&_th]:bg-muted [&_th]:text-left [&_th]:font-semibold",
                  "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5",
                  "[&_del]:line-through [&_del]:text-muted-foreground",
                  "[&_img]:max-w-full [&_img]:rounded",
                ].join(" ")}
              />
            ) : (
              <p className="font-mono text-xs text-muted-foreground">
                Couldn&apos;t load this post.
              </p>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <AppPageHeader title="Blog" onClose={onClose} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-6 py-8 text-center">
            <p className="font-mono text-xs text-muted-foreground">Loading..</p>
          </div>
        </main>
      </div>
    );
  }

  if (!unlocked && gateConfigured) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <AppPageHeader title="Blog" onClose={onClose} />
        <main className="flex flex-1 items-center justify-center overflow-y-auto">
          <form
            onSubmit={handleUnlock}
            className="mx-auto flex max-w-sm flex-col items-center gap-4 px-6 text-center"
          >
            <p className="font-mono text-sm text-muted-foreground">
              To guard against scrapers and crawlers.
            </p>
            <input
              type="password"
              ref={passwordRef}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPwError(false);
              }}
              placeholder="Enter password"
              aria-label="Blog password"
              data-ocid="blog.lock.input"
              className="w-full rounded-md border border-dashed border-border bg-transparent px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px]"
            />
            {pwError && (
              <p className="font-mono text-xs text-destructive">
                Wrong password.
              </p>
            )}
            <button
              type="submit"
              data-ocid="blog.lock.submit"
              className="cursor-pointer rounded-md border border-dashed border-border px-4 py-2 font-mono text-xs text-foreground transition-colors hover:bg-accent"
            >
              Enter
            </button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <AppPageHeader title="Blog" onClose={onClose} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6">
          {posts.length === 0 ? (
            <p className="py-8 text-center font-mono text-xs text-muted-foreground">
              No posts yet.
            </p>
          ) : (
            <div>
              {posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => openPost(post)}
                  className="flex w-full cursor-pointer flex-col gap-1 border-b border-dashed border-border py-4 text-left transition-colors hover:bg-accent"
                >
                  <div className="text-sm font-medium text-foreground">
                    {post.title}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {post.author}
                    <span className="mx-2">·</span>
                    {post.published}
                    {post.lastEdited !== post.published && (
                      <>
                        <span className="mx-2">·</span>edited {post.lastEdited}
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function toBlogPost(meta: {
  id: string;
  title: string;
  author: string;
  published: string;
  lastEdited: string;
}): BlogPost {
  return { ...meta };
}
