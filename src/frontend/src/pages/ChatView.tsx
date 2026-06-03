import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Plus,
  Send,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  useGetChatChannels,
  useGetChatMessages,
  useSendChatMessage,
  useCreateChannel,
  useJoinChannel,
} from "../hooks/useQueries";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Time formatter (for group messages) ─────────────────────────────────────

function formatTime(timestamp: bigint): string {
  const ms = Number(timestamp / BigInt(1_000_000));
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

// ─── ChatView ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "beesbury_conversation";

export default function ChatView() {
  const [mode, setMode] = useState<"beesbury" | "group">("beesbury");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinGroupName, setJoinGroupName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // beesbury conversation — persisted to localStorage
  const [beesburyMessages, setBeesburyMessages] = useState<ChatMessage[]>(
    () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    },
  );

  // Group chat hooks
  const { data: channels = [] } = useGetChatChannels();
  const { data: nativeMessages = [], isLoading: messagesLoading } =
    useGetChatMessages(selectedGroupId);
  const sendMutation = useSendChatMessage();
  const createChannelMutation = useCreateChannel();
  const joinChannelMutation = useJoinChannel();

  // Only show custom group channels (prefixed with "group:")
  const groupChannels = channels.filter((c) => c.id.startsWith("group:"));

  // Persist beesbury messages
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(beesburyMessages));
  }, [beesburyMessages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [beesburyMessages, nativeMessages]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleAiSend = async () => {
    const text = inputText.trim();
    if (!text || isAiLoading) return;
    setInputText("");
    setBeesburyMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsAiLoading(true);

    try {
      const resp = await fetch("/ironclaw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setBeesburyMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.content || "" },
        ]);
      } else {
        setBeesburyMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${data.error || resp.statusText}`,
          },
        ]);
      }
    } catch {
      setBeesburyMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Couldn't reach beesbury. Make sure the IronClaw agent is running.",
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGroupSend = async () => {
    const text = inputText.trim();
    if (!text || !selectedGroupId || sendMutation.isPending) return;
    setInputText("");
    sendMutation.mutate({ channelId: selectedGroupId, text });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (mode === "beesbury") handleAiSend();
      else handleGroupSend();
    }
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      const result = await createChannelMutation.mutateAsync(name);
      if ("ok" in result) {
        setShowCreateGroup(false);
        setNewGroupName("");
        setSelectedGroupId(result.ok);
        setMode("group");
      }
    } catch {
      // error handled by mutation
    }
  };

  const handleJoinGroup = async () => {
    const name = joinGroupName.trim();
    if (!name) return;
    const channelId = name.startsWith("group:") ? name : `group:${name}`;
    try {
      const result = await joinChannelMutation.mutateAsync(channelId);
      if ("ok" in result) {
        setJoinGroupName("");
        setSelectedGroupId(channelId);
        setMode("group");
      }
    } catch {
      // error handled by mutation
    }
  };

  const selectedChannel = groupChannels.find(
    (c) => c.id === selectedGroupId,
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background font-mono">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2 h-11 border-b border-dashed border-border bg-card shrink-0">
        <span className="text-sm font-semibold text-foreground mr-auto">
          Chat
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ── Main Area (left) ── */}
        <div className="flex flex-1 min-w-0 flex-col bg-background">
          {/* Active channel header */}
          {mode === "beesbury" && (
            <div className="flex items-center gap-2 border-b border-dashed border-border bg-card px-4 py-2.5">
              <Bot className="h-4 w-4 text-foreground/60" />
              <span className="truncate text-sm font-semibold text-foreground">
                beesbury
              </span>
            </div>
          )}
          {mode === "group" && selectedChannel && (
            <div className="flex items-center gap-2 border-b border-dashed border-border bg-card px-4 py-2.5">
              <span className="truncate text-sm font-semibold text-foreground">
                {selectedChannel.name}
              </span>
            </div>
          )}

          {/* Messages area */}
          <ScrollArea className="flex-1 min-h-0 px-4 py-3">
            {/* beesbury mode */}
            {mode === "beesbury" && (
              <>
                {beesburyMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
                    <Bot className="h-10 w-10 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground/60 max-w-md">
                      Hi I'm Beesbury, Hyvmind's resident librarian. Let me know
                      how I can help.
                    </p>
                  </div>
                )}
                <div className="space-y-4">
                  {beesburyMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${
                        msg.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="mt-0.5 shrink-0">
                          <Bot className="h-5 w-5 text-foreground/40" />
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === "user"
                            ? "bg-accent text-accent-foreground"
                            : "bg-card text-foreground border border-border"
                        }`}
                      >
                        {msg.content}
                      </div>
                      {msg.role === "user" && (
                        <div className="mt-0.5 shrink-0">
                          <User className="h-5 w-5 text-foreground/40" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isAiLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="mt-0.5 shrink-0">
                        <Bot className="h-5 w-5 text-foreground/40" />
                      </div>
                      <div className="max-w-[70%] rounded-lg px-3 py-2 text-sm bg-card text-foreground/50 border border-border">
                        <span className="animate-pulse">thinking</span>
                        <span className="animate-pulse ml-0.5">.</span>
                        <span className="animate-pulse ml-0.5" style={{ animationDelay: "0.2s" }}>.</span>
                        <span className="animate-pulse ml-0.5" style={{ animationDelay: "0.4s" }}>.</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Group mode */}
            {mode === "group" && (
              <>
                {!selectedGroupId && (
                  <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground/40">
                      select a group from the sidebar
                    </p>
                  </div>
                )}
                {selectedGroupId && messagesLoading && (
                  <p className="text-xs text-muted-foreground py-4">
                    loading messages…
                  </p>
                )}
                {selectedGroupId &&
                  nativeMessages.length === 0 &&
                  !messagesLoading && (
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                      <p className="text-xs text-muted-foreground/40">
                        no messages yet
                      </p>
                    </div>
                  )}
                <div className="space-y-3">
                  {nativeMessages.map((msg, i) => (
                    <div key={i} className="group">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-foreground">
                          {msg.senderName}
                        </span>
                        <span className="text-xs text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed break-words">
                        {msg.text}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input area */}
          <div className="border-t border-dashed border-border bg-card px-4 py-3">
            {mode === "beesbury" && (
              <div className="flex items-center gap-2">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask beesbury anything..."
                  className="flex-1 font-mono text-xs bg-background border-border focus-visible:ring-1 rounded-none"
                  disabled={isAiLoading}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAiSend}
                  disabled={!inputText.trim() || isAiLoading}
                  className="shrink-0 border border-dashed border-border hover:bg-accent font-mono text-xs px-2.5"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {mode === "group" && selectedGroupId && (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`message ${selectedChannel?.name ?? "group"}`}
                    className="flex-1 font-mono text-xs bg-background border-border focus-visible:ring-1 rounded-none"
                    disabled={sendMutation.isPending}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleGroupSend}
                    disabled={
                      !inputText.trim() || sendMutation.isPending
                    }
                    className="shrink-0 border border-dashed border-border hover:bg-accent font-mono text-xs px-2.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {sendMutation.isError && (
                  <p className="mt-1 text-xs text-destructive">
                    failed to send — try again
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Sidebar (right) ── */}
        <aside className="flex w-[220px] shrink-0 flex-col border-l border-dashed border-border bg-card">
          <ScrollArea className="flex-1 min-h-0 px-2 py-2">
            {/* beesbury entry */}
            <button
              type="button"
              onClick={() => setMode("beesbury")}
              className={`flex w-full items-center gap-2 rounded-r px-2 py-1.5 text-left font-mono text-xs transition-colors border-l-4 ${
                mode === "beesbury"
                  ? "bg-accent text-accent-foreground border-l-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-transparent"
              }`}
            >
              <Bot className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate min-w-0 flex-1">beesbury</span>
            </button>

            {/* Groups section */}
            <div className="mt-3 mb-1 px-2 py-1 text-xs text-muted-foreground/60 font-mono border-t border-dashed border-border pt-2">
              Groups
            </div>

            {groupChannels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  setSelectedGroupId(ch.id);
                  setMode("group");
                }}
                className={`flex w-full items-center gap-2 rounded-r px-2 py-1.5 text-left font-mono text-xs transition-colors border-l-4 ${
                  mode === "group" && selectedGroupId === ch.id
                    ? "bg-accent text-accent-foreground border-l-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-transparent"
                }`}
              >
                <span className="truncate min-w-0 flex-1">{ch.name}</span>
                {ch.unreadCount > BigInt(0) && (
                  <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-yellow-400 px-1 text-xs font-bold text-yellow-900 leading-none">
                    {ch.unreadCount > BigInt(99)
                      ? "99+"
                      : ch.unreadCount.toString()}
                  </span>
                )}
              </button>
            ))}

            {groupChannels.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground/40">
                no groups yet
              </p>
            )}

            {/* Create Group */}
            <div className="mt-2">
              {showCreateGroup ? (
                <div className="flex items-center gap-1 px-1">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="group name"
                    className="flex-1 h-7 font-mono text-xs bg-background border-border rounded-none px-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateGroup();
                      if (e.key === "Escape") {
                        setShowCreateGroup(false);
                        setNewGroupName("");
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim()}
                    className="shrink-0 text-muted-foreground hover:text-foreground p-0.5 disabled:opacity-40"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateGroup(false);
                      setNewGroupName("");
                    }}
                    className="shrink-0 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(true)}
                  className="flex w-full items-center gap-2 rounded-r px-2 py-1.5 text-left font-mono text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Group</span>
                </button>
              )}
            </div>

            {/* Join Group */}
            <div className="mt-1 px-1">
              <div className="flex items-center gap-1">
                <Input
                  value={joinGroupName}
                  onChange={(e) => setJoinGroupName(e.target.value)}
                  placeholder="join group by name"
                  className="flex-1 h-7 font-mono text-xs bg-background border-border rounded-none px-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleJoinGroup();
                  }}
                />
                <button
                  type="button"
                  onClick={handleJoinGroup}
                  disabled={!joinGroupName.trim()}
                  className="shrink-0 text-muted-foreground hover:text-foreground p-0.5 disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
