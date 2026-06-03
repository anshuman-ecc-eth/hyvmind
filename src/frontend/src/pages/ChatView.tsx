import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  useGetChatChannels,
  useGetChatMessages,
  useSendChatMessage,
} from "../hooks/useQueries";

// ─── Time formatter ───────────────────────────────────────────────────────────

function formatTime(timestamp: bigint): string {
  const ms = Number(timestamp / BigInt(1_000_000));
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

// ─── ChatView ────────────────────────────────────────────────────────────────

export default function ChatView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: channels = [] } = useGetChatChannels();
  const { data: nativeMessages = [], isLoading: messagesLoading } =
    useGetChatMessages(selectedId);
  const sendMutation = useSendChatMessage();

  // Only show group channels (prefixed with "group:")
  const groupChannels = channels.filter((c) => c.id.startsWith("group:"));

  const selectedChannel = groupChannels.find((c) => c.id === selectedId);

  // Auto-scroll to newest message
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [nativeMessages]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !selectedId || sendMutation.isPending) return;
    setInputText("");
    sendMutation.mutate({ channelId: selectedId, text });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background font-mono">
      {/* Header bar */}
      <div className="flex flex-col px-4 py-2 border-b border-dashed border-border bg-card shrink-0">
        <span className="text-sm font-semibold text-foreground">Chat</span>
        <span className="text-xs text-muted-foreground/50 mt-0.5">
          You can chat with Beesbury, our community agent, in the Telegram
          group.
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ── Main Area (left) ── */}
        <div className="flex flex-1 min-w-0 flex-col bg-background">
          {/* Active channel header */}
          {selectedChannel && (
            <div className="flex items-center gap-2 border-b border-dashed border-border bg-card px-4 py-2.5">
              <span className="truncate text-sm font-semibold text-foreground">
                {selectedChannel.name}
              </span>
            </div>
          )}

          {/* Messages area */}
          <ScrollArea className="flex-1 min-h-0 px-4 py-3">
            {!selectedId && (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground/40">
                  select a group from the sidebar
                </p>
              </div>
            )}
            {selectedId && messagesLoading && (
              <p className="text-xs text-muted-foreground py-4">
                loading messages…
              </p>
            )}
            {selectedId && nativeMessages.length === 0 && !messagesLoading && (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <p className="text-xs text-muted-foreground/40">
                  no messages yet
                </p>
              </div>
            )}
            <div className="space-y-3">
              {nativeMessages.map((msg, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: positional message rows
                  key={i}
                  className="group"
                >
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
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input area */}
          {selectedId && (
            <div className="border-t border-dashed border-border bg-card px-4 py-3">
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
                  onClick={handleSend}
                  disabled={!inputText.trim() || sendMutation.isPending}
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
            </div>
          )}
        </div>

        {/* ── Sidebar (right) ── */}
        <aside className="flex min-w-fit shrink-0 flex-col border-l border-dashed border-border bg-card">
          <ScrollArea className="flex-1 min-h-0 px-2 py-2">
            {groupChannels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setSelectedId(ch.id)}
                className={`flex w-full items-center gap-2 rounded-r px-2 py-1.5 text-left font-mono text-xs transition-colors border-l-4 ${
                  selectedId === ch.id
                    ? "bg-accent text-accent-foreground border-l-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-transparent"
                }`}
              >
                <span className="truncate min-w-0 flex-1" title={ch.name}>
                  {ch.name}
                </span>
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
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
