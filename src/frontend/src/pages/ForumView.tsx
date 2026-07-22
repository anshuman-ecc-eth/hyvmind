import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDown, ArrowUp, MessageSquare, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useAddForumReply,
  useCreateForumPost,
  useGetForumPost,
  useGetForumPosts,
  useVoteForumPost,
  useVoteForumReply,
} from "../hooks/useQueries";

function formatTime(timestamp: bigint): string {
  const ms = Number(timestamp / BigInt(1_000_000));
  const d = new Date(ms);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function VoteButtons({
  upvotes,
  downvotes,
  userVote,
  onVote,
  disabled,
}: {
  upvotes: bigint;
  downvotes: bigint;
  userVote?: bigint;
  onVote: (vote: 1n | -1n) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={() => onVote(1n)}
        disabled={disabled}
        className={`p-0.5 rounded transition-colors ${
          userVote === 1n
            ? "text-green-500 bg-green-500/10"
            : "text-muted-foreground/40 hover:text-green-500 hover:bg-green-500/10"
        } disabled:opacity-40`}
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <span className="text-xs font-mono tabular-nums text-muted-foreground min-w-[1ch] text-center">
        {Number(upvotes - downvotes) >= 0 ? "+" : ""}
        {Number(upvotes - downvotes)}
      </span>
      <button
        type="button"
        onClick={() => onVote(-1n)}
        disabled={disabled}
        className={`p-0.5 rounded transition-colors ${
          userVote === -1n
            ? "text-red-500 bg-red-500/10"
            : "text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10"
        } disabled:opacity-40`}
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <span className="text-[10px] text-muted-foreground/30 font-mono tabular-nums">
        {Number(upvotes)}↑ {Number(downvotes)}↓
      </span>
    </div>
  );
}

// ─── Post Card (left panel) ─────────────────────────────────────────────────

function PostCard({
  post,
  isSelected,
  onClick,
}: {
  post: {
    id: string;
    title: string;
    authorName: string;
    tags: string[];
    createdAt: bigint;
    upvotes: bigint;
    downvotes: bigint;
    replyCount: bigint;
    userVote?: bigint;
  };
  isSelected: boolean;
  onClick: () => void;
}) {
  const score = post.upvotes - post.downvotes;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2 rounded-r px-3 py-2.5 text-left font-mono text-xs transition-colors border-l-4 ${
        isSelected
          ? "bg-accent text-accent-foreground border-l-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-transparent"
      }`}
    >
      <div className="flex flex-col min-w-0 flex-1 gap-1">
        <span
          className="text-sm font-semibold text-foreground truncate leading-tight"
          title={post.title}
        >
          {post.title}
        </span>
        <span className="text-[10px] text-muted-foreground/50 truncate">
          by {post.authorName}
        </span>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {post.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[9px] px-1 py-0"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className={`text-xs font-mono tabular-nums ${
            score >= 0 ? "text-green-600/70" : "text-red-600/70"
          }`}
        >
          {score >= 0 ? "+" : ""}
          {Number(score)}
        </span>
        {post.replyCount > 0n && (
          <span className="text-[10px] text-muted-foreground/40 flex items-center gap-0.5">
            <MessageSquare className="h-2.5 w-2.5" />
            {Number(post.replyCount)}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Create Post Dialog ─────────────────────────────────────────────────────

function CreatePostDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const createMutation = useCreateForumPost();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const result = await createMutation.mutateAsync({
      title: title.trim(),
      content: content.trim(),
      tags,
    });
    if ("ok" in result) {
      toast.success("Post created!");
      setTitle("");
      setContent("");
      setTagsInput("");
      onOpenChange(false);
    } else {
      toast.error(result.err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Post</DialogTitle>
          <DialogDescription>Create a new forum post</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 font-mono">
          <div className="space-y-1.5">
            <label
              htmlFor="forum-title"
              className="text-xs text-muted-foreground"
            >
              Title
            </label>
            <Input
              id="forum-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="post title"
              className="font-mono text-xs"
              disabled={createMutation.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="forum-content"
              className="text-xs text-muted-foreground"
            >
              Content
            </label>
            <Textarea
              id="forum-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="what's on your mind?"
              className="font-mono text-xs min-h-[100px]"
              disabled={createMutation.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="forum-tags"
              className="text-xs text-muted-foreground"
            >
              Tags{" "}
              <span className="text-muted-foreground/40">
                (comma separated)
              </span>
            </label>
            <Input
              id="forum-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. idea, question, discussion"
              className="font-mono text-xs"
              disabled={createMutation.isPending}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                !title.trim() || !content.trim() || createMutation.isPending
              }
            >
              {createMutation.isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reply Input ────────────────────────────────────────────────────────────

function ReplyInput({ postId }: { postId: string }) {
  const [text, setText] = useState("");
  const replyMutation = useAddForumReply();

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || replyMutation.isPending) return;
    const result = await replyMutation.mutateAsync({ postId, text: trimmed });
    if ("ok" in result) {
      setText("");
    } else {
      toast.error(result.err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="write a reply..."
        className="flex-1 font-mono text-xs bg-background border-border focus-visible:ring-1 rounded-none"
        disabled={replyMutation.isPending}
      />
      <Button
        size="sm"
        variant="ghost"
        onClick={handleSubmit}
        disabled={!text.trim() || replyMutation.isPending}
        className="shrink-0 border border-dashed border-border hover:bg-accent font-mono text-xs px-2.5"
      >
        Reply
      </Button>
    </div>
  );
}

// ─── ForumView ──────────────────────────────────────────────────────────────

export default function ForumView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: posts = [] } = useGetForumPosts();
  const { data: selectedPost } = useGetForumPost(selectedId);
  const votePostMutation = useVoteForumPost();
  const voteReplyMutation = useVoteForumReply();

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new replies
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedPost?.replies]);

  const filteredPosts = posts.filter((post) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(q) ||
      post.authorName.toLowerCase().includes(q) ||
      post.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    const scoreA = Number(a.upvotes - a.downvotes);
    const scoreB = Number(b.upvotes - b.downvotes);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return Number(b.createdAt - a.createdAt);
  });

  const handleVotePost = (postId: string, vote: 1n | -1n) => {
    votePostMutation.mutate({ postId, vote });
  };

  const handleVoteReply = (postId: string, replyId: string, vote: 1n | -1n) => {
    voteReplyMutation.mutate({ postId, replyId, vote });
  };

  return (
    <div className="flex flex-col h-full bg-background font-mono">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-dashed border-border bg-card shrink-0">
        <span className="text-sm font-semibold text-foreground">Forum</span>
        <div className="flex-1 flex items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="search by text or tag..."
              className="font-mono text-xs pl-7 bg-background border-border rounded-none h-8"
            />
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setCreateOpen(true)}
          className="shrink-0 border border-dashed border-border hover:bg-accent font-mono text-xs px-2.5"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Post
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ── Left Panel: Post List ── */}
        <aside className="flex w-[200px] shrink-0 flex-col border-r border-dashed border-border bg-card">
          <ScrollArea className="flex-1 min-h-0 px-1 py-2">
            {sortedPosts.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground/40">
                {searchQuery ? "no posts match your search" : "no posts yet"}
              </p>
            )}
            {sortedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isSelected={selectedId === post.id}
                onClick={() => setSelectedId(post.id)}
              />
            ))}
          </ScrollArea>
        </aside>

        {/* ── Right Panel: Post Detail ── */}
        <div className="flex flex-1 min-w-0 flex-col bg-background">
          {!selectedId && (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground/40">
                select a post from the list
              </p>
            </div>
          )}

          {selectedId && !selectedPost && (
            <p className="text-xs text-muted-foreground py-4 px-4">
              loading post...
            </p>
          )}

          {selectedPost && (
            <ScrollArea className="flex-1 min-h-0 px-4 py-3">
              {/* Post header */}
              <div className="mb-1 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-foreground break-words">
                    {selectedPost.title}
                  </h2>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                    by {selectedPost.authorName} &middot;{" "}
                    {formatTime(selectedPost.createdAt)}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {selectedPost.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {selectedPost.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Post content */}
              <p className="text-sm text-foreground/80 leading-relaxed break-words whitespace-pre-wrap mb-4">
                {selectedPost.content}
              </p>

              {/* Post votes */}
              <div className="mb-4">
                <VoteButtons
                  upvotes={selectedPost.upvotes}
                  downvotes={selectedPost.downvotes}
                  userVote={selectedPost.userVote}
                  onVote={(vote) => handleVotePost(selectedPost.id, vote)}
                  disabled={votePostMutation.isPending}
                />
              </div>

              <div className="border-t border-dashed border-border pt-3 mb-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Replies ({selectedPost.replies.length})
                </p>
              </div>

              {/* Replies */}
              <div className="space-y-3 mb-4">
                {selectedPost.replies.length === 0 && (
                  <p className="text-xs text-muted-foreground/40">
                    no replies yet
                  </p>
                )}
                {selectedPost.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className="border border-dashed border-border bg-card px-3 py-2"
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-semibold text-foreground">
                        {reply.authorName}
                      </span>
                      <span className="text-[10px] text-muted-foreground/40">
                        {formatTime(reply.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed break-words whitespace-pre-wrap mb-2">
                      {reply.text}
                    </p>
                    <VoteButtons
                      upvotes={reply.upvotes}
                      downvotes={reply.downvotes}
                      userVote={reply.userVote}
                      onVote={(vote) =>
                        handleVoteReply(selectedPost.id, reply.id, vote)
                      }
                      disabled={voteReplyMutation.isPending}
                    />
                  </div>
                ))}
              </div>

              {/* Reply input */}
              <div className="border-t border-dashed border-border pt-3 pb-2">
                <ReplyInput postId={selectedPost.id} />
              </div>

              <div ref={messagesEndRef} />
            </ScrollArea>
          )}
        </div>
      </div>

      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
