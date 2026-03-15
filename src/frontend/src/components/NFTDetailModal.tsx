import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Loader2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type {
  CollectibleEdition,
  InterpretationToken,
  LawToken,
} from "../backend";
import { Variant_lawToken_interpretationToken } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCollectibleEditions,
  useGetMintSettings,
  useGetMyBuzzBalance,
  useMintCollectible,
} from "../hooks/useQueries";

// Scale factor: all BUZZ values are stored as Int × 10^7
const BUZZ_SCALE = 10_000_000;

interface NFTDetailModalProps {
  token: LawToken | InterpretationToken | null;
  isOpen: boolean;
  onClose: () => void;
}

function isLawToken(token: LawToken | InterpretationToken): token is LawToken {
  return "tokenLabel" in token;
}

function EditionStatusSection({
  editions,
  totalCopies,
  currentPrincipal,
}: {
  editions: CollectibleEdition[];
  totalCopies: number;
  currentPrincipal: string;
}) {
  if (editions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No editions minted yet. Be the first to mint Copy #1!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>
          Edition Status ({editions.length} of {totalCopies} minted)
        </span>
      </div>
      <div className="space-y-1.5">
        {editions.map((edition) => {
          const isOwner = edition.owner.toString() === currentPrincipal;
          return (
            <div
              key={edition.editionNumber.toString()}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                isOwner
                  ? "border-green-500/40 bg-green-500/5"
                  : "border-border bg-muted/20"
              }`}
            >
              <span className="font-medium">
                Copy #{edition.editionNumber.toString()} of {totalCopies}
              </span>
              <div className="flex items-center gap-2">
                {isOwner && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    You
                  </span>
                )}
                <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                  {edition.owner.toString().slice(0, 8)}…
                </span>
              </div>
            </div>
          );
        })}
        {/* Show remaining unminted slots */}
        {Array.from(
          { length: Math.max(0, totalCopies - editions.length) },
          (_, i) => (
            <div
              key={`unminted-copy-${editions.length + i + 1}`}
              className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-sm opacity-40"
            >
              <span className="font-medium">
                Copy #{editions.length + i + 1} of {totalCopies}
              </span>
              <span className="text-xs text-muted-foreground">
                Not yet minted
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export default function NFTDetailModal({
  token,
  isOpen,
  onClose,
}: NFTDetailModalProps) {
  const { identity } = useInternetIdentity();
  const currentPrincipal = identity?.getPrincipal().toString() ?? "";

  // Pass empty string when token is null — the query is disabled when tokenId is falsy
  const { data: editions, isLoading: editionsLoading } =
    useGetCollectibleEditions(token?.id ?? "");
  const { data: mintSettings } = useGetMintSettings();
  const { data: buzzBalance } = useGetMyBuzzBalance();
  const mintCollectible = useMintCollectible();

  const [mintError, setMintError] = useState<string | null>(null);

  if (!token) return null;

  const isLaw = isLawToken(token);
  const coinImage = isLaw
    ? "/assets/law_nft.png"
    : "/assets/interpretation_nft.png";
  const tokenType = isLaw ? "Law Token" : "Interpretation Token";
  const tokenTypeVariant = isLaw
    ? Variant_lawToken_interpretationToken.lawToken
    : Variant_lawToken_interpretationToken.interpretationToken;

  const totalCopies = Number(mintSettings?.numCopies ?? 1);

  // Compute price in human-readable BUZZ: base / numCopies
  const basePrice = isLaw ? 3 : 5;
  const mintPrice = (basePrice / totalCopies).toFixed(7);

  // Compute scaled price for balance comparison (same scale as backend: × 10^7)
  const scaledPrice = Math.floor((basePrice / totalCopies) * BUZZ_SCALE);
  const currentBalance = buzzBalance !== undefined ? Number(buzzBalance) : 0;
  const hasInsufficientFunds = currentBalance < scaledPrice;

  // Human-readable balance for display
  const displayBalance = (currentBalance / BUZZ_SCALE).toFixed(7);

  const alreadyOwned =
    editions?.some((e) => e.owner.toString() === currentPrincipal) ?? false;
  const editionLimitReached = (editions?.length ?? 0) >= totalCopies;
  const canMint =
    !alreadyOwned && !editionLimitReached && !hasInsufficientFunds;

  const handleMint = async () => {
    if (!token) return;
    setMintError(null);

    // Pre-flight balance check
    if (hasInsufficientFunds) {
      setMintError(
        `Insufficient BUZZ balance. You have ${displayBalance} BUZZ but need ${mintPrice} BUZZ to mint.`,
      );
      return;
    }

    try {
      const result = await mintCollectible.mutateAsync({
        tokenId: token.id,
        tokenType: tokenTypeVariant,
      });

      if (result.__kind__ === "success") {
        toast.success(
          `Minted Copy #${result.success.editionNumber.toString()} of ${totalCopies}! ${mintPrice} BUZZ deducted.`,
        );
      } else if (result.__kind__ === "insufficientFunds") {
        setMintError(
          `Insufficient BUZZ balance. You need ${mintPrice} BUZZ to mint this collectible.`,
        );
      } else if (result.__kind__ === "alreadyOwned") {
        setMintError("You already own a copy of this collectible.");
      } else if (result.__kind__ === "editionLimitReached") {
        setMintError("All copies of this collectible have been minted.");
      } else if (result.__kind__ === "tokenNotFound") {
        setMintError("Token not found. Please refresh and try again.");
      }
    } catch (error) {
      console.error("Mint error:", error);
      setMintError("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Collectible Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Coin image */}
          <div className="flex justify-center">
            <div className="relative">
              <img
                src={coinImage}
                alt={`${tokenType} Collectible`}
                className={`w-32 h-32 object-contain transition-all ${
                  alreadyOwned ? "opacity-100" : "opacity-60 grayscale"
                }`}
              />
              {alreadyOwned && (
                <div className="absolute -top-1 -right-1">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
              )}
            </div>
          </div>

          {/* Token type */}
          <div className="flex justify-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-muted text-muted-foreground">
              {tokenType}
            </span>
          </div>

          <Separator />

          {/* Token details */}
          <div className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground mb-1">
                Collectible ID
              </dt>
              <dd className="text-sm break-all">{token.id}</dd>
            </div>

            {isLaw ? (
              <>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">
                    Token Label
                  </dt>
                  <dd className="text-sm">{(token as LawToken).tokenLabel}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">
                    Location · Label
                  </dt>
                  <dd className="text-sm">{(token as LawToken).tokenLabel}</dd>
                </div>
              </>
            ) : (
              <>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">
                    Title
                  </dt>
                  <dd className="text-sm">
                    {(token as InterpretationToken).title}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">
                    Context
                  </dt>
                  <dd className="text-sm">
                    {(token as InterpretationToken).context}
                  </dd>
                </div>
              </>
            )}

            <div>
              <dt className="text-sm font-medium text-muted-foreground mb-1">
                Created
              </dt>
              <dd className="text-sm">
                {new Date(
                  Number(token.timestamps.createdAt) / 1_000_000,
                ).toLocaleDateString()}
              </dd>
            </div>
          </div>

          <Separator />

          {/* Edition Status */}
          {editionsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading edition status...
            </div>
          ) : (
            <EditionStatusSection
              editions={editions ?? []}
              totalCopies={totalCopies}
              currentPrincipal={currentPrincipal}
            />
          )}

          <Separator />

          {/* Mint Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Mint Price</p>
                <p className="text-xs text-muted-foreground">
                  {mintPrice} BUZZ per copy
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Your Balance</p>
                <p className="text-xs text-muted-foreground">
                  {displayBalance} BUZZ
                </p>
              </div>
            </div>

            {hasInsufficientFunds && !alreadyOwned && !editionLimitReached && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Insufficient BUZZ. You have {displayBalance} BUZZ but need{" "}
                  {mintPrice} BUZZ.
                </span>
              </div>
            )}

            {mintError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{mintError}</span>
              </div>
            )}

            <Button
              onClick={handleMint}
              disabled={!canMint || mintCollectible.isPending}
              className="w-full"
            >
              {mintCollectible.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Minting...
                </>
              ) : alreadyOwned ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Already Owned
                </>
              ) : editionLimitReached ? (
                "Sold Out"
              ) : (
                `Mint for ${mintPrice} BUZZ`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
