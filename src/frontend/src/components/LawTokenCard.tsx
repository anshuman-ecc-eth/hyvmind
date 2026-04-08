import type {
  LawToken,
  Location,
  Sublocation,
  backendInterface,
} from "@/backend";
import { createActor } from "@/backend";
import CreateSublocationDialog from "@/components/CreateSublocationDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, MapPin, Plus } from "lucide-react";
import { useState } from "react";

interface LawTokenCardProps {
  lawToken: LawToken;
  locations?: Location[];
  sublocations?: Sublocation[];
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
  sublocations = [],
}: LawTokenCardProps) {
  const creatorPrincipal = lawToken.creator.toString();
  const { data: profile } = useCreatorProfile(creatorPrincipal);
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const [sublocExpanded, setSublocExpanded] = useState(false);
  const [addSublocationOpen, setAddSublocationOpen] = useState(false);

  const displayName = profile?.name ?? shortenPrincipal(creatorPrincipal);
  const parentLocation = locations?.find(
    (l) => l.id === lawToken.parentLocationId,
  );

  const contentLabel = parentLocation
    ? `${parentLocation.title} · ${lawToken.tokenLabel}`
    : lawToken.tokenLabel;

  const hasSublocs = sublocations.length > 0;

  return (
    <>
      <Card className="border border-border bg-card shadow-none">
        <CardContent className="p-3 space-y-2">
          {/* Location title + token label */}
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
            {contentLabel}
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

          {/* Sublocations section */}
          {(hasSublocs || isAuthenticated) && (
            <div className="pt-1 border-t border-border/50 space-y-1.5">
              {hasSublocs && (
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                  onClick={() => setSublocExpanded((v) => !v)}
                  data-ocid="law_token.subloc.toggle"
                >
                  {sublocExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <MapPin className="h-3 w-3" />
                  <span>
                    {sublocations.length} sublocation
                    {sublocations.length !== 1 ? "s" : ""}
                  </span>
                </button>
              )}

              {sublocExpanded && hasSublocs && (
                <div className="space-y-1.5 pl-2">
                  {sublocations.map((sl) => (
                    <div
                      key={sl.id}
                      className="rounded-sm border border-border/60 bg-muted/40 px-2.5 py-1.5"
                    >
                      <p className="text-xs font-medium text-foreground">
                        {sl.title}
                      </p>
                      {sl.content && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {sl.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isAuthenticated && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => setAddSublocationOpen(true)}
                  data-ocid="law_token.add_sublocation.button"
                >
                  <Plus className="h-3 w-3" />
                  Add Sublocation
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateSublocationDialog
        open={addSublocationOpen}
        onOpenChange={setAddSublocationOpen}
        parentLawTokenId={lawToken.id}
      />
    </>
  );
}
