import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, MessageSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatChannelSummary } from "../backend";
import {
  useGetChatChannels,
  useGetChatMessages,
  useIsCallerAdmin,
  useSendChatMessage,
} from "../hooks/useQueries";
import { useTelegram } from "../hooks/useTelegram";
import * as telegramService from "../services/telegramService";

// ─── Unread Badge ─────────────────────────────────────────────────────────────

function UnreadBadge({ count }: { count: bigint }) {
  if (count === BigInt(0)) return null;
  const display = count > BigInt(99) ? "99+" : count.toString();
  return (
    <span className="ml-auto flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-yellow-400 px-1 text-[10px] font-bold text-yellow-900 leading-none">
      {display}
    </span>
  );
}

// ─── Channel Sidebar Item ─────────────────────────────────────────────────────

interface ChannelItemProps {
  channel: ChatChannelSummary;
  selected: boolean;
  onSelect: () => void;
  indent?: boolean;
}

function ChannelItem({
  channel,
  selected,
  onSelect,
  indent,
}: ChannelItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-r px-2 py-1.5 text-left font-mono text-xs transition-colors ${
        indent
          ? "pl-6 border-l-4 border-l-orange-500"
          : "border-l-4 border-l-blue-500"
      } ${
        selected
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
      data-ocid={`swarms.channel.item.${channel.id}`}
    >
      <span className="truncate min-w-0 flex-1">{channel.name}</span>
      <UnreadBadge count={channel.unreadCount} />
    </button>
  );
}

// ─── Curation Group ───────────────────────────────────────────────────────────

interface CurationGroupProps {
  curationName: string;
  topChannel: ChatChannelSummary | undefined;
  subChannels: ChatChannelSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function CurationGroup({
  curationName,
  topChannel,
  subChannels,
  selectedId,
  onSelect,
}: CurationGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const hasSubChannels = subChannels.length > 0;

  return (
    <div className="mb-1">
      <div className="flex items-center gap-1">
        {hasSubChannels ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-muted-foreground hover:text-foreground p-0.5"
            aria-label={expanded ? "Collapse" : "Expand"}
            data-ocid={`swarms.group.toggle.${curationName}`}
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {topChannel ? (
            <ChannelItem
              channel={topChannel}
              selected={selectedId === topChannel.id}
              onSelect={() => onSelect(topChannel.id)}
            />
          ) : (
            <span className="block px-2 py-1.5 font-mono text-xs text-muted-foreground/50 truncate">
              {curationName}
            </span>
          )}
        </div>
      </div>

      {expanded && hasSubChannels && (
        <div className="mt-0.5 space-y-0.5">
          {subChannels.map((ch) => (
            <ChannelItem
              key={ch.id}
              channel={ch}
              selected={selectedId === ch.id}
              onSelect={() => onSelect(ch.id)}
              indent
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Time formatter ───────────────────────────────────────────────────────────

function formatTime(timestamp: bigint): string {
  const ms = Number(timestamp / BigInt(1_000_000));
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

// ─── SwarmsView ───────────────────────────────────────────────────────────────

export default function SwarmsView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [selectedCuration, setSelectedCuration] = useState<string>("__all__");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: channels = [], isLoading: channelsLoading } =
    useGetChatChannels();
  const { data: nativeMessages = [], isLoading: messagesLoading } =
    useGetChatMessages(selectedId);
  const sendMutation = useSendChatMessage();

  // Telegram bridge
  const {
    isEnabled,
    toggleEnabled,
    isConnected,
    isLoading: tgLoading,
    channels: tgChannels,
    messagesByChannel,
    canEnable,
    config: tgConfig,
  } = useTelegram();
  const { data: isAdmin } = useIsCallerAdmin();

  // Separate curation-level and sub-channels
  const curationChannels = channels.filter((c) => !c.isSubchannel);
  const subChannels = channels.filter((c) => c.isSubchannel);

  // Group sub-channels under their parent curations
  const groups = curationChannels.map((cur) => ({
    curationName: cur.name,
    topChannel: cur,
    subChannels: subChannels.filter((sc) => sc.parentCuration === cur.name),
  }));

  // Orphaned sub-channels (parent curation has no top-level channel)
  const coveredCurations = new Set(curationChannels.map((c) => c.name));
  const orphanedSubChannels = subChannels.filter(
    (sc) => sc.parentCuration && !coveredCurations.has(sc.parentCuration),
  );
  const orphanedGroupNames = Array.from(
    new Set(orphanedSubChannels.map((sc) => sc.parentCuration ?? "")),
  );
  const orphanedGroups = orphanedGroupNames.map((name) => ({
    curationName: name,
    topChannel: undefined as ChatChannelSummary | undefined,
    subChannels: orphanedSubChannels.filter((sc) => sc.parentCuration === name),
  }));

  const allGroups = [...groups, ...orphanedGroups];

  // All unique curation names for the dropdown
  const allCurationNames = allGroups.map((g) => g.curationName);

  // Filter groups based on selected curation
  const filteredGroups =
    selectedCuration === "__all__"
      ? allGroups
      : allGroups.filter((g) => g.curationName === selectedCuration);

  // Determine if we're viewing a Telegram channel
  const isTelegramChannel = selectedId?.startsWith("tg-") ?? false;
  const telegramMessages = isTelegramChannel
    ? (messagesByChannel.get(selectedId!) ?? [])
    : [];
  const displayMessages = isTelegramChannel ? telegramMessages : nativeMessages;

  const selectedChannel = channels.find((c) => c.id === selectedId);
  const selectedTgChannel = tgChannels.find((c) => c.id === selectedId);

  // Auto-scroll to newest message
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !selectedId) return;
    setInputText("");

    if (isTelegramChannel) {
      if (!tgConfig) return;
      const threadPart = selectedId.replace("tg-", "");
      const threadId =
        threadPart === "main" ? undefined : Number.parseInt(threadPart, 10);
      try {
        await telegramService.sendMessage(
          tgConfig.botToken,
          tgConfig.chatId,
          text,
          Number.isNaN(threadId) ? undefined : threadId,
        );
      } catch (err) {
        console.error("[Telegram] Send error:", err);
      }
    } else {
      if (sendMutation.isPending) return;
      sendMutation.mutate({ channelId: selectedId, text });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Derive the active channel name for display
  const activeChannelName =
    selectedTgChannel?.name ?? selectedChannel?.name ?? null;
  const activeChannelParent =
    !isTelegramChannel && selectedChannel?.isSubchannel
      ? selectedChannel.parentCuration
      : null;

  // Suppress unused variable warning — isAdmin used for tooltip context awareness
  void isAdmin;

  return (
    <div className="flex h-full min-h-0 font-mono">
      {/* ── Sidebar ── */}
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-dashed border-border bg-card">
        {/* Telegram toggle */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-dashed border-border">
          <span className="text-xs text-muted-foreground font-mono">
            Telegram
          </span>
          {canEnable ? (
            <button
              type="button"
              onClick={toggleEnabled}
              className={`text-xs px-2 py-1 rounded font-mono transition-colors ${
                isEnabled
                  ? "text-cyan-400 bg-cyan-400/10 hover:bg-cyan-400/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={
                isEnabled
                  ? isConnected
                    ? "Connected — click to disable"
                    : "Connecting..."
                  : "Click to enable Telegram bridge"
              }
              data-ocid="swarms.telegram.toggle"
            >
              {tgLoading
                ? "…"
                : isEnabled
                  ? isConnected
                    ? "on"
                    : "connecting"
                  : "off"}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="text-xs px-2 py-1 rounded font-mono text-muted-foreground/50 cursor-not-allowed"
              title="Admin must configure Telegram via terminal: /config telegram_token=<token> and /config telegram_chat_id=<chatId>"
              data-ocid="swarms.telegram.toggle"
            >
              off
            </button>
          )}
        </div>

        {/* Curation selector */}
        <div className="border-b border-dashed border-border px-2 py-2">
          <Select value={selectedCuration} onValueChange={setSelectedCuration}>
            <SelectTrigger
              className="h-7 w-full rounded-none border-dashed border-border bg-transparent font-mono text-[11px] text-muted-foreground focus:ring-0 focus:ring-offset-0 px-2"
              data-ocid="swarms.curation.select"
            >
              <SelectValue placeholder="all curations" />
            </SelectTrigger>
            <SelectContent className="font-mono text-xs">
              <SelectItem value="__all__" className="text-xs">
                all curations
              </SelectItem>
              {allCurationNames.map((name) => (
                <SelectItem key={name} value={name} className="text-xs">
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-2 py-2">
          {channelsLoading && (
            <p className="px-2 py-3 text-xs text-muted-foreground">loading…</p>
          )}
          {!channelsLoading && filteredGroups.length === 0 && !isEnabled && (
            <div
              className="flex flex-col items-center gap-2 px-3 py-8 text-center"
              data-ocid="swarms.channels.empty_state"
            >
              <MessageSquare className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground/60 leading-relaxed">
                publish a source graph to join channels
              </p>
            </div>
          )}
          {filteredGroups.map((group) => (
            <CurationGroup
              key={group.curationName}
              curationName={group.curationName}
              topChannel={group.topChannel}
              subChannels={group.subChannels}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))}

          {/* Telegram Channels */}
          {isEnabled && tgChannels.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs text-muted-foreground/60 font-mono border-t border-dashed border-border mt-2 pt-2">
                Telegram Channels
              </div>
              {tgChannels.map((tgCh) => (
                <button
                  key={tgCh.id}
                  type="button"
                  onClick={() => setSelectedId(tgCh.id)}
                  className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors hover:bg-accent/50 border-l-4 border-l-cyan-400/60 rounded-r ${
                    selectedId === tgCh.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  }`}
                  data-ocid={`swarms.telegram.channel.${tgCh.id}`}
                >
                  {tgCh.name}
                </button>
              ))}
            </>
          )}
        </ScrollArea>
      </aside>

      {/* ── Message Panel ── */}
      <div className="flex flex-1 min-w-0 flex-col bg-background">
        {/* Channel header */}
        <div className="flex items-center gap-2 border-b border-dashed border-border bg-card px-4 py-2.5">
          {activeChannelName ? (
            <>
              <span className="truncate text-sm font-semibold text-foreground">
                {activeChannelName}
              </span>
              {activeChannelParent && (
                <span className="ml-1 text-xs text-muted-foreground/50">
                  in {activeChannelParent}
                </span>
              )}
              {isTelegramChannel && (
                <span className="ml-1 text-xs text-cyan-400/70 font-mono">
                  · telegram
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground/60">
              chat · group channels
            </span>
          )}
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1 min-h-0 px-4 py-3">
          {!selectedId && (
            <div
              className="flex flex-col items-center justify-center gap-3 py-24 text-center"
              data-ocid="swarms.messages.empty_state"
            >
              <MessageSquare className="h-10 w-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground/40">
                select a channel to start chatting
              </p>
            </div>
          )}
          {selectedId && !isTelegramChannel && messagesLoading && (
            <p
              className="text-xs text-muted-foreground py-4"
              data-ocid="swarms.messages.loading_state"
            >
              loading messages…
            </p>
          )}
          {selectedId && displayMessages.length === 0 && !messagesLoading && (
            <div
              className="flex flex-col items-center gap-2 py-12 text-center"
              data-ocid="swarms.channel.empty_state"
            >
              <p className="text-xs text-muted-foreground/40">
                no messages yet — be the first to say something
              </p>
            </div>
          )}
          <div className="space-y-3">
            {displayMessages.map((msg, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: positional message rows
                key={i}
                className="group"
                data-ocid={`swarms.message.item.${i + 1}`}
              >
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-foreground">
                    {msg.senderName}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed break-words">
                  {msg.text}
                </p>
              </div>
            ))}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Message input */}
        {selectedId && (
          <div className="border-t border-dashed border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`message ${activeChannelName ?? "channel"}`}
                className="flex-1 font-mono text-xs bg-background border-border focus-visible:ring-1 rounded-none"
                disabled={!isTelegramChannel && sendMutation.isPending}
                data-ocid="swarms.message.input"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSend}
                disabled={
                  !inputText.trim() ||
                  (!isTelegramChannel && sendMutation.isPending)
                }
                className="shrink-0 border border-dashed border-border hover:bg-accent font-mono text-xs px-2.5"
                data-ocid="swarms.message.submit_button"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            {!isTelegramChannel && sendMutation.isError && (
              <p
                className="mt-1 text-[10px] text-destructive"
                data-ocid="swarms.message.error_state"
              >
                failed to send — try again
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
