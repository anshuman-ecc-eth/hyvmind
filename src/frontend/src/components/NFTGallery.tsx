import { Card } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import type { InterpretationToken, LawToken } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCollectibleEditions,
  useGetUserInterpretationTokens,
  useGetUserLawTokens,
} from "../hooks/useQueries";
import { getHiddenCollectibleIds } from "../utils/archivedCollectiblesStore";
import NFTDetailModal from "./NFTDetailModal";

// Sub-component to check if a token is minted by the current user
function MintedBadge({
  tokenId,
  currentPrincipal,
}: { tokenId: string; currentPrincipal: string }) {
  const { data: editions } = useGetCollectibleEditions(tokenId);
  const isMinted =
    editions?.some((e) => e.owner.toString() === currentPrincipal) ?? false;

  if (!isMinted) return null;

  return (
    <div className="absolute top-2 right-2">
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    </div>
  );
}

export default function NFTGallery() {
  const { data: lawTokens, isLoading: lawTokensLoading } =
    useGetUserLawTokens();
  const { data: interpretationTokens, isLoading: interpretationTokensLoading } =
    useGetUserInterpretationTokens();
  const { identity } = useInternetIdentity();

  const [selectedToken, setSelectedToken] = useState<
    LawToken | InterpretationToken | null
  >(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const currentPrincipal = identity?.getPrincipal().toString() ?? "";

  // Get hidden collectible IDs for the current user (archived node cleanup)
  const hiddenIds = currentPrincipal
    ? getHiddenCollectibleIds(currentPrincipal)
    : new Set<string>();

  const handleTokenClick = (token: LawToken | InterpretationToken) => {
    setSelectedToken(token);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedToken(null);
  };

  const isLoading = lawTokensLoading || interpretationTokensLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter out collectibles whose associated nodes have been archived
  const visibleLawTokens = (lawTokens ?? []).filter(
    (t) => !hiddenIds.has(t.id),
  );
  const visibleInterpretationTokens = (interpretationTokens ?? []).filter(
    (t) => !hiddenIds.has(t.id),
  );

  const totalTokens =
    visibleLawTokens.length + visibleInterpretationTokens.length;

  if (totalTokens === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No collectibles created yet.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create Law Tokens and Interpretation Tokens to see them here as
          collectibles.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Law Token Collectibles */}
        {visibleLawTokens.map((token) => (
          <Card
            key={token.id}
            className="cursor-pointer transition-all hover:shadow-lg relative"
            onClick={() => handleTokenClick(token)}
          >
            <MintedBadge
              tokenId={token.id}
              currentPrincipal={currentPrincipal}
            />
            <div className="p-4 space-y-3">
              {/* Silver coin image */}
              <div className="flex justify-center">
                <img
                  src="/assets/law_nft.png"
                  alt="Law Token Collectible"
                  className="w-24 h-24 object-contain"
                />
              </div>

              {/* Token type badge */}
              <div className="flex justify-center">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  Law Token
                </span>
              </div>

              {/* Token label */}
              <p
                className="text-sm font-medium text-center truncate"
                title={token.tokenLabel}
              >
                {token.tokenLabel}
              </p>

              {/* Creation date */}
              <p className="text-xs text-muted-foreground text-center">
                {new Date(
                  Number(token.timestamps.createdAt) / 1_000_000,
                ).toLocaleDateString()}
              </p>
            </div>
          </Card>
        ))}

        {/* Interpretation Token Collectibles */}
        {visibleInterpretationTokens.map((token) => (
          <Card
            key={token.id}
            className="cursor-pointer transition-all hover:shadow-lg relative"
            onClick={() => handleTokenClick(token)}
          >
            <MintedBadge
              tokenId={token.id}
              currentPrincipal={currentPrincipal}
            />
            <div className="p-4 space-y-3">
              {/* Gold coin image */}
              <div className="flex justify-center">
                <img
                  src="/assets/interpretation_nft.png"
                  alt="Interpretation Token Collectible"
                  className="w-24 h-24 object-contain"
                />
              </div>

              {/* Token type badge */}
              <div className="flex justify-center">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  Interpretation Token
                </span>
              </div>

              {/* Token title */}
              <p
                className="text-sm font-medium text-center truncate"
                title={token.title}
              >
                {token.title}
              </p>

              {/* Creation date */}
              <p className="text-xs text-muted-foreground text-center">
                {new Date(
                  Number(token.timestamps.createdAt) / 1_000_000,
                ).toLocaleDateString()}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Detail Modal */}
      <NFTDetailModal
        token={selectedToken}
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}
