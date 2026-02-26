import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { LawToken, InterpretationToken, CollectibleEdition } from '../backend';
import { Variant_lawToken_interpretationToken } from '../backend';
import { useGetCollectibleEditions, useMintCollectible, useGetMintSettings, useGetMyBuzzBalance } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

// Scale factor: all BUZZ values are stored as Int × 10^7
const BUZZ_SCALE = 10_000_000;

interface NFTDetailModalProps {
  token: LawToken | InterpretationToken | null;
  isOpen: boolean;
  onClose: () => void;
}

function isLawToken(token: LawToken | InterpretationToken): token is LawToken {
  return 'tokenLabel' in token;
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
        <span>Edition Status ({editions.length} of {totalCopies} minted)</span>
      </div>
      <div className="space-y-1.5">
        {editions.map((edition) => {
          const isOwner = edition.owner.toString() === currentPrincipal;
          return (
            <div
              key={edition.editionNumber.toString()}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                isOwner ? 'border-green-500/40 bg-green-500/5' : 'border-border bg-muted/20'
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
        {Array.from({ length: Math.max(0, totalCopies - editions.length) }, (_, i) => (
          <div
            key={`unminted-${i}`}
            className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-sm opacity-40"
          >
            <span className="font-medium">
              Copy #{(editions.length + i + 1)} of {totalCopies}
            </span>
            <span className="text-xs text-muted-foreground">Not yet minted</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NFTDetailModal({ token, isOpen, onClose }: NFTDetailModalProps) {
  const { identity } = useInternetIdentity();
  const currentPrincipal = identity?.getPrincipal().toString() ?? '';

  const { data: editions, isLoading: editionsLoading } = useGetCollectibleEditions(
    token?.id ?? null
  );
  const { data: mintSettings } = useGetMintSettings();
  const { data: buzzBalance } = useGetMyBuzzBalance();
  const mintCollectible = useMintCollectible();

  const [mintError, setMintError] = useState<string | null>(null);

  if (!token) return null;

  const isLaw = isLawToken(token);
  const coinImage = isLaw ? '/assets/law_nft.png' : '/assets/interpretation_nft.png';
  const tokenType = isLaw ? 'Law Token' : 'Interpretation Token';
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

  const alreadyOwned = editions?.some((e) => e.owner.toString() === currentPrincipal) ?? false;
  const editionLimitReached = (editions?.length ?? 0) >= totalCopies;
  const canMint = !alreadyOwned && !editionLimitReached && !hasInsufficientFunds;

  const handleMint = async () => {
    if (!token) return;
    setMintError(null);

    // Pre-flight balance check
    if (hasInsufficientFunds) {
      setMintError(`Insufficient BUZZ balance. You have ${displayBalance} BUZZ but need ${mintPrice} BUZZ to mint.`);
      return;
    }

    try {
      const result = await mintCollectible.mutateAsync({
        tokenId: token.id,
        tokenType: tokenTypeVariant,
      });

      if (result.__kind__ === 'success') {
        toast.success(
          `Minted Copy #${result.success.editionNumber.toString()} of ${totalCopies}! ${mintPrice} BUZZ deducted.`
        );
      } else if (result.__kind__ === 'insufficientFunds') {
        setMintError(`Insufficient BUZZ balance. You need ${mintPrice} BUZZ to mint this collectible.`);
      } else if (result.__kind__ === 'alreadyOwned') {
        setMintError('You already own a copy of this collectible.');
      } else if (result.__kind__ === 'editionLimitReached') {
        setMintError('All copies of this collectible have been minted.');
      } else if (result.__kind__ === 'tokenNotFound') {
        setMintError('Token not found. Please refresh and try again.');
      }
    } catch (error) {
      console.error('Mint error:', error);
      setMintError('An unexpected error occurred. Please try again.');
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
                  alreadyOwned ? 'opacity-100' : 'opacity-60 grayscale'
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
              <dt className="text-sm font-medium text-muted-foreground mb-1">Collectible ID</dt>
              <dd className="text-sm break-all">{token.id}</dd>
            </div>

            {isLaw ? (
              <>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Token Label</dt>
                  <dd className="text-sm">{(token as LawToken).tokenLabel}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Meaning</dt>
                  <dd className="text-sm">{(token as LawToken).meaning}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Parent Location ID</dt>
                  <dd className="text-sm break-all">{(token as LawToken).parentLocationId}</dd>
                </div>
              </>
            ) : (
              <>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Title</dt>
                  <dd className="text-sm">{(token as InterpretationToken).title}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Context</dt>
                  <dd className="text-sm whitespace-pre-wrap">{(token as InterpretationToken).context}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">From Token ID</dt>
                  <dd className="text-sm break-all">{(token as InterpretationToken).fromTokenId}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">From Relationship</dt>
                  <dd className="text-sm">
                    {(token as InterpretationToken).fromRelationshipType} ({(token as InterpretationToken).fromDirectionality})
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">To Node ID</dt>
                  <dd className="text-sm break-all">{(token as InterpretationToken).toNodeId}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">To Relationship</dt>
                  <dd className="text-sm">
                    {(token as InterpretationToken).toRelationshipType} ({(token as InterpretationToken).toDirectionality})
                  </dd>
                </div>

                {(token as InterpretationToken).customAttributes.length > 0 && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground mb-2">Custom Attributes</dt>
                    <dd className="space-y-2">
                      {(token as InterpretationToken).customAttributes.map((attr, index) => (
                        <div key={index} className="flex gap-2 text-sm">
                          <span className="font-medium">{attr.key}:</span>
                          <span>{attr.value}</span>
                        </div>
                      ))}
                    </dd>
                  </div>
                )}
              </>
            )}

            <div>
              <dt className="text-sm font-medium text-muted-foreground mb-1">Creator</dt>
              <dd className="text-sm break-all">{token.creator.toString()}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground mb-1">Created At</dt>
              <dd className="text-sm">
                {new Date(Number(token.timestamps.createdAt) / 1_000_000).toLocaleString()}
              </dd>
            </div>
          </div>

          <Separator />

          {/* Edition Status */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Edition Status</h4>
            {editionsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading editions...</span>
              </div>
            ) : (
              <EditionStatusSection
                editions={editions ?? []}
                totalCopies={totalCopies}
                currentPrincipal={currentPrincipal}
              />
            )}
          </div>

          <Separator />

          {/* Mint section */}
          <div className="space-y-3">
            {/* Insufficient funds warning */}
            {!alreadyOwned && !editionLimitReached && hasInsufficientFunds && (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Insufficient BUZZ. You have <strong>{displayBalance}</strong> BUZZ but need <strong>{mintPrice}</strong> BUZZ to mint.
                </span>
              </div>
            )}

            {/* Error message */}
            {mintError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{mintError}</span>
              </div>
            )}

            {/* Already owned message */}
            {alreadyOwned && (
              <div className="flex items-center gap-2 rounded-md border border-green-500/40 bg-green-500/5 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>You own a copy of this collectible.</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {alreadyOwned
                    ? 'Already Minted'
                    : editionLimitReached
                    ? 'Sold Out'
                    : `Mint Copy #${(editions?.length ?? 0) + 1} of ${totalCopies}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mintPrice} BUZZ per copy · {totalCopies} total {totalCopies === 1 ? 'copy' : 'copies'}
                </p>
                {!alreadyOwned && !editionLimitReached && (
                  <p className="text-xs text-muted-foreground">
                    Your balance: <span className={hasInsufficientFunds ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-foreground font-medium'}>{displayBalance} BUZZ</span>
                  </p>
                )}
              </div>

              <Button
                onClick={handleMint}
                disabled={!canMint || mintCollectible.isPending}
                variant={alreadyOwned || editionLimitReached || hasInsufficientFunds ? 'outline' : 'default'}
              >
                {mintCollectible.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Minting...
                  </>
                ) : alreadyOwned ? (
                  'Already Owned'
                ) : editionLimitReached ? (
                  'Sold Out'
                ) : hasInsufficientFunds ? (
                  'Insufficient BUZZ'
                ) : (
                  `Mint for ${mintPrice} BUZZ`
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
