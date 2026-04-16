import type { LawToken, Location, backendInterface } from "@/backend";
import { createActor } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";

interface LawTokenCardProps {
  lawToken: LawToken;
  locations?: Location[];
}

function useCreatorProfile(principal: string) {
  const { actor: _rawActor, isFetching } = useActor(createActor);
  const actor = _rawActor as backendInterface | null;

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
  return `${principal.slice(0, 5)}\u2026${principal.slice(-4)}`;
}

export default function LawTokenCard({
  lawToken,
  locations,
}: LawTokenCardProps) {
  const creatorPrincipal = lawToken.creator.toString();
  const { data: profile } = useCreatorProfile(creatorPrincipal);

  const displayName = profile?.name ?? shortenPrincipal(creatorPrincipal);
  const parentLocation = locations?.find(
    (l) => l.id === lawToken.parentLocationId,
  );

  const contentLabel = parentLocation
    ? `${parentLocation.title} · ${lawToken.tokenLabel}`
    : lawToken.tokenLabel;

  return (
    <Card className="border border-border bg-card shadow-none">
      <CardContent className="p-3 space-y-2">
        {/* Location title + token label */}
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
          {contentLabel}
        </p>

        {/* Custom attributes */}
        {lawToken.customAttributes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lawToken.customAttributes.map((attr) => (
              <Badge
                key={`${attr.key}-${attr.value}`}
                variant="secondary"
                className="text-xs"
              >
                {attr.key}: {attr.value}
              </Badge>
            ))}
          </div>
        )}

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
