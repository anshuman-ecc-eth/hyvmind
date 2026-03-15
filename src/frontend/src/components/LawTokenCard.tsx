import type { LawToken } from "@/backend";
import { Card, CardContent } from "@/components/ui/card";
import { useActor } from "@/hooks/useActor";
import { useQuery } from "@tanstack/react-query";

interface LawTokenCardProps {
  lawToken: LawToken;
}

function useCreatorProfile(principal: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["userProfile", principal],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getUserProfile(principal as any);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!principal,
  });
}

function formatTimestamp(time: bigint): string {
  // Backend stores nanoseconds
  const ms = Number(time / BigInt(1_000_000));
  const date = new Date(ms);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function shortenPrincipal(principal: string): string {
  if (principal.length <= 12) return principal;
  return `${principal.slice(0, 5)}…${principal.slice(-4)}`;
}

export default function LawTokenCard({ lawToken }: LawTokenCardProps) {
  const creatorPrincipal = lawToken.creator.toString();
  const { data: profile } = useCreatorProfile(creatorPrincipal);

  const displayName = profile?.name ?? shortenPrincipal(creatorPrincipal);

  return (
    <Card className="border border-border bg-card shadow-none">
      <CardContent className="p-3 space-y-2">
        {/* Content / meaning */}
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
          {lawToken.meaning || lawToken.tokenLabel}
        </p>

        {/* Footer: creator + timestamp */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <span className="text-xs text-muted-foreground font-medium">
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(lawToken.timestamps.createdAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
