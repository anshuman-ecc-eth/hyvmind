import { useEffect, useState } from "react";
import AppPageHeader from "../components/AppPageHeader";

interface BlogPost {
  id: string;
  title: string;
  author: string;
  published: string;
  lastEdited: string;
  file: string;
  banner?: string;
}

interface BlogsViewProps {
  onClose: () => void;
}

export default function BlogsView({ onClose }: BlogsViewProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePost, setActivePost] = useState<BlogPost | null>(null);
  const [articleHtml, setArticleHtml] = useState("");
  const [articleLoading, setArticleLoading] = useState(false);

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
    fetch("/blogs/blog.json")
      .then((response) => response.json())
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const openPost = (post: BlogPost) => {
    setActivePost(post);
    setArticleLoading(true);
    setArticleHtml("");
    fetch(`/blogs/${post.file}`)
      .then((response) => response.text())
      .then((html) => {
        const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? "";
        const stripped = body.replace(/<style[\s\S]*?<\/style>/gi, "");
        setArticleHtml(stripped);
      })
      .catch(() => setArticleHtml(""))
      .finally(() => setArticleLoading(false));
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
            {activePost.banner && (
              <div className="mb-6">
                <img
                  src={`/blogs/${activePost.banner}`}
                  alt=""
                  className="w-full rounded"
                />
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
                // biome-ignore lint/security/noDangerouslySetInnerHtml: first-party pandoc HTML from public/blogs
                dangerouslySetInnerHTML={{ __html: articleHtml }}
                className={[
                  "prose max-w-none",
                  "text-foreground",
                  "[&_h1]:uppercase [&_h1]:text-center [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-7 [&_h1]:mt-7 [&_h1]:text-foreground",
                  "[&_h2]:uppercase [&_h2]:text-center [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-7 [&_h2]:mt-7 [&_h2]:text-foreground",
                  "[&_h3]:uppercase [&_h3]:text-center [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-7 [&_h3]:mt-7 [&_h3]:text-foreground",
                  "[&_h4]:uppercase [&_h4]:text-center [&_h4]:text-base [&_h4]:font-medium [&_h4]:mb-7 [&_h4]:mt-7 [&_h4]:text-foreground",
                  "[&_h5]:uppercase [&_h5]:text-center [&_h5]:text-sm [&_h5]:font-medium [&_h5]:mb-7 [&_h5]:mt-7 [&_h5]:text-foreground",
                  "[&_h6]:uppercase [&_h6]:text-center [&_h6]:text-sm [&_h6]:text-muted-foreground [&_h6]:mb-7 [&_h6]:mt-7",
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <AppPageHeader title="Blog" onClose={onClose} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6">
          {loading ? (
            <p className="text-center font-mono text-xs text-muted-foreground">
              Loading..
            </p>
          ) : posts.length === 0 ? (
            <p className="text-center font-mono text-xs text-muted-foreground">
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
